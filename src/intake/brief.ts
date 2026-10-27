// Turns untrusted source text into source-tagged facts, and builds the pre-call brief (PRD section 4).

import { allTemplates, industryById, type OpportunityTemplate } from '../knowledge/industries';
import type { Brief, BusinessCase, Fact, Source } from '../types';
import { detectInjection, splitSentences } from './sanitize';

const CATEGORY_CUES: [Fact['category'], RegExp][] = [
  ['system', /מערכת|אקסל|crm|erp|פריוריטי|חשבשבת|וואטסאפ|ווטסאפ|יומן|אתר/i],
  ['process', /תהליך|מקבלים|שולחים|מכינים|מטפל|הזמנ|הצע|משלוח|תור|ייצור|התקנה/],
  ['product', /מוצר|שירות|קטלוג|מחיר|דגם|פרויקט/],
  ['customer', /לקוח|מטופל|מסעד|דייר/],
  ['goal', /מטרה|רוצים|לגדול|לשפר|יעד/],
  ['profile', /אנחנו|ותיק|שנים|עובדים|הוקם|מתמחה/],
];

export function categorize(text: string): Fact['category'] {
  return CATEGORY_CUES.find(([, re]) => re.test(text))?.[0] ?? 'other';
}

/** Splits text into facts that all point back to their source. Instruction-like sentences are flagged, not obeyed. */
export function textToFacts(text: string, sourceId: string, idPrefix: string): Fact[] {
  return splitSentences(text)
    .slice(0, 80)
    .map((s, i) => {
      const flagged = detectInjection(s);
      return {
        id: `${idPrefix}-${i}`,
        text: s.slice(0, 400),
        sourceId,
        category: flagged ? 'other' : categorize(s),
        ...(flagged ? { flagged: 'נראה כמו הוראה לסוכן — נשמר כמידע בלבד ולא יבוצע' } : {}),
      };
    });
}

/** All text the agent may reason over, excluding flagged facts. */
export function caseCorpus(c: BusinessCase): string {
  return [
    c.description,
    ...c.goals,
    ...c.systems,
    ...c.facts.filter((f) => !f.flagged).map((f) => f.text),
    ...c.processes.flatMap((p) => [p.name, ...p.steps, ...p.people, ...p.systems, ...p.decisionPoints]),
  ].join(' ');
}

export function triggerHits(t: OpportunityTemplate, corpus: string): number {
  return t.triggers.filter((w) => corpus.includes(w)).length;
}

function sourceFor(c: BusinessCase, t: OpportunityTemplate): string[] {
  return [...new Set(c.facts.filter((f) => !f.flagged && t.triggers.some((w) => f.text.includes(w))).map((f) => f.sourceId))];
}

export function buildBrief(c: BusinessCase): Brief {
  const ind = industryById(c.industry);
  const corpus = caseCorpus(c);
  const label = (s: Source) => s.label;
  const clean = c.facts.filter((f) => !f.flagged);

  const own = ind.templates.map((t) => ({ t, hits: triggerHits(t, corpus) + 1 }));
  const cross = allTemplates()
    .filter((t) => !ind.templates.includes(t))
    .map((t) => ({ t, hits: triggerHits(t, corpus) }))
    .filter((x) => x.hits > 0);
  const ranked = [...own, ...cross].sort((a, b) => b.hits - a.hits).slice(0, 8);

  const hypotheses = ranked.map(({ t, hits }) => {
    const sourceIds = sourceFor(c, t);
    return {
      templateId: t.id,
      name: t.name,
      why:
        sourceIds.length > 0
          ? `נמצאו רמזים בחומרים (${hits} מילות מפתח). השערה לבדיקה בשיחה.`
          : 'השערה כללית לענף — אין עדיין ראיה מהחומרים, דורשת אימות.',
      sourceIds,
    };
  });

  const gaps: string[] = [];
  if (!c.processes.length && !clean.some((f) => f.category === 'process')) gaps.push('לא תועד אף תהליך עבודה — זה יהיה מוקד השיחה.');
  if (!c.processes.some((p) => p.volumePerMonth)) gaps.push('אין נתוני נפח (כמה פעמים בחודש).');
  if (!c.processes.some((p) => p.minutesPerAction)) gaps.push('אין נתוני זמן לפעולה.');
  if (!c.systems.length && !clean.some((f) => f.category === 'system')) gaps.push('לא ידוע באילו מערכות העסק משתמש.');
  if (!c.goals.length) gaps.push('לא הוגדרו מטרות עסקיות.');
  if (!c.sources.length) gaps.push('לא צורפו מקורות (אתר / מסמכים).');
  gaps.push('אין עלות שעת עבודה — נדרש לשאול לפני חישוב ערך.');

  const questions = ind.questions.slice(0, 6).map((q) => q.text);

  return {
    createdAt: new Date().toISOString(),
    profile: [
      `${c.name} — ${ind.name}${c.size ? `, ${c.size}` : ''}.`,
      c.description || 'אין תיאור עסק.',
      ...clean.filter((f) => f.category === 'profile' || f.category === 'product').slice(0, 4).map((f) => `${f.text} [${label(c.sources.find((s) => s.id === f.sourceId) || ({ label: '?' } as Source))}]`),
    ],
    valueChain: ind.typicalProcesses.map((p) => `${p.name}: ${p.steps.join(' ← ')}`),
    processes: [
      ...c.processes.map((p) => `${p.name}${p.steps.length ? ': ' + p.steps.join(' ← ') : ''}${p.people.length ? ` (מבצעים: ${p.people.join(', ')})` : ''}`),
      ...clean.filter((f) => f.category === 'process').slice(0, 5).map((f) => f.text),
    ],
    hypotheses,
    questions,
    gaps,
    flaggedContent: c.facts.filter((f) => f.flagged).map((f) => f.text),
  };
}

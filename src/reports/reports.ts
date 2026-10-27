// Report data builders (PRD section 12). Everything is derived from the case, conversation and simulator,
// so the report always matches what was said and calculated.

import { buildBrief } from '../intake/brief';
import { confidence, riskGate, topThree, weightedScore } from '../engine/ranking';
import { computeAll, INPUT_LABELS } from '../engine/roi';
import { industryById } from '../knowledge/industries';
import type { Assessment, BusinessCase, RoiInputs } from '../types';

export function clientReport(c: BusinessCase, a: Assessment) {
  const brief = c.brief ?? buildBrief(c);
  const top = topThree(a.opportunities);
  const first = top.find((r) => r.opp.status === 'interested') ?? top[0];
  return {
    profile: brief.profile.slice(0, 3),
    options: top,
    firstStep: first
      ? `לבדוק יחד עם בארי ורפי את ההיתכנות של "${first.opp.name}" על דוגמאות אמיתיות מהעסק, לפני כל החלטה.`
      : 'לא נמצאה עדיין הזדמנות עם בסיס מספיק. הצעד הבא הוא שיחה קצרה נוספת להבנת תהליך אחד לעומק.',
    assumptions: openAssumptions(a),
    fewerThanThree: top.length < 3,
  };
}

export function openAssumptions(a: Assessment): string[] {
  const out: string[] = [];
  for (const s of a.scenarios) {
    const opp = a.opportunities.find((o) => o.id === s.opportunityId);
    (Object.keys(s.inputs) as (keyof RoiInputs)[]).forEach((k) => {
      if (s.inputs[k] !== undefined) out.push(`${opp?.name ?? ''}: ${INPUT_LABELS[k]} — ${s.inputSources[k] ?? 'ללא מקור'} (לא אומת)`);
    });
    const missing = computeAll(s.inputs)[1].result.missing;
    if (missing.length) out.push(`${opp?.name ?? ''}: חסרים ${missing.map((k) => INPUT_LABELS[k]).join(', ')}`);
  }
  out.push('ציוני הדירוג הם הערכה ראשונית לפי הענף ודורשים אימות אנושי וטכני.');
  return out;
}

/** Barry's detailed work file: sources, transcript (with consent), structured data, scores, risks, gaps, next steps. */
export function barryFile(c: BusinessCase, a: Assessment) {
  const brief = c.brief ?? buildBrief(c);
  return {
    generatedAt: new Date().toISOString(),
    business: { id: c.id, name: c.name, industry: industryById(c.industry).name, size: c.size, description: c.description, systems: c.systems, goals: c.goals },
    consent: c.consent,
    sources: c.sources.map((s) => ({ ...s, facts: c.facts.filter((f) => f.sourceId === s.id).length, flagged: c.facts.filter((f) => f.sourceId === s.id && f.flagged).map((f) => f.text) })),
    assessment: { id: a.id, status: a.status, startedAt: a.startedAt, engine: a.mode ?? 'rule', stage: a.flow.stage },
    transcript: c.consent.transcript ? a.turns.map((t) => ({ role: t.role, text: t.text, action: t.action, at: t.at })) : 'אין הסכמה לתמלול — התמליל לא נשמר בקובץ',
    processes: a.processes,
    opportunities: a.opportunities.map((o) => ({
      name: o.name,
      status: o.status,
      score: weightedScore(o.scores),
      subScores: o.scores,
      gate: riskGate(o.risks),
      risks: o.risks,
      confidence: confidence(o),
      evidence: o.evidence,
      kpi: o.kpi,
    })),
    topThree: topThree(a.opportunities).map((r) => r.opp.name),
    scenarios: a.scenarios.map((s) => ({ opportunityId: s.opportunityId, inputs: s.inputs, sources: s.inputSources, results: computeAll(s.inputs) })),
    gaps: brief.gaps,
    openAssumptions: openAssumptions(a),
    nextSteps: ['בארי: אימות הדוח מול בעל העסק וניהול המעקב', 'רפי: בדיקת היתכנות טכנית ואינטגרציות לפי הרשאה', 'רעות: תנאים מסחריים — רק אחרי אימות'],
  };
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

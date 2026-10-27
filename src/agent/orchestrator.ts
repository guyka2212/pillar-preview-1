// Conversation orchestrator: the deterministic core of the agent.
// It absorbs each owner turn (signals, gaps, numbers, evidence), advances the section 6 flow,
// and plans exactly ONE action with a ready-to-say Hebrew line. The LLM may only rephrase that plan;
// validateReply() rejects anything that breaks the rules and falls back to the planned line.

import { buildBrief } from '../intake/brief';
import { detectInjection } from '../intake/sanitize';
import { advance, allowedActions, canProposeIdea, GENERIC_QUESTIONS, ideaIsHypothesisOnly, initialFlow, nextGap, STAGE_GAPS } from '../knowledge/flow';
import { allTemplates, industryById, templateById, type OpportunityTemplate } from '../knowledge/industries';
import { violatesPersona, type PromptContext } from '../knowledge/persona';
import { riskGate, weightedScore } from '../engine/ranking';
import type { AgentAction, Assessment, BusinessCase, Gap, Opportunity, RoiInputs, Scenario } from '../types';
import { correctionFactor, filledGaps, parseNumbers, readSignals, reflectText, type Signals } from './extraction';

export interface Plan {
  action: AgentAction;
  say: string;
  allowed: AgentAction[];
  ctx: PromptContext;
  proposalTemplateId?: string;
}

const nowIso = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 10);

function oppFromTemplate(t: OpportunityTemplate): Opportunity {
  return {
    id: t.id,
    templateId: t.id,
    name: t.name,
    problem: t.problem,
    today: t.today,
    after: t.after,
    humanRole: t.humanRole,
    agentRole: t.agentRole,
    needs: t.needs,
    kpi: t.kpi,
    capabilityIds: t.capabilityIds,
    scores: { ...t.scores },
    risks: { ...t.risks },
    evidence: [],
    assumptions: ['ציוני הדירוג הם הערכה ראשונית של Pillar לפי הענף, לפני בדיקה טכנית.'],
    status: 'hypothesis',
    complexity: t.complexity,
  };
}

export function startAssessment(c: BusinessCase): Assessment {
  const brief = c.brief ?? buildBrief(c);
  const ind = industryById(c.industry);
  const opps = new Map<string, Opportunity>();
  for (const t of ind.templates) opps.set(t.id, oppFromTemplate(t));
  for (const h of brief.hypotheses) {
    const t = templateById(h.templateId);
    if (!t) continue;
    const o = opps.get(t.id) ?? oppFromTemplate(t);
    for (const sid of h.sourceIds) o.evidence.push(`חומרי הכנה: ${c.sources.find((s) => s.id === sid)?.label ?? sid}`);
    opps.set(t.id, o);
  }
  const a: Assessment = {
    id: id(),
    caseId: c.id,
    status: 'active',
    startedAt: nowIso(),
    stage: 'opening',
    turns: [],
    filledGaps: [],
    processes: [],
    opportunities: [...opps.values()],
    scenarios: [],
    rejectedTemplates: [],
    flow: initialFlow(),
  };
  refresh(a);
  return a;
}

const convHits = (o: Opportunity) => o.evidence.filter((e) => e.startsWith('שיחה')).length;

function refresh(a: Assessment) {
  const live = a.opportunities.filter((o) => o.status === 'hypothesis' && o.evidence.length > 0 && riskGate(o.risks).status !== 'blocked');
  a.flow.candidateCount = live.length;
  a.flow.proposedCount = a.opportunities.filter((o) => o.status !== 'hypothesis').length;
  a.flow.interestedCount = a.opportunities.filter((o) => o.status === 'interested').length;
  a.stage = a.flow.stage;
  a.filledGaps = a.flow.filledGaps;
}

function nextProposal(a: Assessment): Opportunity | undefined {
  return a.opportunities
    .filter((o) => o.status === 'hypothesis' && o.evidence.length > 0 && riskGate(o.risks).status !== 'blocked')
    .sort((x, y) => convHits(y) - convHits(x) || weightedScore(y.scores) - weightedScore(x.scores))[0];
}

function addEvidence(c: BusinessCase, a: Assessment, text: string) {
  const own = new Set(industryById(c.industry).templates.map((t) => t.id));
  const snippet = text.length > 80 ? text.slice(0, 80) + '…' : text;
  for (const t of allTemplates()) {
    if (a.rejectedTemplates.includes(t.id)) continue;
    const hits = t.triggers.filter((w) => text.includes(w)).length;
    if (hits === 0 || (!own.has(t.id) && hits < 2)) continue;
    let o = a.opportunities.find((x) => x.templateId === t.id);
    if (!o) {
      o = oppFromTemplate(t);
      a.opportunities.push(o);
    }
    if (o.evidence.length < 6) o.evidence.push(`שיחה: "${snippet}"`);
  }
}

function currentScenario(a: Assessment): Scenario | undefined {
  const interested = [...a.opportunities].reverse().find((o) => o.status === 'interested');
  if (!interested) return undefined;
  let s = a.scenarios.find((x) => x.opportunityId === interested.id);
  if (!s) {
    s = { opportunityId: interested.id, inputs: {}, inputSources: {} };
    a.scenarios.push(s);
  }
  return s;
}

/** Applies parsed numbers to the active scenario. Returns a description of what changed, or null. */
function absorbNumbers(a: Assessment, text: string): string | null {
  const s = currentScenario(a);
  const parsed = parseNumbers(text);
  const factor = correctionFactor(text);
  if (!s) {
    // Numbers before interest are remembered as process facts, not ROI inputs.
    if (parsed.actionsPerMonth || parsed.minutesPerAction) {
      const p = a.processes[a.processes.length - 1];
      if (p) {
        p.volumePerMonth = parsed.actionsPerMonth ?? p.volumePerMonth;
        p.minutesPerAction = parsed.minutesPerAction ?? p.minutesPerAction;
      }
    }
    return null;
  }
  const changes: string[] = [];
  (Object.keys(parsed) as (keyof RoiInputs)[]).forEach((k) => {
    s.inputs[k] = parsed[k];
    s.inputSources[k] = 'בעל העסק בשיחה';
  });
  if (parsed.actionsPerMonth !== undefined) changes.push(`${parsed.actionsPerMonth} פעולות בחודש`);
  if (parsed.minutesPerAction !== undefined) changes.push(`${parsed.minutesPerAction} דקות לפעולה`);
  if (parsed.hourlyCost !== undefined) changes.push(`${parsed.hourlyCost} ₪ לשעה`);
  if (parsed.savingsRate !== undefined) changes.push(`הנחת חיסכון של ${Math.round(parsed.savingsRate * 100)}%`);
  if (factor && changes.length === 0 && s.inputs.actionsPerMonth !== undefined) {
    const before = s.inputs.actionsPerMonth;
    s.inputs.actionsPerMonth = Math.round(before * factor);
    s.inputSources.actionsPerMonth = 'בעל העסק תיקן בשיחה';
    changes.push(`${s.inputs.actionsPerMonth} פעולות בחודש במקום ${before}`);
  }
  if (changes.length === 0) return null;
  return changes.join(', ');
}

function recordProcess(a: Assessment, text: string, gaps: Gap[]) {
  if (!gaps.includes('workflow') && !gaps.includes('people') && !gaps.includes('systems')) return;
  let p = a.processes[0];
  if (!p) {
    p = { id: id(), name: 'תהליך שתואר בשיחה', steps: [], people: [], systems: [], decisionPoints: [], sourceIds: ['conversation'] };
    a.processes.push(p);
  }
  if (gaps.includes('workflow')) p.steps.push(text);
  if (gaps.includes('people')) p.people.push(text);
  if (gaps.includes('systems')) p.systems.push(text);
  if (gaps.includes('decisions')) p.decisionPoints.push(text);
}

const askedBefore = (a: Assessment, q: string) => a.turns.some((t) => t.role === 'agent' && t.text.includes(q));

/** Picks the question that closes the highest-impact open gap, never repeating one already asked. */
function questionForNextGap(c: BusinessCase, a: Assessment): string | undefined {
  const ind = industryById(c.industry);
  const order: Gap[] = [...(STAGE_GAPS[a.flow.stage] ?? []), 'workflow', 'people', 'systems', 'decisions', 'exceptions', 'desired', 'mustNotHarm'];
  const gap = nextGap(a.flow);
  const candidates = gap ? [gap, ...order] : order;
  for (const g of candidates) {
    if (a.flow.filledGaps.includes(g)) continue;
    const q = [...ind.questions.filter((x) => x.gap === g).map((x) => x.text), GENERIC_QUESTIONS[g]].find((x) => !askedBefore(a, x));
    if (q) return q;
  }
  return undefined;
}

function preface(a: Assessment, ownerText: string, sig: Signals): string {
  if (a.impatient || sig.injection || ownerText.length < 30) return '';
  const lastAgent = [...a.turns].reverse().find((t) => t.role === 'agent');
  if (lastAgent && /^(כלומר|אם הבנתי נכון)/.test(lastAgent.text)) return '';
  const lead = a.turns.length % 2 ? 'כלומר, ' : 'אם הבנתי נכון, ';
  return `${lead}${reflectText(ownerText)}. `;
}

function pitchText(o: Opportunity, hypothesisOnly: boolean, lead = ''): string {
  const t = templateById(o.templateId);
  let pitch = t?.pitch ?? `אולי כדאי לבדוק את הכיוון של ${o.name}.`;
  if (!pitch.includes('?')) pitch += ' מה דעתך?';
  return `${lead}${hypothesisOnly ? 'זו השערה בלבד, עוד לא בדוקה: ' : ''}${pitch}`;
}

function closingText(a: Assessment): string {
  const discussed = a.opportunities.filter((o) => o.status === 'interested' || o.status === 'discussed');
  const parts = [`לסיכום: למדתי איך חלק מהעבודה אצלכם מתנהלת${a.processes.length ? ', במיוחד ' + a.processes[0].name : ''}.`];
  if (discussed.length) parts.push(`הכיוונים שעלו: ${discussed.map((o) => o.name).join('; ')}.`);
  if (discussed.length < 3) parts.push('לא מצאנו שלושה כיוונים עם בסיס מספיק, ואני לא רוצה להמציא.');
  if (a.scenarios.length) parts.push('המספרים בסימולטור מבוססים על ההנחות שלך ועדיין לא אומתו.');
  parts.push('אכין דוח קצר ותיק מסודר לבארי. אם תרצה, בארי יכול לחזור אליך לשיחת המשך, בלי שום התחייבות.');
  return parts.join(' ');
}

function openingText(c: BusinessCase): string {
  const clean = c.facts.filter((f) => !f.flagged);
  const fact = clean.find((f) => f.category === 'profile' || f.category === 'product' || f.category === 'process') ?? clean[0];
  const learned = fact ? `לפני השיחה עברתי על החומרים, וקראתי ש${fact.text.replace(/^אנחנו\s*/, 'אתם ').replace(/[.!]$/, '')}.` : 'לא היה לי הרבה מידע מראש, אז אשמח ללמוד ממך.';
  return `שלום, אני הסוכן של Pillar. ${learned} חשוב לי לומר: אני לא כאן כדי למכור כלי, אלא כדי לבדוק יחד אם יש שלוש הזדמנויות שבאמת שוות משהו לעסק. התמונה הראשונית שלי נכונה?`;
}

function ctxFor(c: BusinessCase, a: Assessment, plan: Omit<Plan, 'ctx'>): PromptContext {
  const brief = c.brief ?? buildBrief(c);
  const proposal = plan.proposalTemplateId ? templateById(plan.proposalTemplateId) : undefined;
  return {
    stage: a.flow.stage,
    allowed: plan.allowed,
    briefLines: [...brief.profile.slice(0, 3), ...a.processes.flatMap((p) => p.steps).slice(-2)],
    knownFacts: a.turns.filter((t) => t.role === 'owner' && !detectInjection(t.text)).slice(-3).map((t) => `בעל העסק: ${t.text}`),
    openGap: nextGap(a.flow),
    suggestedQuestion: plan.say,
    candidateIdea: proposal?.pitch,
    rejected: a.rejectedTemplates.map((tid) => templateById(tid)?.name ?? tid),
  };
}

function finish(c: BusinessCase, a: Assessment, p: Omit<Plan, 'ctx' | 'allowed'>): Plan {
  const allowed = allowedActions(a.flow);
  const action = allowed.includes(p.action) ? p.action : allowed[0];
  const base = { ...p, action, allowed };
  return { ...base, ctx: ctxFor(c, a, base) };
}

export function planOpening(c: BusinessCase, a: Assessment): Plan {
  return finish(c, a, { action: 'ask', say: openingText(c) });
}

type Mode = 'normal' | 'clarify' | 'redirect';

export function absorbOwnerTurn(c: BusinessCase, a: Assessment, text: string): Plan {
  const sig = readSignals(text);
  a.turns.push({ role: 'owner', text, at: nowIso() });
  a.flow = { ...a.flow, ownerTurns: a.flow.ownerTurns + 1, turnsInStage: a.flow.turnsInStage + 1, justRejected: false, newInterest: false };
  a.impatient = a.impatient || sig.impatience;

  let numbers: string | null = null;
  if (!sig.injection) {
    const gaps = filledGaps(text);
    a.flow.filledGaps = [...new Set([...a.flow.filledGaps, ...gaps])];
    recordProcess(a, text, gaps);
    addEvidence(c, a, text);
  }

  // Reaction to the last proposed idea.
  let mode: Mode = 'normal';
  const proposed = a.lastProposed ? a.opportunities.find((o) => o.templateId === a.lastProposed) : undefined;
  if (proposed) {
    const shortYes = sig.confirm && text.trim().length < 15;
    if ((sig.interest || shortYes) && !sig.rejection) {
      proposed.status = 'interested';
      proposed.evidence.push('בעל העסק הביע עניין בשיחה');
      a.lastProposed = undefined;
      a.clarifyingRejection = false;
      a.flow.newInterest = true;
    } else if (a.clarifyingRejection) {
      proposed.status = 'rejected';
      a.rejectedTemplates.push(proposed.templateId);
      a.lastProposed = undefined;
      a.clarifyingRejection = false;
      a.flow.justRejected = true;
      mode = 'redirect';
    } else if (sig.rejection) {
      a.clarifyingRejection = true;
      mode = 'clarify';
    } else {
      // Neutral reply: reflect once, then let the idea rest as "discussed" and move on.
      proposed.status = 'discussed';
      const lastAgent = [...a.turns].reverse().find((t) => t.role === 'agent');
      if (lastAgent?.action === 'reflect') a.lastProposed = undefined;
    }
  }
  if (!sig.injection) numbers = absorbNumbers(a, text);
  a.flow.ownerWantsToClose = sig.close;
  refresh(a);
  a.flow = advance(a.flow);
  refresh(a);
  return planTurn(c, a, text, sig, mode, numbers);
}

function planTurn(c: BusinessCase, a: Assessment, text: string, sig: Signals, mode: Mode, numbers: string | null): Plan {
  const q = () => questionForNextGap(c, a) ?? 'מה עוד חשוב שאבין על איך העבודה מתנהלת אצלכם?';
  const stage = a.flow.stage;

  if (stage === 'closing') {
    a.status = 'closed';
    return finish(c, a, { action: 'summarize', say: closingText(a) });
  }
  if (sig.injection) {
    return finish(c, a, { action: 'ask', say: `אני ממשיך לעבוד לפי אותם כללים: אני כאן כדי להבין את העסק, לא כדי למכור. ${q()}` });
  }
  if (sig.professionalAdvice) {
    return finish(c, a, { action: 'ask', say: `זו שאלה לרואה חשבון או לעורך דין, ואני לא נותן ייעוץ כזה. נחזור לאיך שהעבודה מתנהלת: ${q()}` });
  }
  if (sig.asksWhatAiCanDo && !canProposeIdea(a.flow)) {
    return finish(c, a, { action: 'ask', say: `אני מעדיף לא לנחש לפני שאני מבין איך העסק שלך עובד בפועל. ${q()}` });
  }
  if (mode === 'clarify') {
    return finish(c, a, { action: 'ask', say: 'מובן. כדי שאלמד — מה בעיקר לא מתאים בכיוון הזה?' });
  }
  if (mode === 'redirect') {
    const next = canProposeIdea(a.flow) ? nextProposal(a) : undefined;
    if (next) return finish(c, a, { action: 'propose', say: pitchText(next, ideaIsHypothesisOnly(a.flow), 'תודה, זה עוזר. נעזוב את הכיוון הקודם. '), proposalTemplateId: next.templateId });
    return finish(c, a, { action: 'ask', say: `תודה, זה עוזר. נעזוב את הכיוון הקודם. ${q()}` });
  }
  if (numbers) {
    const missing = currentScenario(a);
    const need: string[] = [];
    if (missing && missing.inputs.hourlyCost === undefined) need.push('עלות שעת עבודה');
    if (missing && missing.inputs.savingsRate === undefined) need.push('איזה חלק מהזמן נראה לך שבאמת אפשר לחסוך');
    const tail = need.length ? ` כדי לחשב חסרים עוד: ${need.join(' ו')}. זו תהיה הנחה שלך, לא עובדה — מה נראה לך סביר?` : ' החישוב בסימולטור מתעדכן, וכל הנחה אפשר לשנות.';
    return finish(c, a, { action: 'quantify', say: `רשמתי: ${numbers}.${tail}` });
  }
  const noNumbers = 'זה בסדר גמור. בלי מספרים לא אחשב החזר השקעה — אסמן את זה כפער פתוח, ואפשר להשלים בסימולטור כשיהיה מידע.';
  if (sig.uncertainty && (stage === 'quantify' || stage === 'selection' || stage === 'idea')) {
    if (!askedBefore(a, noNumbers)) return finish(c, a, { action: 'reflect', say: `${noNumbers} רוצה שנמשיך לכיוון אחר בינתיים?` });
    // Said once already: don't repeat it, just move the conversation on.
    return finish(c, a, { action: 'summarize', say: 'מובן, נשאיר את המספרים פתוחים. רוצה שנבדוק כיוון אחר, או שנסכם את מה שיש?' });
  }

  switch (stage) {
    case 'process':
    case 'opening':
      return finish(c, a, { action: 'ask', say: preface(a, text, sig) + q() });
    case 'implicit': {
      const question = questionForNextGap(c, a);
      if (question) return finish(c, a, { action: 'ask', say: preface(a, text, sig) + question });
      return finish(c, a, { action: 'challenge', say: 'אני תוהה אם חלק מהעבודה הזאת חוזר על עצמו כמעט זהה בכל פעם. אולי אני טועה — איך זה נראה מהצד שלך?' });
    }
    case 'idea': {
      const pending = a.lastProposed ? a.opportunities.find((o) => o.templateId === a.lastProposed) : undefined;
      if (pending) {
        return finish(c, a, { action: 'reflect', say: `אני שומע ש${reflectText(text)}. זה משנה משהו ביחס לכיוון של ${pending.name}?` });
      }
      const next = canProposeIdea(a.flow) ? nextProposal(a) : undefined;
      if (next) return finish(c, a, { action: 'propose', say: pitchText(next, ideaIsHypothesisOnly(a.flow), a.flow.proposedCount ? 'עוד כיוון שעולה לי: ' : ''), proposalTemplateId: next.templateId });
      return finish(c, a, { action: 'ask', say: preface(a, text, sig) + q() });
    }
    case 'quantify': {
      const s = currentScenario(a);
      const name = s ? a.opportunities.find((o) => o.id === s.opportunityId)?.name : undefined;
      const lead = name ? `כדי לבדוק אם ${name} שווה את זה, ` : '';
      if (!s || s.inputs.actionsPerMonth === undefined) return finish(c, a, { action: 'quantify', say: `${lead}בערך כמה פעמים בחודש זה קורה?` });
      if (s.inputs.minutesPerAction === undefined) return finish(c, a, { action: 'quantify', say: 'וכמה דקות זה לוקח בממוצע בכל פעם?' });
      if (s.inputs.hourlyCost === undefined) return finish(c, a, { action: 'quantify', say: 'כמה עולה בערך שעת עבודה של מי שעושה את זה, כולל עלויות מעסיק? אם לא ידוע, נשאיר את זה פתוח.' });
      return finish(c, a, { action: 'reflect', say: 'יש לנו את המספרים הבסיסיים, והחישוב בסימולטור שקוף ואפשר לשנות כל הנחה. רוצה שנבדוק עוד כיוון אחד?' });
    }
    case 'selection': {
      const discussed = a.opportunities.filter((o) => o.status === 'interested' || o.status === 'discussed');
      const list = discussed.length ? `עד עכשיו דיברנו על ${discussed.map((o) => o.name).join(' ועל ')}. ` : '';
      const more = a.flow.candidateCount > 0 ? 'רוצה שנבדוק עוד כיוון, או שנסכם?' : 'אין לי כרגע כיוון נוסף עם בסיס מספיק. נסכם?';
      return finish(c, a, { action: 'summarize', say: list + more });
    }
  }
  return finish(c, a, { action: 'ask', say: q() });
}

/** Rejects model output that breaks the rules: wrong action, sales pressure, >1 question, new numbers, or leaked instructions. */
export function validateReply(plan: Plan, reply: { action?: string; say?: string } | null, ownerTexts: string[] = []): { ok: boolean; reason?: string } {
  if (!reply || typeof reply.say !== 'string' || !reply.say.trim()) return { ok: false, reason: 'empty' };
  if (!plan.allowed.includes(reply.action as AgentAction)) return { ok: false, reason: `action ${reply.action} not allowed` };
  if (reply.say.length > 450) return { ok: false, reason: 'too long' };
  const v = violatesPersona(reply.say);
  if (v) return { ok: false, reason: v };
  if (detectInjection(reply.say)) return { ok: false, reason: 'instruction-like output' };
  const known = new Set([...(plan.say.match(/\d+(?:\.\d+)?/g) || []), ...ownerTexts.flatMap((t) => t.match(/\d+(?:\.\d+)?/g) || [])]);
  const fresh = (reply.say.match(/\d+(?:\.\d+)?/g) || []).filter((n) => !known.has(n));
  if (fresh.length) return { ok: false, reason: `model introduced numbers ${fresh.join(',')}` };
  return { ok: true };
}

export function commitAgentTurn(a: Assessment, plan: Plan, final: { action: AgentAction; say: string; wording?: 'model' | 'plan'; fallbackReason?: string }) {
  a.turns.push({ role: 'agent', text: final.say, action: final.action, stage: a.flow.stage, wording: final.wording, fallbackReason: final.fallbackReason, at: nowIso() });
  if (final.action === 'propose' && plan.proposalTemplateId) {
    a.lastProposed = plan.proposalTemplateId;
    const o = a.opportunities.find((x) => x.templateId === plan.proposalTemplateId);
    if (o && o.status === 'hypothesis') o.status = 'discussed';
    if (o && !o.evidence.includes('הוצג כהשערה בשיחה')) o.evidence.push('הוצג כהשערה בשיחה');
  }
  refresh(a);
}

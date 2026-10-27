// Opportunity ranking engine (PRD section 8). Deterministic and unit-tested.
// Risk checks are gates, not part of the weighted score.

import type { Opportunity, RiskProfile, ScoreInputs } from '../types';

export const WEIGHTS: Record<keyof ScoreInputs, number> = {
  value: 0.35,
  feasibility: 0.2,
  impact: 0.2,
  data: 0.15,
  speed: 0.1,
};

export const WEIGHT_LABELS: Record<keyof ScoreInputs, string> = {
  value: 'ערך כלכלי פוטנציאלי',
  feasibility: 'היתכנות עם סוכן AI',
  impact: 'היקף השפעה עסקית',
  data: 'זמינות נתונים ואינטגרציות',
  speed: 'מהירות יישום',
};

const clamp = (n: number) => Math.max(0, Math.min(5, n));

/** Weighted score on a 0–100 scale. Sub-scores are 0–5. */
export function weightedScore(s: ScoreInputs): number {
  const total = (Object.keys(WEIGHTS) as (keyof ScoreInputs)[]).reduce((sum, k) => sum + WEIGHTS[k] * clamp(s[k]), 0);
  return Math.round((total / 5) * 1000) / 10;
}

export type GateResult = { status: 'pass' | 'review' | 'blocked'; reasons: string[] };

const RISK_LABELS: Record<keyof RiskProfile, string> = {
  sensitiveData: 'מידע רגיש',
  professionalJudgment: 'שיקול דעת מקצועי',
  irreversibleAction: 'פעולה בלתי הפיכה',
  dataCorrectness: 'נכונות נתונים',
};

/**
 * Gating thresholds:
 * - blocked: an irreversible action at high risk, or two or more high risks.
 * - review: exactly one high risk — may be shown, but must be flagged and validated by a human.
 * - pass: no high risk.
 */
export function riskGate(r: RiskProfile): GateResult {
  const highs = (Object.keys(r) as (keyof RiskProfile)[]).filter((k) => r[k] === 'high');
  const reasons = highs.map((k) => `סיכון גבוה: ${RISK_LABELS[k]}`);
  if (r.irreversibleAction === 'high' || highs.length >= 2) return { status: 'blocked', reasons };
  if (highs.length === 1) return { status: 'review', reasons };
  return { status: 'pass', reasons };
}

export interface Ranked {
  opp: Opportunity;
  score: number;
  gate: GateResult;
}

/** Ranks by weighted score (ties: feasibility, then id). Rejected and blocked opportunities are excluded. */
export function rankOpportunities(opps: Opportunity[]): Ranked[] {
  return opps
    .filter((o) => o.status !== 'rejected')
    .map((opp) => ({ opp, score: weightedScore(opp.scores), gate: riskGate(opp.risks) }))
    .filter((r) => r.gate.status !== 'blocked')
    .sort((a, b) => b.score - a.score || b.opp.scores.feasibility - a.opp.scores.feasibility || a.opp.id.localeCompare(b.opp.id));
}

/**
 * Picks up to three distinct options. Distinct = different primary capability where possible.
 * Only options with evidence from the case or the conversation qualify; fewer than three is allowed.
 */
export function topThree(opps: Opportunity[]): Ranked[] {
  const ranked = rankOpportunities(opps).filter((r) => r.opp.evidence.length > 0);
  const picked: Ranked[] = [];
  const caps = new Set<string>();
  for (const r of ranked) {
    if (picked.length === 3) break;
    if (!caps.has(r.opp.capabilityIds[0])) {
      picked.push(r);
      caps.add(r.opp.capabilityIds[0]);
    }
  }
  for (const r of ranked) {
    if (picked.length === 3) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked;
}

/** Confidence comes from evidence and owner engagement, not from the model. */
export function confidence(o: Opportunity): 'low' | 'medium' | 'high' {
  const ev = o.evidence.length + (o.status === 'interested' ? 2 : 0);
  return ev >= 4 ? 'high' : ev >= 2 ? 'medium' : 'low';
}

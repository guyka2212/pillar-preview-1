import { describe, expect, it } from 'vitest';
import type { Opportunity } from '../types';
import { rankOpportunities, riskGate, topThree, weightedScore } from './ranking';

const opp = (id: string, over: Partial<Opportunity> = {}): Opportunity => ({
  id,
  templateId: id,
  name: id,
  problem: '',
  today: '',
  after: '',
  humanRole: '',
  agentRole: '',
  needs: [],
  kpi: '',
  capabilityIds: [id],
  scores: { value: 3, feasibility: 3, impact: 3, data: 3, speed: 3 },
  risks: { sensitiveData: 'low', professionalJudgment: 'low', irreversibleAction: 'low', dataCorrectness: 'low' },
  evidence: ['e1'],
  assumptions: [],
  status: 'hypothesis',
  complexity: 'low',
  ...over,
});

describe('weightedScore', () => {
  it('is 100 for all fives and 0 for all zeros', () => {
    expect(weightedScore({ value: 5, feasibility: 5, impact: 5, data: 5, speed: 5 })).toBe(100);
    expect(weightedScore({ value: 0, feasibility: 0, impact: 0, data: 0, speed: 0 })).toBe(0);
  });

  it('applies the 35/20/20/15/10 weights', () => {
    expect(weightedScore({ value: 5, feasibility: 0, impact: 0, data: 0, speed: 0 })).toBe(35);
    expect(weightedScore({ value: 0, feasibility: 5, impact: 0, data: 0, speed: 0 })).toBe(20);
    expect(weightedScore({ value: 0, feasibility: 0, impact: 0, data: 5, speed: 0 })).toBe(15);
    expect(weightedScore({ value: 0, feasibility: 0, impact: 0, data: 0, speed: 5 })).toBe(10);
  });

  it('clamps out-of-range sub-scores', () => {
    expect(weightedScore({ value: 9, feasibility: 5, impact: 5, data: 5, speed: 5 })).toBe(100);
  });
});

describe('riskGate', () => {
  it('passes low risk, reviews one high risk, blocks irreversible or double high', () => {
    expect(riskGate(opp('a').risks).status).toBe('pass');
    expect(riskGate({ ...opp('a').risks, sensitiveData: 'high' }).status).toBe('review');
    expect(riskGate({ ...opp('a').risks, irreversibleAction: 'high' }).status).toBe('blocked');
    expect(riskGate({ ...opp('a').risks, sensitiveData: 'high', professionalJudgment: 'high' }).status).toBe('blocked');
  });

  it('does not let a high score override a blocking gate', () => {
    const risky = opp('risky', { scores: { value: 5, feasibility: 5, impact: 5, data: 5, speed: 5 }, risks: { ...opp('x').risks, irreversibleAction: 'high' } });
    expect(rankOpportunities([risky, opp('safe')]).map((r) => r.opp.id)).toEqual(['safe']);
  });
});

describe('ranking', () => {
  it('sorts by score and drops rejected options', () => {
    const r = rankOpportunities([opp('low'), opp('high', { scores: { value: 5, feasibility: 4, impact: 4, data: 4, speed: 4 } }), opp('no', { status: 'rejected' })]);
    expect(r.map((x) => x.opp.id)).toEqual(['high', 'low']);
  });

  it('returns at most three, prefers distinct capabilities, and needs evidence', () => {
    const list = [
      opp('a', { capabilityIds: ['docs'], scores: { value: 5, feasibility: 5, impact: 5, data: 5, speed: 5 } }),
      opp('b', { capabilityIds: ['docs'], scores: { value: 5, feasibility: 5, impact: 5, data: 5, speed: 4 } }),
      opp('c', { capabilityIds: ['followup'] }),
      opp('d', { capabilityIds: ['intake'] }),
      opp('e', { capabilityIds: ['other'], evidence: [] }),
    ];
    const t = topThree(list).map((x) => x.opp.id);
    expect(t).toEqual(['a', 'c', 'd']);
  });

  it('may return fewer than three', () => {
    expect(topThree([opp('a')])).toHaveLength(1);
    expect(topThree([])).toHaveLength(0);
  });
});

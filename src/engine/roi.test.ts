import { describe, expect, it } from 'vitest';
import { computeAll, computeRoi, hoursSaved } from './roi';

const full = {
  actionsPerMonth: 80,
  minutesPerAction: 90,
  savingsRate: 0.5,
  hourlyCost: 150,
  cashRealizableShare: 0.5,
  extraRevenuePerMonth: 0,
  serviceCostPerMonth: 1000,
  setupCost: 12000,
};

describe('hoursSaved', () => {
  it('= actions × minutes ÷ 60 × rate', () => {
    expect(hoursSaved(80, 90, 0.5)).toBe(60);
    expect(hoursSaved(600, 4, 1)).toBe(40);
    expect(hoursSaved(10, 10, 2)).toBeCloseTo(10 * 10 / 60); // rate is capped at 100%
  });
});

describe('computeRoi (base scenario)', () => {
  it('computes capacity, cash savings, net and payback', () => {
    const r = computeRoi(full);
    expect(r.missing).toEqual([]);
    expect(r.hoursSaved).toBe(60);
    expect(r.capacityValue).toBe(9000);
    expect(r.cashSavings).toBe(4500);
    expect(r.netMonthly).toBe(3500);
    expect(r.paybackMonths).toBeCloseTo(3.4, 1);
  });

  it('separates freed capacity from cash: no cash share means no net benefit', () => {
    const r = computeRoi({ ...full, cashRealizableShare: undefined });
    expect(r.capacityValue).toBe(9000);
    expect(r.cashSavings).toBeUndefined();
    expect(r.netMonthly).toBeUndefined();
    expect(r.missing).toContain('cashRealizableShare');
  });

  it('never invents ROI when base data is missing', () => {
    const r = computeRoi({ actionsPerMonth: 80 });
    expect(r.hoursSaved).toBeUndefined();
    expect(r.netMonthly).toBeUndefined();
    expect(r.paybackMonths).toBeUndefined();
    expect(r.missing).toEqual(expect.arrayContaining(['minutesPerAction', 'savingsRate', 'serviceCostPerMonth']));
  });

  it('shows payback only when net is positive and setup cost is known', () => {
    expect(computeRoi({ ...full, serviceCostPerMonth: 10000 }).paybackMonths).toBeUndefined();
    expect(computeRoi({ ...full, setupCost: undefined }).paybackMonths).toBeUndefined();
  });

  it('counts extra revenue only from explicit assumptions', () => {
    const r = computeRoi({ ...full, cashRealizableShare: 0, extraRevenuePerMonth: 2000 });
    expect(r.netMonthly).toBe(1000);
  });
});

describe('scenarios', () => {
  it('conservative ≤ base ≤ optimistic and results are consistent across recomputation', () => {
    const [c, b, o] = computeAll(full).map((x) => x.result.hoursSaved!);
    expect(c).toBeLessThan(b);
    expect(b).toBeLessThan(o);
    expect(computeAll(full)).toEqual(computeAll(full));
  });

  it('changing an input mid-conversation changes the result deterministically', () => {
    expect(computeRoi({ ...full, actionsPerMonth: 40 }).hoursSaved).toBe(30);
  });
});

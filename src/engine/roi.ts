// Collaborative economic simulator (PRD section 10). Pure, deterministic functions; never the LLM.
// Missing inputs produce a request to fill them in — no invented ROI.

import type { RoiInputs } from '../types';

export type ScenarioName = 'conservative' | 'base' | 'optimistic';

/** Multipliers applied to the owner's savings-rate and extra-revenue assumptions. */
export const SCENARIO_FACTORS: Record<ScenarioName, number> = { conservative: 0.6, base: 1, optimistic: 1.25 };
export const SCENARIO_LABELS: Record<ScenarioName, string> = { conservative: 'שמרני', base: 'בסיס', optimistic: 'אופטימי' };

export const INPUT_LABELS: Record<keyof RoiInputs, string> = {
  actionsPerMonth: 'פעולות בחודש',
  minutesPerAction: 'דקות לפעולה',
  savingsRate: 'שיעור חיסכון משוער (%)',
  hourlyCost: 'עלות שעת עבודה (₪)',
  cashRealizableShare: 'חלק מהשעות שהופך לחיסכון כספי בפועל (%)',
  extraRevenuePerMonth: 'הכנסה נוספת בחודש (₪)',
  serviceCostPerMonth: 'עלות שירות ותפעול בחודש (₪)',
  setupCost: 'עלות הקמה חד-פעמית (₪)',
};

export interface RoiResult {
  /** Inputs still needed for each output. */
  missing: (keyof RoiInputs)[];
  hoursSaved?: number;
  capacityValue?: number;
  cashSavings?: number;
  extraRevenue: number;
  serviceCost?: number;
  netMonthly?: number;
  /** Shown only when net benefit is positive and the setup cost is known. */
  paybackMonths?: number;
  steps: string[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r0 = (n: number) => Math.round(n);
const fmt = (n: number) => r0(n).toLocaleString('he-IL');
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** Monthly hours saved = actions per month × minutes per action ÷ 60 × savings rate. */
export function hoursSaved(actions: number, minutes: number, rate: number): number {
  return (actions * minutes) / 60 * clamp01(rate);
}

export function computeRoi(inp: RoiInputs, scenario: ScenarioName = 'base'): RoiResult {
  const f = SCENARIO_FACTORS[scenario];
  const missing: (keyof RoiInputs)[] = [];
  const steps: string[] = [];
  const need = (k: keyof RoiInputs) => {
    if (!isNum(inp[k])) missing.push(k);
    return isNum(inp[k]);
  };

  const out: RoiResult = { missing, extraRevenue: 0, steps };

  // Check all three so every missing one is listed, not just the first.
  const base = [need('actionsPerMonth'), need('minutesPerAction'), need('savingsRate')];
  if (base.every(Boolean)) {
    const rate = clamp01(inp.savingsRate! * f);
    out.hoursSaved = r1(hoursSaved(inp.actionsPerMonth!, inp.minutesPerAction!, rate));
    steps.push(`שעות שמתפנות = ${inp.actionsPerMonth} × ${inp.minutesPerAction} ÷ 60 × ${r0(rate * 100)}% = ${out.hoursSaved} שעות בחודש`);
  }
  if (out.hoursSaved !== undefined && need('hourlyCost')) {
    out.capacityValue = r0(out.hoursSaved * inp.hourlyCost!);
    steps.push(`ערך הקיבולת = ${out.hoursSaved} × ${inp.hourlyCost} ₪ = ${fmt(out.capacityValue)} ₪ (זמן שמתפנה, לא בהכרח כסף)`);
  }
  if (out.capacityValue !== undefined && need('cashRealizableShare')) {
    out.cashSavings = r0(out.capacityValue * clamp01(inp.cashRealizableShare!));
    steps.push(`חיסכון כספי בפועל = ${fmt(out.capacityValue)} × ${r0(clamp01(inp.cashRealizableShare!) * 100)}% = ${fmt(out.cashSavings)} ₪`);
  }
  if (isNum(inp.extraRevenuePerMonth)) {
    out.extraRevenue = r0(inp.extraRevenuePerMonth * f);
    steps.push(`הכנסה נוספת (לפי ההנחה שלך, תרחיש ${SCENARIO_LABELS[scenario]}) = ${fmt(out.extraRevenue)} ₪`);
  }
  if (need('serviceCostPerMonth')) out.serviceCost = r0(inp.serviceCostPerMonth!);

  // Net monthly benefit = realizable cash savings + explicit extra revenue − service/operating cost.
  const hasBenefit = out.cashSavings !== undefined || out.extraRevenue > 0;
  if (hasBenefit && out.serviceCost !== undefined) {
    out.netMonthly = r0((out.cashSavings ?? 0) + out.extraRevenue - out.serviceCost);
    steps.push(`תועלת נטו בחודש = ${fmt(out.cashSavings ?? 0)} + ${fmt(out.extraRevenue)} − ${fmt(out.serviceCost)} = ${fmt(out.netMonthly)} ₪`);
    if (out.netMonthly > 0 && need('setupCost')) {
      out.paybackMonths = r1(inp.setupCost! / out.netMonthly);
      steps.push(`החזר השקעה = ${fmt(inp.setupCost!)} ÷ ${fmt(out.netMonthly)} = ${out.paybackMonths} חודשים`);
    } else if (out.netMonthly <= 0) {
      steps.push('התועלת הנטו אינה חיובית, ולכן לא מוצג החזר השקעה.');
    }
  }
  return out;
}

export function computeAll(inp: RoiInputs) {
  return (Object.keys(SCENARIO_FACTORS) as ScenarioName[]).map((s) => ({ scenario: s, result: computeRoi(inp, s) }));
}

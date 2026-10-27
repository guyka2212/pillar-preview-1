// Runs all 50 scenario fixtures against the rule-based engine.
import { describe, expect, it } from 'vitest';
import { RuleBasedClient } from '../agent/ruleBasedClient';
import { SCENARIOS } from '../fixtures/scenarios';
import { runScenario } from './runScenario';

describe('conversation scenarios (rule-based engine)', () => {
  for (const s of SCENARIOS) {
    it(`${s.id} ${s.title}`, async () => {
      const run = await runScenario(s, new RuleBasedClient());
      const failed = run.checks.filter((c) => !c.pass);
      expect(failed, failed.map((f) => `${f.expectation}: ${f.detail}`).join('\n')).toEqual([]);
      Object.values(run.rubric).forEach((v) => expect(v).toBeGreaterThanOrEqual(2));
    });
  }
});

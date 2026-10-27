// Rule-based fallback: speaks the orchestrator's planned line as-is.
// Same flow, question bank and persona rules as the LLM path, just less flexible wording.

import type { AgentReply, LlmClient } from './llmClient';
import type { Plan } from './orchestrator';

export class RuleBasedClient implements LlmClient {
  readonly kind = 'rule' as const;
  readonly label = 'מנוע שיחה מבוסס כללים';
  async load() {}
  async reply(plan: Plan): Promise<AgentReply> {
    return { action: plan.action, say: plan.say };
  }
  interrupt() {}
  dispose() {}
}

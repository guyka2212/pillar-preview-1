// The single AI interface. Two implementations today (in-browser WebLLM, rule-based fallback);
// a server-side model can be added later by implementing the same interface.

import type { AgentAction, Turn } from '../types';
import type { Plan } from './orchestrator';

export interface AgentReply {
  action: AgentAction;
  say: string;
}

export interface LoadProgress {
  progress: number; // 0..1
  text: string;
}

export interface LlmClient {
  readonly kind: 'webllm' | 'rule';
  readonly label: string;
  load(onProgress?: (p: LoadProgress) => void): Promise<void>;
  /** Turns the orchestrator's plan into the agent's words. Must choose one of plan.allowed. */
  reply(plan: Plan, history: Turn[]): Promise<AgentReply>;
  /** Stops an in-flight generation (used when the owner interrupts). */
  interrupt(): void;
  dispose(): void;
}

export async function hasWebGpu(): Promise<{ ok: boolean; f16: boolean }> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
  if (!gpu) return { ok: false, f16: false };
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? { ok: true, f16: adapter.features.has('shader-f16') } : { ok: false, f16: false };
  } catch {
    return { ok: false, f16: false };
  }
}

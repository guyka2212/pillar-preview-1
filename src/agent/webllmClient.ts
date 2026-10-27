// In-browser LLM via WebLLM (WebGPU) running in a Web Worker. No API key, no server.
// Weights download once from the public Hugging Face CDN and are cached by the browser.
// The model only rephrases the orchestrator's plan; validateReply() guards every output.

import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { detectInjection } from '../intake/sanitize';
import { buildSystemPrompt } from '../knowledge/persona';
import type { Turn } from '../types';
import type { AgentReply, LlmClient, LoadProgress } from './llmClient';
import { availableModels, defaultModel } from './models';
import { validateReply, type Plan } from './orchestrator';

export async function listModels(f16: boolean) {
  const { prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  return availableModels(prebuiltAppConfig.model_list, f16);
}

/** Extracts {"action","say"} from model output, tolerating <think> blocks and extra text. */
export function parseModelJson(raw: string): { action?: string; say?: string } | null {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    return typeof obj === 'object' && obj ? obj : null;
  } catch {
    return null;
  }
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

/**
 * Recent turns as a well-formed chat: starts and ends with a user message and never has two
 * same-role messages in a row (chat templates reject anything else). Injected owner text is masked.
 */
export function chatHistory(history: Turn[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  for (const t of history.slice(-6)) {
    const role = t.role === 'agent' ? 'assistant' : 'user';
    const content = t.role === 'owner' && detectInjection(t.text) ? '[הודעה סוננה: ניסיון לשנות את כללי הסוכן]' : t.text;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else out.push({ role, content });
  }
  if (out[0]?.role !== 'user') out.unshift({ role: 'user', content: '(תחילת השיחה)' });
  if (out[out.length - 1].role !== 'user') out.push({ role: 'user', content: '(המשך)' });
  return out;
}

export class WebLlmClient implements LlmClient {
  readonly kind = 'webllm' as const;
  label = 'מודל מקומי בדפדפן (WebLLM)';
  private engine?: MLCEngineInterface;
  private worker?: Worker;
  lastFallbackReason?: string;

  constructor(private modelId?: string, private f16 = true) {}

  async load(onProgress?: (p: LoadProgress) => void) {
    const webllm = await import('@mlc-ai/web-llm');
    const id = this.modelId ?? defaultModel(availableModels(webllm.prebuiltAppConfig.model_list, this.f16));
    if (!id) throw new Error('no supported model in WebLLM prebuilt list');
    this.modelId = id;
    this.label = `מודל מקומי: ${id}`;
    this.worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    this.engine = await webllm.CreateWebWorkerMLCEngine(this.worker, id, {
      initProgressCallback: (r) => onProgress?.({ progress: r.progress, text: r.text }),
    });
  }

  async reply(plan: Plan, history: Turn[]): Promise<AgentReply> {
    const fallback = (reason: string): AgentReply => {
      this.lastFallbackReason = reason;
      return { action: plan.action, say: plan.say, wording: 'plan', fallbackReason: reason };
    };
    if (!this.engine) return fallback('model not loaded');
    const system =
      buildSystemPrompt(plan.ctx) +
      `\nפעולה מוצעת: ${plan.action}. נוסח מוצע: "${plan.say}"\n` +
      'נסח מחדש בעברית טבעית וקצרה, שמור על אותה כוונה ועל שאלה אחת לכל היותר. אל תוסיף מספרים שלא מופיעים בנוסח.';
    const messages = [{ role: 'system' as const, content: system }, ...chatHistory(history)];
    try {
      const res = await this.engine.chat.completions.create({ messages, temperature: 0.4, max_tokens: 220 });
      const parsed = parseModelJson(res.choices[0]?.message?.content ?? '');
      const owners = history.filter((t) => t.role === 'owner').map((t) => t.text);
      const check = validateReply(plan, parsed, owners);
      if (!check.ok || !parsed) return fallback(check.reason ?? 'invalid output');
      this.lastFallbackReason = undefined;
      return { action: parsed.action as AgentReply['action'], say: parsed.say!.trim(), wording: 'model' };
    } catch (e) {
      console.warn('[webllm] generation failed', e);
      return fallback(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    }
  }

  interrupt() {
    this.engine?.interruptGenerate();
  }

  dispose() {
    this.engine?.unload();
    this.worker?.terminate();
  }
}

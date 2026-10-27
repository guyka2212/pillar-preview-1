// Picks and keeps one AI client for the whole visit, so the model stays loaded across pages.

import { getSettings } from '../storage/db';
import { hasWebGpu, type LlmClient, type LoadProgress } from './llmClient';
import { RuleBasedClient } from './ruleBasedClient';

export type ModeInfo = { mode: 'webllm' | 'rule'; reason: string };

let current: { client: LlmClient; info: ModeInfo; ready: Promise<void> } | null = null;
let currentKey = '';

export async function detectMode(): Promise<ModeInfo & { f16: boolean }> {
  const s = getSettings();
  if (s.forceRuleBased) return { mode: 'rule', reason: 'נבחר מצב כללים בהגדרות', f16: false };
  const gpu = await hasWebGpu();
  if (!gpu.ok) return { mode: 'rule', reason: 'WebGPU לא זמין בדפדפן או במכשיר הזה', f16: false };
  return { mode: 'webllm', reason: 'WebGPU זמין — המודל רץ על המכשיר שלך', f16: gpu.f16 };
}

/** Returns the shared client. For WebLLM, `ready` resolves when the model has loaded. */
export async function getClient(onProgress: (p: LoadProgress) => void) {
  const det = await detectMode();
  const key = `${det.mode}:${getSettings().modelId ?? ''}`;
  if (current && currentKey === key) return current;
  current?.client.dispose();
  currentKey = key;
  if (det.mode === 'rule') {
    const client = new RuleBasedClient();
    current = { client, info: det, ready: Promise.resolve() };
    return current;
  }
  const { WebLlmClient } = await import('./webllmClient');
  const client = new WebLlmClient(getSettings().modelId, det.f16);
  const ready = client.load(onProgress);
  current = { client, info: det, ready };
  // A failed load drops back to rules so the site keeps working.
  ready.catch((e) => {
    current = { client: new RuleBasedClient(), info: { mode: 'rule', reason: `טעינת המודל נכשלה (${(e as Error).message}) — עברנו למצב כללים` }, ready: Promise.resolve() };
  });
  return current;
}

export function switchToRuleBased() {
  current?.client.dispose();
  current = { client: new RuleBasedClient(), info: { mode: 'rule', reason: 'עברת למצב כללים בזמן הורדת המודל' }, ready: Promise.resolve() };
  currentKey = 'rule:manual';
  return current;
}

export const currentSession = () => current;

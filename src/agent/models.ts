// Model choice. IDs are never hard-coded blindly: they are looked up in WebLLM's own prebuilt list
// at runtime, and only IDs present there are offered.

/** Preferred defaults, best first: small instruct models (1.5B–4B, q4) with reasonable Hebrew. */
export const PREFERRED = ['Qwen2.5-3B-Instruct', 'Qwen3-4B', 'gemma-2-2b-it', 'Qwen3-1.7B', 'Qwen2.5-1.5B-Instruct'];
/** Lighter options for weaker devices. */
export const LIGHT = ['Qwen2.5-0.5B-Instruct', 'Qwen3-0.6B', 'Qwen2.5-1.5B-Instruct'];

export interface ModelOption {
  id: string;
  vramMB?: number;
  light: boolean;
}

interface ListedModel {
  model_id: string;
  vram_required_MB?: number;
}

/** Filters WebLLM's list down to our families, preferring q4f16 when the GPU supports it, else q4f32. */
export function availableModels(list: ListedModel[], f16: boolean): ModelOption[] {
  const quant = f16 ? 'q4f16_1' : 'q4f32_1';
  const out: ModelOption[] = [];
  for (const fam of [...PREFERRED, ...LIGHT]) {
    const m = list.find((x) => x.model_id === `${fam}-${quant}-MLC`) ?? list.find((x) => x.model_id.startsWith(`${fam}-q4`));
    if (m && !out.some((o) => o.id === m.model_id)) out.push({ id: m.model_id, vramMB: m.vram_required_MB, light: LIGHT.includes(fam) });
  }
  return out;
}

export function defaultModel(options: ModelOption[]): string | undefined {
  return options.find((o) => !o.light)?.id ?? options[0]?.id;
}

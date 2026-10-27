// Hebrew speech via the browser Web Speech API (he-IL). Recognition works best in Chrome/Edge;
// the UI falls back to typing when it is missing.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  onspeechstart: (() => void) | null;
};

const Ctor = (): (new () => Recognition) | undefined =>
  typeof window === 'undefined' ? undefined : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const sttSupported = () => !!Ctor();
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export interface Listener {
  stop(): void;
}

/** Starts listening. onInterim streams the live transcript; onFinal fires once with the full utterance. */
export function listen(opts: { onInterim(t: string): void; onFinal(t: string): void; onSpeechStart?(): void; onEnd(): void; onError(msg: string): void }): Listener | null {
  const C = Ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = 'he-IL';
  rec.continuous = false;
  rec.interimResults = true;
  let final = '';
  rec.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    opts.onInterim(final + interim);
  };
  rec.onspeechstart = () => opts.onSpeechStart?.();
  rec.onerror = (e: any) => opts.onError(e.error || 'speech error');
  rec.onend = () => {
    if (final.trim()) opts.onFinal(final.trim());
    opts.onEnd();
  };
  rec.start();
  return { stop: () => rec.stop() };
}

function hebrewVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('he'));
}

export const hasHebrewVoice = () => ttsSupported() && !!hebrewVoice();

export function speak(text: string, onEnd?: () => void) {
  if (!ttsSupported()) return onEnd?.();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  const v = hebrewVoice();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

/** Interrupts the agent mid-sentence. */
export function stopSpeaking() {
  if (ttsSupported()) speechSynthesis.cancel();
}

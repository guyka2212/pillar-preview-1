// Prompt-injection defence for untrusted content (websites, documents, and owner text).
// Detected instructions are kept as flagged data and shown to Barry; they never reach the rules.

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?(the )?(previous|prior|above) (instructions|rules)/i,
  /disregard (all )?(previous|prior|your) (instructions|rules)/i,
  /you are now/i,
  /\b(system|assistant|developer)\s*:/i,
  /new instructions/i,
  /התעלם מ(כל )?ה?הוראות/,
  /אתה עכשיו/,
  /הוראות חדשות/,
  /תציע (ללקוח )?הנחה/,
  /קבע פגישה עכשיו/,
  /<\/?(system|rules|data|prompt)>/i,
];

export function detectInjection(text: string): string | null {
  const hit = INJECTION_PATTERNS.find((p) => p.test(text));
  return hit ? hit.source : null;
}

/** Removes sentences that look like instructions to the agent, returning the cleaned text and what was removed. */
export function quarantine(text: string): { clean: string; removed: string[] } {
  const removed: string[] = [];
  const kept = splitSentences(text).filter((s) => {
    if (detectInjection(s)) {
      removed.push(s);
      return false;
    }
    return true;
  });
  return { clean: kept.join(' '), removed };
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。\n])\s+|\s*[•·|]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

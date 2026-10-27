// Deterministic reading of owner turns: signals, filled gaps and numbers.
// The LLM never extracts or computes numbers; this module does.

import type { Gap, RoiInputs } from '../types';
import { detectInjection } from '../intake/sanitize';

export interface Signals {
  interest: boolean;
  rejection: boolean;
  close: boolean;
  impatience: boolean;
  uncertainty: boolean;
  professionalAdvice: boolean;
  asksWhatAiCanDo: boolean;
  injection: boolean;
  confirm: boolean;
  correction: boolean;
}

const has = (t: string, words: (string | RegExp)[]) => words.some((w) => (typeof w === 'string' ? t.includes(w) : w.test(t)));

export function readSignals(text: string): Signals {
  const t = text.trim();
  return {
    interest: has(t, ['מעניין', 'בוא נבדוק', 'בואו נבדוק', 'נשמע טוב', 'נשמע מעניין', 'כן, בוא', 'רלוונטי', 'אשמח', 'יכול להיות שזה']) && !has(t, ['לא רלוונטי', 'לא מעניין']),
    rejection: has(t, ['לא מתאים', 'לא רלוונטי', 'לא מעניין', 'לא צריך', 'זה לא הבעיה', 'פחות מתאים', /^לא[,.!\s]/]),
    close: has(t, ['לסיים', 'לסכם', 'אפשר לסכם', 'זהו, תודה', 'מספיק להיום', 'צריך ללכת']),
    impatience: has(t, ['אין לי זמן', 'תהיה קצר', 'בקיצור', 'תגיע לעניין', 'מהר']),
    uncertainty: has(t, ['לא יודע', 'אין לי מושג', 'לא ספרתי', 'לא בטוח', 'קשה לי להגיד']),
    professionalAdvice: has(t, ['מס הכנסה', 'מע"מ', 'מבחינה משפטית', 'עורך דין', 'רואה חשבון', 'רו"ח', 'חוזה צריך', 'אבחנה', 'תרופה']),
    asksWhatAiCanDo: has(t, [/מה (ה-?)?AI יכול/i, /מה בינה מלאכותית יכולה/, 'תגיד לי אתה']),
    injection: detectInjection(t) !== null,
    confirm: has(t, [/^כן(?=$|[\s,.!])/, 'נכון', 'בדיוק', 'זה נכון', 'מדויק']),
    correction: has(t, ['תתקן', 'בעצם', 'טעיתי', 'לא בדיוק', 'יותר כמו']),
  };
}

const PEOPLE = /אני |אני$|עובד|עובדת|מזכיר|מהנדס|פקיד|סדרן|נהג|מנהל|צוות|שותף|יוסי|יש לנו (שני|שתי|שלוש|ארבע|\d)/;
const WORKFLOW = /מקבל|שולח|מכינ|עוברים|בודק|מתקשר|מקליד|מעביר|קובע|מתאם|עונ|מטפל|אחרי ש|ואז/;
const SYSTEMS = /מערכת|אקסל|וואטסאפ|ווטסאפ|מייל|יומן|crm|erp|פריוריטי|חשבשבת|אתר|טלפון|נייר/i;
const EXCEPTIONS = /חסר|טעו|ביטול|מבטל|לא מגיע|מאחר|עיכוב|תקלה|בעיה|מתסכל|קשה/;
const DECISIONS = /מחליט|שיקול דעת|בעיקר|הכי הרבה|החלטה|לתמחר|להבין/;
const DESIRED = /הייתי רוצה|היה עוזר|חלום|מצב טוב|הצלחה/;
const MUST_NOT = /שלא י|חשוב שלא|לא לפגוע|היחס האישי/;

/** Which gaps an owner turn closes. */
export function filledGaps(text: string): Gap[] {
  const out: Gap[] = [];
  if (WORKFLOW.test(text) && text.length > 25) out.push('workflow');
  if (PEOPLE.test(text)) out.push('people');
  if (SYSTEMS.test(text)) out.push('systems');
  if (EXCEPTIONS.test(text)) out.push('exceptions');
  if (DECISIONS.test(text)) out.push('decisions');
  if (DESIRED.test(text)) out.push('desired');
  if (MUST_NOT.test(text)) out.push('mustNotHarm');
  const n = parseNumbers(text);
  if (n.actionsPerMonth !== undefined) out.push('volume');
  if (n.minutesPerAction !== undefined) out.push('time');
  if (n.hourlyCost !== undefined) out.push('cost');
  return out;
}

const NUM = '(\\d+(?:[.,]\\d+)?)';
const toNum = (s: string) => Number(s.replace(',', '.'));

/** Pulls ROI inputs out of Hebrew text. Per-day/week volumes are converted to per-month (22 workdays, 4.33 weeks). */
export function parseNumbers(text: string): RoiInputs {
  const t = text.replace(/(\d),(\d{3})/g, '$1$2');
  const out: RoiInputs = {};
  // A number followed, within three words, by a period word.
  const per = (words: string) => t.match(new RegExp(`${NUM}(?:\\s+[^\\d\\s]+){0,3}?\\s+(?:${words})`));
  const month = per('בחודש|לחודש');
  const day = per('ביום|ליום');
  const week = per('בשבוע|לשבוע');
  if (month) out.actionsPerMonth = toNum(month[1]);
  else if (day) out.actionsPerMonth = Math.round(toNum(day[1]) * 22);
  else if (week) out.actionsPerMonth = Math.round(toNum(week[1]) * 4.33);

  const minutes = t.match(new RegExp(`${NUM}\\s*דק(?:ות|ה|')`));
  const hours = t.match(new RegExp(`${NUM}\\s*שעות|שעה וחצי|שעתיים`));
  if (minutes) out.minutesPerAction = toNum(minutes[1]);
  else if (hours) out.minutesPerAction = hours[0] === 'שעה וחצי' ? 90 : hours[0] === 'שעתיים' ? 120 : toNum(hours[1]) * 60;

  const cost = t.match(new RegExp(`${NUM}\\s*(?:₪|ש"ח|שקל(?:ים)?)\\s*(?:ל|ב)?שעה`));
  if (cost) out.hourlyCost = toNum(cost[1]);

  const pct = t.match(new RegExp(`${NUM}\\s*(?:%|אחוז)`));
  if (pct) out.savingsRate = Math.min(1, toNum(pct[1]) / 100);
  else if (/חצי מהזמן|בערך חצי|50 אחוז/.test(t)) out.savingsRate = 0.5;
  return out;
}

/** "Correct it, it's more like half of that" → scales the previously stated volume/time. */
export function correctionFactor(text: string): number | null {
  if (/חצי מזה|חצי מ/.test(text)) return 0.5;
  if (/פי שניים|כפול/.test(text)) return 2;
  return null;
}

/** First/second person swap for reflecting what was said, without parroting word for word. */
export function reflectText(text: string): string {
  // JS \b is ASCII-only, so Hebrew word edges are matched with lookarounds.
  const word = (w: string) => new RegExp(`(?<=^|[\\s,.])${w}(?=$|[\\s,.])`, 'g');
  const swaps: [string, string][] = [
    ['אנחנו', 'אתם'],
    ['אני', 'אתה'],
    ['שלנו', 'שלכם'],
    ['לנו', 'לכם'],
    ['אצלנו', 'אצלכם'],
    ['שלי', 'שלך'],
  ];
  let out = text.trim().replace(/[.!?]+$/, '');
  // Reflect the gist (first clause of a long answer), not every word.
  if (out.length > 60 && out.indexOf(',') > 15) out = out.slice(0, out.indexOf(','));
  for (const [w, s] of swaps) out = out.replace(word(w), s);
  return out.length > 140 ? out.slice(0, 140).replace(/\s\S*$/, '') + '…' : out;
}

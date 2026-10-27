// Conversation flow (PRD section 6) as a deterministic state machine,
// plus the per-turn decision rules from section 5a.

import type { AgentAction, Gap, Stage } from '../types';

export const STAGES: Stage[] = ['opening', 'process', 'implicit', 'idea', 'quantify', 'selection', 'closing'];

/** Generic depth questions per gap, used when the industry bank has none. */
export const GENERIC_QUESTIONS: Record<Gap, string> = {
  workflow: 'אני סקרן איך העבודה באמת זורמת אצלכם — מהפנייה של הלקוח ועד המסירה. מה קורה ראשון?',
  people: 'מי מטפל בזה ראשון, ולמה דווקא הוא?',
  decisions: 'איפה בתהליך מתקבלות ההחלטות החשובות, ומי מקבל אותן?',
  exceptions: 'מה קורה כשמשהו לא הולך לפי התוכנית? איך זה נראה בפועל?',
  systems: 'איפה המידע הזה נשמר היום — במערכת, באקסל, בוואטסאפ?',
  volume: 'בערך כמה פעמים בחודש זה קורה?',
  time: 'כמה זמן זה לוקח בממוצע בכל פעם?',
  cost: 'בערך כמה עולה שעת עבודה של מי שעושה את זה, כולל עלויות מעסיק?',
  desired: 'איך היה נראה מצב שבו זה עובד טוב? מה היה משתנה?',
  mustNotHarm: 'מה חשוב לך שלא ישתנה או לא ייפגע, גם אם נשפר משהו?',
};

/** Which gaps matter most in each stage, in priority order (highest impact on recommendation quality first). */
export const STAGE_GAPS: Partial<Record<Stage, Gap[]>> = {
  process: ['workflow', 'people', 'systems'],
  implicit: ['decisions', 'exceptions', 'desired', 'mustNotHarm'],
  quantify: ['volume', 'time', 'cost'],
};

export interface FlowState {
  stage: Stage;
  filledGaps: Gap[];
  ownerTurns: number;
  turnsInStage: number;
  /** Number of templates that currently match the conversation and were not rejected. */
  candidateCount: number;
  proposedCount: number;
  interestedCount: number;
  ownerWantsToClose: boolean;
  justRejected: boolean;
  /** The owner expressed interest in the idea proposed on the previous turn. */
  newInterest: boolean;
}

export function initialFlow(): FlowState {
  return {
    stage: 'opening',
    filledGaps: [],
    ownerTurns: 0,
    turnsInStage: 0,
    candidateCount: 0,
    proposedCount: 0,
    interestedCount: 0,
    ownerWantsToClose: false,
    justRejected: false,
    newInterest: false,
  };
}

const has = (s: FlowState, g: Gap) => s.filledGaps.includes(g);

/** Section 5a: an idea may be presented only once a process, its people and a possible value are clear. */
export function canProposeIdea(s: FlowState): boolean {
  const processSeen = has(s, 'workflow');
  const whoDoesIt = has(s, 'people');
  const valueHint = has(s, 'exceptions') || has(s, 'decisions') || has(s, 'time') || has(s, 'volume') || has(s, 'desired');
  return processSeen && whoDoesIt && valueHint && s.candidateCount > 0;
}

/** True when an idea would have to be framed as a hypothesis only (information is partial). */
export function ideaIsHypothesisOnly(s: FlowState): boolean {
  return !(has(s, 'systems') && (has(s, 'volume') || has(s, 'time')));
}

/** Section 5a: the simulator opens only after the owner expressed interest in an idea. */
export function canOpenSimulator(s: FlowState): boolean {
  return s.interestedCount > 0;
}

export function nextGap(s: FlowState): Gap | undefined {
  return (STAGE_GAPS[s.stage] || []).find((g) => !has(s, g));
}

/** Advances the stage after an owner turn has been absorbed into the state. */
export function advance(s: FlowState): FlowState {
  const next = { ...s };
  const move = (stage: Stage) => {
    if (stage !== next.stage) {
      next.stage = stage;
      next.turnsInStage = 0;
    }
  };
  if (s.ownerWantsToClose) {
    move('closing');
    return next;
  }
  switch (s.stage) {
    case 'opening':
      if (s.ownerTurns >= 1) move('process');
      break;
    case 'process':
      if (has(s, 'workflow') && has(s, 'people')) move('implicit');
      break;
    case 'implicit':
      if (canProposeIdea(s) && (has(s, 'decisions') || has(s, 'exceptions') || s.turnsInStage >= 2)) move('idea');
      break;
    case 'idea':
      if (s.newInterest && !s.justRejected) move('quantify');
      else if (s.candidateCount === 0) move(s.proposedCount > 0 ? 'selection' : 'implicit');
      break;
    case 'quantify':
      if ((has(s, 'volume') && has(s, 'time')) || s.turnsInStage >= 3) move('selection');
      break;
    case 'selection':
      if (s.proposedCount >= 3 || s.candidateCount === 0) move('closing');
      else if (s.turnsInStage >= 1) move('idea');
      break;
    case 'closing':
      break;
  }
  return next;
}

/** The actions the agent may choose from in the current state. Exactly one is picked per turn. */
export function allowedActions(s: FlowState): AgentAction[] {
  switch (s.stage) {
    case 'opening':
      return ['reflect', 'ask'];
    case 'process':
      return ['reflect', 'ask'];
    case 'implicit':
      return ['reflect', 'ask', 'challenge'];
    case 'idea':
      return canProposeIdea(s) ? ['propose', 'reflect', 'ask'] : ['ask', 'reflect'];
    case 'quantify':
      return canOpenSimulator(s) ? ['quantify', 'reflect', 'ask'] : ['ask'];
    case 'selection':
      return canProposeIdea(s) ? ['summarize', 'propose', 'ask', 'quantify'] : ['summarize', 'ask', 'quantify'];
    case 'closing':
      return ['summarize'];
  }
}

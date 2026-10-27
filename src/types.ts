// Shared domain types (PRD section 13 data model, adapted for in-browser storage).

import type { FlowState } from './knowledge/flow';

export type IndustryId = 'manufacturing' | 'retail' | 'clinic' | 'construction' | 'logistics';

/** Conversation flow stages, PRD section 6 (order matters). */
export type Stage = 'opening' | 'process' | 'implicit' | 'idea' | 'quantify' | 'selection' | 'closing';

/** The fixed per-turn action list, PRD section 5a. The agent picks exactly one per turn. */
export type AgentAction = 'reflect' | 'ask' | 'challenge' | 'propose' | 'quantify' | 'summarize';

/** Information gaps the agent tries to close, ordered by impact on recommendation quality. */
export type Gap =
  | 'workflow'
  | 'people'
  | 'decisions'
  | 'exceptions'
  | 'systems'
  | 'volume'
  | 'time'
  | 'cost'
  | 'desired'
  | 'mustNotHarm';

export type Level = 'low' | 'medium' | 'high';

export interface Source {
  id: string;
  kind: 'url' | 'pdf' | 'text' | 'barry' | 'conversation';
  label: string;
  addedAt: string;
  permission: boolean;
  reliability: Level;
  tags: string[];
}

export interface Fact {
  id: string;
  text: string;
  sourceId: string;
  category: 'profile' | 'process' | 'system' | 'goal' | 'product' | 'customer' | 'other';
  /** Set when the text looked like an instruction aimed at the agent. Kept as data, never obeyed. */
  flagged?: string;
}

export interface ProcessInfo {
  id: string;
  name: string;
  steps: string[];
  people: string[];
  systems: string[];
  decisionPoints: string[];
  volumePerMonth?: number;
  minutesPerAction?: number;
  sourceIds: string[];
}

export interface RiskProfile {
  sensitiveData: Level;
  professionalJudgment: Level;
  irreversibleAction: Level;
  dataCorrectness: Level;
}

/** 0–5 sub-scores for the section 8 ranking weights. */
export interface ScoreInputs {
  value: number;
  feasibility: number;
  impact: number;
  data: number;
  speed: number;
}

export interface Opportunity {
  id: string;
  templateId: string;
  name: string;
  problem: string;
  today: string;
  after: string;
  humanRole: string;
  agentRole: string;
  needs: string[];
  kpi: string;
  capabilityIds: string[];
  scores: ScoreInputs;
  risks: RiskProfile;
  evidence: string[];
  assumptions: string[];
  status: 'hypothesis' | 'discussed' | 'interested' | 'rejected';
  complexity: Level;
}

export interface Brief {
  createdAt: string;
  profile: string[];
  valueChain: string[];
  processes: string[];
  hypotheses: { templateId: string; name: string; why: string; sourceIds: string[] }[];
  questions: string[];
  gaps: string[];
  flaggedContent: string[];
}

export interface Turn {
  role: 'agent' | 'owner';
  text: string;
  action?: AgentAction;
  stage?: Stage;
  /** For agent turns in model mode: whose wording was used, and why the model's was rejected. */
  wording?: 'model' | 'plan';
  fallbackReason?: string;
  at: string;
}

export interface RoiInputs {
  actionsPerMonth?: number;
  minutesPerAction?: number;
  savingsRate?: number; // 0..1, always the owner's assumption
  hourlyCost?: number;
  cashRealizableShare?: number; // 0..1 share of freed hours that becomes real cash savings
  extraRevenuePerMonth?: number;
  serviceCostPerMonth?: number;
  setupCost?: number;
}

export interface Scenario {
  opportunityId: string;
  inputs: RoiInputs;
  /** Where each input came from, e.g. "בעל העסק בשיחה", "הצעת מחיר לדוגמה". */
  inputSources: Partial<Record<keyof RoiInputs, string>>;
}

export interface Assessment {
  id: string;
  caseId: string;
  status: 'active' | 'closed';
  startedAt: string;
  stage: Stage;
  turns: Turn[];
  filledGaps: Gap[];
  processes: ProcessInfo[];
  opportunities: Opportunity[];
  scenarios: Scenario[];
  rejectedTemplates: string[];
  summary?: string;
  flow: FlowState;
  lastProposed?: string;
  /** True after the one clarifying question that follows a "doesn't fit" answer. */
  clarifyingRejection?: boolean;
  impatient?: boolean;
  /** Which engine produced the agent turns (for Barry's file). */
  mode?: 'webllm' | 'rule';
}

export interface BusinessCase {
  id: string;
  name: string;
  industry: IndustryId;
  size: string;
  description: string;
  systems: string[];
  goals: string[];
  url?: string;
  sources: Source[];
  facts: Fact[];
  processes: ProcessInfo[];
  brief?: Brief;
  consent: { store: boolean; transcript: boolean };
  createdAt: string;
}

export interface Lead {
  id: string;
  caseId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  consent: boolean;
  status: 'new' | 'barry-review' | 'rafi-feasibility' | 'reut-commercial' | 'closed';
  advisor: string;
  createdAt: string;
  notes: string;
}

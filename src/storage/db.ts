// In-browser storage (localStorage). Each collection is isolated per case id; nothing leaves the device.
// Kept behind small functions so it can later move to a real per-client database.

import { useSyncExternalStore } from 'react';
import type { Assessment, BusinessCase, Lead } from '../types';

const KEYS = { cases: 'pillar.v1.cases', assessments: 'pillar.v1.assessments', leads: 'pillar.v1.leads', settings: 'pillar.v1.settings', log: 'pillar.v1.log' };

export interface Settings {
  modelId?: string;
  forceRuleBased: boolean;
  speakReplies: boolean;
}

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memory.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
  version++;
  listeners.forEach((l) => l());
}

let version = 0;
export function useStoreVersion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const now = () => new Date().toISOString();

/** Action log (PRD section 15). */
export function logAction(action: string, detail = '') {
  const log = read<{ at: string; action: string; detail: string }[]>(KEYS.log, []);
  log.push({ at: now(), action, detail });
  write(KEYS.log, log.slice(-500));
}
export const getLog = () => read<{ at: string; action: string; detail: string }[]>(KEYS.log, []);

export const getCases = () => read<BusinessCase[]>(KEYS.cases, []);
export const getCase = (id: string) => getCases().find((c) => c.id === id);
export function saveCase(c: BusinessCase) {
  const all = getCases().filter((x) => x.id !== c.id);
  write(KEYS.cases, [...all, c]);
}
/** Deletion flow: removes the case and everything derived from it. */
export function deleteCase(id: string) {
  write(KEYS.cases, getCases().filter((c) => c.id !== id));
  write(KEYS.assessments, getAssessments().filter((a) => a.caseId !== id));
  write(KEYS.leads, getLeads().filter((l) => l.caseId !== id));
  logAction('delete-case', id);
}

export const getAssessments = () => read<Assessment[]>(KEYS.assessments, []);
export const getAssessmentForCase = (caseId: string) =>
  getAssessments()
    .filter((a) => a.caseId === caseId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
export function saveAssessment(a: Assessment) {
  write(KEYS.assessments, [...getAssessments().filter((x) => x.id !== a.id), a]);
}

export const getLeads = () => read<Lead[]>(KEYS.leads, []);
export function saveLead(l: Lead) {
  write(KEYS.leads, [...getLeads().filter((x) => x.id !== l.id), l]);
}

export const getSettings = () => read<Settings>(KEYS.settings, { forceRuleBased: false, speakReplies: true });
export const saveSettings = (s: Settings) => write(KEYS.settings, s);

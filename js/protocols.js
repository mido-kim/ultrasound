// Protocols the team writes in the app (array fab, phantom) and the runs made
// with them: one array batch or one phantom each. No DOM here, so tests can
// call it directly.
//
// Protocol:  { id: kind, kind: 'array' | 'phantom', steps: [ProtoStep], updatedAt, updatedBy }
// ProtoStep: { id, type: 'step' | 'section', title, detail, value: bool, unit, removed? }
//            A removed step stays in the list, hidden from the editor, while
//            some run has a result for it, so that run still shows it.
// Run:       { id, kind, name, date, notes, createdAt, createdBy, updatedAt }
// A run's results are the same records as a board's: id runId__stepId, with
// the run id in boardId.
//
// The protocol is live: editing a step changes it in every run. Results are
// keyed by step id, so they stay with their step through edits and moves.

import { DONE, resultOf } from './records.js';
import { uid } from './util.js';

export const PROTO_KINDS = {
  array: { name: '어레이 제작', item: '배치', itemObj: '배치를', prefix: 'B', blurb: '배치마다 공정 체크리스트' },
  phantom: { name: '팬텀 제작', item: '팬텀', itemObj: '팬텀을', prefix: 'P', blurb: '팬텀마다 제작 체크리스트' },
};

export function protocolOf(protocols, kind) {
  return protocols.get(kind) || { id: kind, kind, steps: [] };
}

export const liveSteps = (protocol) => protocol.steps.filter((s) => !s.removed);
export const stepCount = (protocol) => liveSteps(protocol).filter((s) => s.type === 'step').length;

// The rows of one run's checklist, in protocol order: sections, and steps with
// their shown number. Removed steps show only where this run has a result.
export function runSteps(protocol, run, results) {
  const rows = [];
  let n = 0;
  for (const s of protocol.steps) {
    if (s.removed && !(s.type === 'step' && resultOf(results, run.id, s.id))) continue;
    if (s.type === 'section') rows.push({ ...s });
    else rows.push({ ...s, no: String(++n) });
  }
  return rows;
}

export function runProgress(run, protocol, results) {
  const steps = runSteps(protocol, run, results).filter((s) => s.type === 'step');
  let done = 0;
  let fail = 0;
  let next = null;
  for (const s of steps) {
    const r = resultOf(results, run.id, s.id);
    if (DONE.has(r?.status)) done++;
    else if (!next) next = s;
    if (r?.status === 'fail') fail++;
  }
  let last = null;
  for (const r of results.values()) if (r.boardId === run.id && r.at && (!last || r.at > last.at)) last = r;
  return { total: steps.length, done, fail, next, last };
}

// "B3" after B1 and B2: one more than the highest number used with the prefix.
export function nextRunName(runs, kind) {
  const { prefix } = PROTO_KINDS[kind];
  let max = 0;
  for (const r of runs.values()) {
    const m = r.kind === kind && new RegExp(`^${prefix}(\\d+)$`).exec(r.name.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

export function newRun(fields, who) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    kind: fields.kind,
    name: fields.name,
    date: fields.date || '',
    notes: fields.notes || '',
    createdAt: now,
    createdBy: who.name,
    updatedAt: now,
  };
}

export function deleteRunOps(run, results) {
  const ops = [{ op: 'remove', coll: 'runs', id: run.id }];
  for (const r of results.values()) if (r.boardId === run.id) ops.push({ op: 'remove', coll: 'results', id: r.id });
  return ops;
}

// ---------------------------------------------------------------- editing

export const newProtoStep = (type) => ({ id: uid(), type, title: '', detail: '', value: false, unit: '' });

export function protocolPut(protocol, steps, who) {
  return { op: 'put', coll: 'protocols', obj: { id: protocol.kind, kind: protocol.kind, steps, updatedAt: new Date().toISOString(), updatedBy: who.name } };
}

export const stepHasResults = (stepId, results) => [...results.values()].some((r) => r.stepId === stepId);

// Takes a step out of the protocol: kept as removed while results point at it.
export function removeStep(steps, stepId, results) {
  if (stepHasResults(stepId, results)) return steps.map((s) => (s.id === stepId ? { ...s, removed: true } : s));
  return steps.filter((s) => s.id !== stepId);
}

// Swaps a step with the next shown step above (dir −1) or below (+1).
export function moveStep(steps, stepId, dir) {
  const shown = steps.map((s, i) => [s, i]).filter(([s]) => !s.removed);
  const at = shown.findIndex(([s]) => s.id === stepId);
  const other = shown[at + dir];
  if (at < 0 || !other) return steps;
  const out = steps.slice();
  const i = shown[at][1];
  const j = other[1];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

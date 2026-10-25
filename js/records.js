// Boards, results and what follows from them: progress, the "earlier stage not
// passed" warning, the 50 V flag and write ops. No DOM here, so tests can call
// it directly.
//
// Board:  { id, kind: 'main' | 'hv' | 'system', name, notes, mainId, hvId,
//           createdAt, createdBy, updatedAt }   (mainId / hvId: system only)
// Result: { id: boardId__stepId, boardId, stepId, status: '' | 'pass' | 'fail' | 'skip',
//           value, note, by, byUid, at }   (boardId is a run id for array / phantom runs)

import { judge } from './judge.js';
import { KINDS, stagesFor, stepById } from './steps.js';
import { uid } from './util.js';

export const resultId = (boardId, stepId) => `${boardId}__${stepId}`;
export const DONE = new Set(['pass', 'skip']);

export function resultOf(results, boardId, stepId) {
  return results.get(resultId(boardId, stepId)) || null;
}

// { total, done, fail, started } for one stage of one board.
export function stageProgress(board, stage, results) {
  let done = 0;
  let fail = 0;
  let started = 0;
  for (const st of stage.steps) {
    const r = resultOf(results, board.id, st.id);
    if (!r) continue;
    if (r.status || r.value || r.note) started++;
    if (DONE.has(r.status)) done++;
    if (r.status === 'fail') fail++;
  }
  return { total: stage.steps.length, done, fail, started };
}

export function boardProgress(board, results) {
  const stages = stagesFor(board.kind);
  const per = stages.map((s) => ({ stage: s, ...stageProgress(board, s, results) }));
  const total = per.reduce((a, p) => a + p.total, 0);
  const done = per.reduce((a, p) => a + p.done, 0);
  const fail = per.reduce((a, p) => a + p.fail, 0);
  const next = per.find((p) => p.done < p.total) || null;
  let last = null;
  for (const r of results.values()) if (r.boardId === board.id && r.at && (!last || r.at > last.at)) last = r;
  return { per, total, done, fail, next, last };
}

// Earlier stages that must pass before this one: the board's own, and for a
// system the stages of its main and HV boards.
export function earlierUnfinished(board, stageN, boards, results) {
  const out = [];
  const check = (b, label) => {
    if (!b) return;
    for (const s of stagesFor(b.kind)) {
      if (b.id === board.id && s.n >= stageN) continue;
      const p = stageProgress(b, s, results);
      if (p.done < p.total || p.fail) out.push({ board: b, stage: s, label, ...p });
    }
  };
  if (board.kind === 'system') {
    check(boards.get(board.mainId), '메인');
    check(boards.get(board.hvId), 'HV');
  }
  check(board, '');
  return out;
}

// HV readings above the array FFC connector's 50 V rating, if any.
export function over50(board, boards, results) {
  const ids = board.kind === 'hv' ? [[board.id, 'h2.p48'], [board.id, 'h2.n48']]
    : board.kind === 'system' ? [[board.hvId, 'h2.p48'], [board.hvId, 'h2.n48'], [board.id, 'x6.hvp'], [board.id, 'x6.hvn']]
      : [];
  const hits = [];
  for (const [bid, sid] of ids) {
    const r = bid && resultOf(results, bid, sid);
    if (!r?.value) continue;
    const st = stepById.get(sid);
    const { values } = judge({ ...st.spec }, r.value);
    for (const v of values) if (Math.abs(v) > 50) hits.push({ boardId: bid, stepId: sid, value: v });
  }
  return hits;
}

// The write that records a change to one step. Missing fields keep their value.
export function resultOps(results, boardId, stepId, change, who) {
  const prev = resultOf(results, boardId, stepId) || { status: '', value: '', note: '' };
  const obj = {
    id: resultId(boardId, stepId),
    boardId,
    stepId,
    status: prev.status || '',
    value: prev.value || '',
    note: prev.note || '',
    ...change,
    by: who.name,
    byUid: who.uid || '',
    at: new Date().toISOString(),
  };
  return [{ op: 'put', coll: 'results', obj }];
}

export function newBoard(fields, who) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    kind: fields.kind,
    name: fields.name,
    notes: fields.notes || '',
    mainId: fields.kind === 'system' ? fields.mainId || '' : '',
    hvId: fields.kind === 'system' ? fields.hvId || '' : '',
    createdAt: now,
    createdBy: who.name,
    updatedAt: now,
  };
}

// "메인 #3" after 메인 #1 and #2: one more than the highest number of that kind.
export function nextBoardName(boards, kind) {
  const { short } = KINDS[kind];
  let max = 0;
  for (const b of boards.values()) {
    const m = b.kind === kind && /#(\d+)\s*$/.exec(b.name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${short} #${max + 1}`;
}

export function deleteBoardOps(board, results) {
  const ops = [{ op: 'remove', coll: 'boards', id: board.id }];
  for (const r of results.values()) if (r.boardId === board.id) ops.push({ op: 'remove', coll: 'results', id: r.id });
  return ops;
}

// Boards, results and what follows from them: progress, the "earlier stage not
// passed" warning, write ops, CSV and JSON backup. No DOM here, so tests can
// call it directly.
//
// Board:  { id, kind: 'main' | 'hv' | 'system', name, notes, mainId, hvId,
//           createdAt, createdBy, updatedAt }   (mainId / hvId: system only)
// Result: { id: boardId__stepId, boardId, stepId, status: '' | 'pass' | 'fail' | 'skip',
//           value, note, by, byUid, at }

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

export function deleteBoardOps(board, results) {
  const ops = [{ op: 'remove', coll: 'boards', id: board.id }];
  for (const r of results.values()) if (r.boardId === board.id) ops.push({ op: 'remove', coll: 'results', id: r.id });
  return ops;
}

// The two builds: 메인 #1 · #2, HV #1 · #2, and a system for each pair.
export function starterBoards(who) {
  const m1 = newBoard({ kind: 'main', name: '메인 #1' }, who);
  const m2 = newBoard({ kind: 'main', name: '메인 #2' }, who);
  const h1 = newBoard({ kind: 'hv', name: 'HV #1' }, who);
  const h2 = newBoard({ kind: 'hv', name: 'HV #2' }, who);
  const s1 = newBoard({ kind: 'system', name: '시스템 #1', mainId: m1.id, hvId: h1.id }, who);
  const s2 = newBoard({ kind: 'system', name: '시스템 #2', mainId: m2.id, hvId: h2.id }, who);
  return [m1, m2, h1, h2, s1, s2];
}

// ---------------------------------------------------------------- export

const STATUS_KO = { pass: '합격', fail: '불합격', skip: '건너뜀', '': '' };
const JUDGE_KO = { ok: '범위 안', out: '범위 밖', none: '' };

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvFor(boards, results) {
  const rows = [['보드', '종류', '단계', '번호', '할 일', '기준', '측정값', '범위 판정', '결과', '메모', '기록한 사람', '기록 시각']];
  const sorted = [...boards.values()].sort((a, b) => ['main', 'hv', 'system'].indexOf(a.kind) - ['main', 'hv', 'system'].indexOf(b.kind) || a.name.localeCompare(b.name, 'ko'));
  for (const b of sorted) {
    for (const s of stagesFor(b.kind)) {
      for (const st of s.steps) {
        const r = resultOf(results, b.id, st.id) || {};
        rows.push([b.name, KINDS[b.kind].short, `${s.n} ${s.title}`, st.no, st.do, st.pass, r.value || '', JUDGE_KO[judge(st.spec, r.value).state], STATUS_KO[r.status || ''], r.note || '', r.by || '', r.at || '']);
      }
    }
  }
  // A byte-order mark so Excel opens the Korean text correctly.
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function backupFile(boards, results, version) {
  return JSON.stringify({ app: 'us-bringup', version, exportedAt: new Date().toISOString(), boards: [...boards.values()], results: [...results.values()] }, null, 1);
}

// Returns the put ops for a backup, or throws with a message people can read.
export function parseBackup(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일이 아닙니다.');
  }
  if (!d || d.app !== 'us-bringup' || !Array.isArray(d.boards) || !Array.isArray(d.results)) {
    throw new Error('이 앱의 백업 파일이 아닙니다.');
  }
  const ops = [];
  for (const b of d.boards) if (b && b.id && KINDS[b.kind]) ops.push({ op: 'put', coll: 'boards', obj: b });
  for (const r of d.results) if (r && r.id && r.boardId && r.stepId) ops.push({ op: 'put', coll: 'results', obj: r });
  return ops;
}

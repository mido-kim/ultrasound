// The results table (CSV for Excel) and the JSON backup, for boards and for
// array / phantom runs. No DOM here, so tests can call it directly.
//
// data = { boards, results, runs, protocols }, each a Map keyed by id.

import { judge } from './judge.js';
import { PROTO_KINDS, protocolOf, runSteps } from './protocols.js';
import { resultOf } from './records.js';
import { KINDS as BOARD_KINDS, stagesFor } from './steps.js';

const BOARD_STATUS = { pass: '통과', fail: '문제', skip: '건너뜀', '': '' };
const RUN_STATUS = { pass: '완료', fail: '문제', skip: '건너뜀', '': '' };
const JUDGE_KO = { ok: '범위 안', out: '범위 밖', none: '' };
const ORDER = ['main', 'hv', 'system'];

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const byName = (a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true });

export function csvFor({ boards, results, runs = new Map(), protocols = new Map() }) {
  const rows = [['구분', '이름', '단계', '번호', '할 일', '기준', '값', '범위 판정', '결과', '메모', '기록한 사람', '기록 시각']];
  const sorted = [...boards.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || byName(a, b));
  for (const b of sorted) {
    for (const s of stagesFor(b.kind)) {
      for (const st of s.steps) {
        const r = resultOf(results, b.id, st.id) || {};
        rows.push([BOARD_KINDS[b.kind].short, b.name, `${s.shown}. ${s.title}`, st.no, st.do, st.pass, r.value || '', JUDGE_KO[judge(st.spec, r.value).state], BOARD_STATUS[r.status || ''], r.note || '', r.by || '', r.at || '']);
      }
    }
  }
  for (const kind of Object.keys(PROTO_KINDS)) {
    const protocol = protocolOf(protocols, kind);
    const list = [...runs.values()].filter((r) => r.kind === kind).sort(byName);
    for (const run of list) {
      let section = '';
      for (const s of runSteps(protocol, run, results)) {
        if (s.type === 'section') {
          section = s.title;
          continue;
        }
        const r = resultOf(results, run.id, s.id) || {};
        const value = r.value ? `${r.value}${s.unit ? ` ${s.unit}` : ''}` : '';
        rows.push([PROTO_KINDS[kind].name, run.name, section, s.no, s.title, s.detail || '', value, '', RUN_STATUS[r.status || ''], r.note || '', r.by || '', r.at || '']);
      }
    }
  }
  // A byte-order mark so Excel opens the Korean text correctly.
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function backupFile({ boards, results, runs = new Map(), protocols = new Map() }, version) {
  return JSON.stringify({
    app: 'us-bringup',
    version,
    exportedAt: new Date().toISOString(),
    boards: [...boards.values()],
    results: [...results.values()],
    runs: [...runs.values()],
    protocols: [...protocols.values()],
  }, null, 1);
}

// Returns the put ops for a backup, or throws with a message people can read.
// Backups from 0.1.x have no runs or protocols.
export function parseBackup(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일이 아니에요.');
  }
  if (!d || d.app !== 'us-bringup' || !Array.isArray(d.boards) || !Array.isArray(d.results)) {
    throw new Error('이 앱의 백업 파일이 아니에요.');
  }
  const ops = [];
  for (const b of d.boards) if (b && b.id && BOARD_KINDS[b.kind]) ops.push({ op: 'put', coll: 'boards', obj: b });
  for (const r of d.runs || []) if (r && r.id && PROTO_KINDS[r.kind]) ops.push({ op: 'put', coll: 'runs', obj: r });
  for (const p of d.protocols || []) if (p && PROTO_KINDS[p.id] && Array.isArray(p.steps)) ops.push({ op: 'put', coll: 'protocols', obj: p });
  for (const r of d.results) if (r && r.id && r.boardId && r.stepId) ops.push({ op: 'put', coll: 'results', obj: r });
  return ops;
}

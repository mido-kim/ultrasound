import { describeSpec, judge, parseValues, si } from '../js/judge.js';
import {
  boardProgress, csvFor, deleteBoardOps, earlierUnfinished, over50, parseBackup, backupFile, resultId, resultOps, starterBoards,
} from '../js/records.js';
import { KINDS, STAGES, STEPS, stagesFor } from '../js/steps.js';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push([true, name]);
  } catch (err) {
    results.push([false, name, err.message]);
  }
}
function eq(actual, expected, label = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\n  expected ${b}\n  got      ${a}`);
}
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

const who = { name: '미도', uid: 'u1' };

// ---- values
test('parseValues: prefixes, units, several values, minus signs', () => {
  eq(parseValues('10k'), [10000]);
  eq(parseValues('10 kΩ', 'Ω'), [10000]);
  eq(parseValues('1.2M, 150k', 'Ω'), [1200000, 150000]);
  eq(parseValues('48.6V', 'V'), [48.6]);
  eq(parseValues('−4.95', 'V'), [-4.95]);
  eq(parseValues('-26.1 V / +25.9 V', 'V'), [-26.1, 25.9]);
  if (!near(parseValues('35 mA', 'A')[0], 0.035)) throw new Error('35 mA');
  if (!near(parseValues('220 mV', 'V')[0], 0.22)) throw new Error('220 mV');
  eq(parseValues('1.5 mm', 'mm'), [1.5], 'mm is a unit here, not milli-metre-metre');
  eq(parseValues('5 %', '%'), [5]);
  eq(parseValues(''), []);
  eq(parseValues('없음'), []);
});

test('judge: ranges, open ends, abs, all values must fit', () => {
  eq(judge({ unit: 'V', min: 4.75, max: 5.25 }, '5.02').state, 'ok');
  eq(judge({ unit: 'V', min: 4.75, max: 5.25 }, '5.3').state, 'out');
  eq(judge({ unit: 'Ω', min: 100 }, '12k').state, 'ok');
  eq(judge({ unit: 'Ω', min: 100 }, '3.2').state, 'out');
  eq(judge({ unit: 'V', max: 0.3 }, '0.02, 0.05, 0.4').state, 'out');
  eq(judge({ unit: 'V', min: -26.5, max: -23.5 }, '-25.1').state, 'ok');
  eq(judge({ unit: 'V', max: 1.1, abs: true }, '-0.9').state, 'ok');
  eq(judge({ unit: 'V', max: 1.1, abs: true }, '-1.4').state, 'out');
  eq(judge({ unit: 'V', min: 1 }, '').state, 'none');
  eq(judge(null, '5').state, 'none');
});

test('describeSpec and si', () => {
  eq(si(100e3), '100 k');
  eq(si(4.75), '4.75');
  eq(si(-26.5), '−26.5');
  eq(describeSpec({ unit: 'V', min: 4.75, max: 5.25 }), '4.75 V – 5.25 V');
  eq(describeSpec({ unit: 'Ω', min: 100e3 }), '≥ 100 kΩ');
  eq(describeSpec({ unit: 'A', max: 0.3 }), '≤ 300 mA');
  eq(describeSpec({ unit: '%', max: 10 }), '≤ 10 %');
  eq(describeSpec({ unit: 'V', max: 1.1, abs: true }), '|값| ≤ 1.1 V');
  eq(describeSpec({ unit: '', min: 300, max: 800 }), '300 – 800');
});

// ---- steps
test('steps: ids unique, every stage has steps for each of its kinds, valid kinds', () => {
  const ids = STEPS.map((s) => s.id);
  eq(new Set(ids).size, ids.length, 'duplicate step id');
  for (const s of STEPS) if (!KINDS[s.kind]) throw new Error(`bad kind ${s.id}`);
  for (const st of STAGES) for (const k of st.kinds) {
    if (!STEPS.some((s) => s.stage === st.n && s.kind === k)) throw new Error(`stage ${st.n} has no ${k} steps`);
  }
  for (const s of STEPS) if (s.spec && s.rec) throw new Error(`${s.id} is both measured and record-only`);
});

test('stagesFor: kinds get their stages, numbers follow order', () => {
  eq(stagesFor('main').map((s) => s.n), [0, 1, 3, 4]);
  eq(stagesFor('hv').map((s) => s.n), [0, 1, 2]);
  eq(stagesFor('system').map((s) => s.n), [5, 6, 7]);
  const s2 = stagesFor('hv').find((s) => s.n === 2);
  eq(s2.steps[0].no, '2-1');
  eq(s2.steps[0].id, 'h2.iin');
});

// ---- records
const mk = () => {
  const boards = new Map(starterBoards(who).map((b) => [b.id, b]));
  return { boards, results: new Map() };
};
const put = (results, ops) => ops.forEach((o) => (o.op === 'put' ? results.set(o.obj.id, o.obj) : results.delete(o.id)));
const byName = (boards, n) => [...boards.values()].find((b) => b.name === n);

test('starterBoards: 2 builds, systems link their pair', () => {
  const { boards } = mk();
  eq([...boards.values()].map((b) => b.name), ['메인 #1', '메인 #2', 'HV #1', 'HV #2', '시스템 #1', '시스템 #2']);
  const s1 = byName(boards, '시스템 #1');
  eq(boards.get(s1.mainId).name, '메인 #1');
  eq(boards.get(s1.hvId).name, 'HV #1');
});

test('resultOps keeps fields not changed, progress counts pass and skip', () => {
  const { boards, results } = mk();
  const hv = byName(boards, 'HV #1');
  put(results, resultOps(results, hv.id, 'h2.p48', { value: '49.8' }, who));
  put(results, resultOps(results, hv.id, 'h2.p48', { status: 'pass' }, who));
  const r = results.get(resultId(hv.id, 'h2.p48'));
  eq([r.value, r.status, r.by], ['49.8', 'pass', '미도']);
  put(results, resultOps(results, hv.id, 'h2.rip', { status: 'skip' }, who));
  put(results, resultOps(results, hv.id, 'h2.n48', { status: 'fail' }, who));
  const p = boardProgress(hv, results);
  eq([p.done, p.fail], [2, 1]);
});

test('earlierUnfinished: own earlier stages, and for a system its pair', () => {
  const { boards, results } = mk();
  const m1 = byName(boards, '메인 #1');
  const s1 = byName(boards, '시스템 #1');
  eq(earlierUnfinished(m1, 0, boards, results).length, 0, 'stage 0 has nothing before it');
  eq(earlierUnfinished(m1, 3, boards, results).map((g) => g.stage.n), [0, 1]);
  const sys = earlierUnfinished(s1, 5, boards, results);
  eq(sys.map((g) => `${g.label}${g.stage.n}`), ['메인0', '메인1', '메인3', '메인4', 'HV0', 'HV1', 'HV2']);
  // pass everything on 메인 #1 stage 0
  for (const st of stagesFor('main')[0].steps) put(results, resultOps(results, m1.id, st.id, { status: 'pass' }, who));
  eq(earlierUnfinished(m1, 1, boards, results).length, 0);
});

test('over50 flags HV readings above 50 V on the HV board and its system', () => {
  const { boards, results } = mk();
  const h1 = byName(boards, 'HV #1');
  const s1 = byName(boards, '시스템 #1');
  put(results, resultOps(results, h1.id, 'h2.p48', { value: '49.9' }, who));
  eq(over50(h1, boards, results).length, 0);
  put(results, resultOps(results, h1.id, 'h2.n48', { value: '-51.2' }, who));
  eq(over50(h1, boards, results).map((x) => x.value), [-51.2]);
  eq(over50(s1, boards, results).length, 1);
});

test('deleteBoardOps removes the board and only its results', () => {
  const { boards, results } = mk();
  const m1 = byName(boards, '메인 #1');
  const m2 = byName(boards, '메인 #2');
  put(results, resultOps(results, m1.id, 'm0.ics', { status: 'pass' }, who));
  put(results, resultOps(results, m2.id, 'm0.ics', { status: 'pass' }, who));
  const ops = deleteBoardOps(m1, results);
  eq(ops.map((o) => o.id), [m1.id, resultId(m1.id, 'm0.ics')]);
});

test('csv: header, one row per step per board, quoting', () => {
  const { boards, results } = mk();
  const m1 = byName(boards, '메인 #1');
  put(results, resultOps(results, m1.id, 'm1.pulls', { value: '9.98k, 10.02k', status: 'pass', note: 'R201 "ok"' }, who));
  const csv = csvFor(boards, results);
  const lines = csv.trim().split('\r\n');
  const steps = (k) => stagesFor(k).reduce((a, s) => a + s.steps.length, 0);
  eq(lines.length, 1 + 2 * steps('main') + 2 * steps('hv') + 2 * steps('system'));
  if (!csv.includes('"9.98k, 10.02k"')) throw new Error('comma value not quoted');
  if (!csv.includes('"R201 ""ok"""')) throw new Error('quote not doubled');
  if (!csv.startsWith('﻿보드,')) throw new Error('missing BOM or header');
});

test('backup round trip', () => {
  const { boards, results } = mk();
  const m1 = byName(boards, '메인 #1');
  put(results, resultOps(results, m1.id, 'm0.ics', { status: 'pass' }, who));
  const ops = parseBackup(backupFile(boards, results, '0.1.0'));
  eq(ops.filter((o) => o.coll === 'boards').length, 6);
  eq(ops.filter((o) => o.coll === 'results').length, 1);
  let threw = false;
  try { parseBackup('{"app":"planner"}'); } catch { threw = true; }
  eq(threw, true, 'foreign backup rejected');
});

// ---- report
const pass = results.filter((r) => r[0]).length;
const fail = results.length - pass;
document.title = fail ? `FAIL ${fail}/${results.length}` : `PASS ${pass}/${results.length}`;
document.getElementById('out').textContent = results
  .map(([ok, name, msg]) => `${ok ? 'PASS' : 'FAIL'}  ${name}${msg ? `\n      ${msg}` : ''}`)
  .join('\n');

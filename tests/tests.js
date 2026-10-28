import { backupFile, csvFor, parseBackup } from '../js/backup.js';
import { ARRAY_DESIGNS } from '../js/designs.js';
import { HOME_FIGURE, MEETINGS } from '../js/meetings.js';
import { CHUNK, MAX_PICTURE, baseName, chunkCount, chunkId, chunkRanges, fileSize, isPicture, typeOf } from '../js/files.js';
import {
  ROOT, SEED_FOLDERS, childrenOf, deleteFolderOps, descendantsOf, memoHtml, memoOffset, memoPoint, memoText, nextOrder,
  paintRuns, placesFor, runsOf, sanitizeMemo,
} from '../js/folders.js';
import { homeImages, homeLink, homeRecord, moved, withImage } from '../js/home.js';
import { contentsOf as legacyContents, pending as legacyPending } from '../js/legacy-import.js';
import { NOTE_MAX, deleteNotesOps, newNote, notesFor, targetOf } from '../js/notes.js';
import { describeSpec, judge, parseValues, si } from '../js/judge.js';
import {
  deleteRunOps, moveStep, newProtoStep, newRun, nextRunName, protocolPut, removeStep, runProgress, runSteps, stepCount,
} from '../js/protocols.js';
import {
  boardProgress, deleteBoardOps, earlierUnfinished, newBoard, nextBoardName, over50, resultId, resultOps,
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

test('stagesFor: kinds get their stages, shown numbers count from 1 per kind', () => {
  eq(stagesFor('main').map((s) => [s.n, s.shown]), [[0, 1], [1, 2], [3, 3], [4, 4]]);
  eq(stagesFor('hv').map((s) => [s.n, s.shown]), [[0, 1], [1, 2], [2, 3]]);
  eq(stagesFor('system').map((s) => [s.n, s.shown]), [[5, 1], [6, 2], [7, 3]]);
  const s2 = stagesFor('hv').find((s) => s.n === 2);
  eq([s2.steps[0].no, s2.steps[0].id], ['3-1', 'h2.iin']);
});

// ---- boards
function mk() {
  const add = (fields) => newBoard(fields, who);
  const m1 = add({ kind: 'main', name: '메인 #1' });
  const m2 = add({ kind: 'main', name: '메인 #2' });
  const h1 = add({ kind: 'hv', name: 'HV #1' });
  const h2 = add({ kind: 'hv', name: 'HV #2' });
  const s1 = add({ kind: 'system', name: '메인 #1 + HV #1', mainId: m1.id, hvId: h1.id });
  const s2 = add({ kind: 'system', name: '메인 #2 + HV #2', mainId: m2.id, hvId: h2.id });
  return { boards: new Map([m1, m2, h1, h2, s1, s2].map((b) => [b.id, b])), results: new Map(), m1, m2, h1, h2, s1, s2 };
}
const put = (results, ops) => ops.forEach((o) => (o.op === 'put' ? results.set(o.obj.id, o.obj) : results.delete(o.id)));

test('nextBoardName: one past the highest number of that kind', () => {
  const { boards } = mk();
  eq(nextBoardName(boards, 'main'), '메인 #3');
  eq(nextBoardName(new Map(), 'hv'), 'HV #1');
});

test('resultOps keeps fields not changed, progress counts pass and skip', () => {
  const { results, h1 } = mk();
  put(results, resultOps(results, h1.id, 'h2.p48', { value: '49.8' }, who));
  put(results, resultOps(results, h1.id, 'h2.p48', { status: 'pass' }, who));
  const r = results.get(resultId(h1.id, 'h2.p48'));
  eq([r.value, r.status, r.by], ['49.8', 'pass', '미도']);
  put(results, resultOps(results, h1.id, 'h2.rip', { status: 'skip' }, who));
  put(results, resultOps(results, h1.id, 'h2.n48', { status: 'fail' }, who));
  const p = boardProgress(h1, results);
  eq([p.done, p.fail], [2, 1]);
});

test('earlierUnfinished: own earlier stages, and for a system its pair', () => {
  const { boards, results, m1, s1 } = mk();
  eq(earlierUnfinished(m1, 0, boards, results).length, 0, 'the first stage has nothing before it');
  eq(earlierUnfinished(m1, 3, boards, results).map((g) => g.stage.n), [0, 1]);
  const sys = earlierUnfinished(s1, 5, boards, results);
  eq(sys.map((g) => `${g.label}${g.stage.n}`), ['메인0', '메인1', '메인3', '메인4', 'HV0', 'HV1', 'HV2']);
  for (const st of stagesFor('main')[0].steps) put(results, resultOps(results, m1.id, st.id, { status: 'pass' }, who));
  eq(earlierUnfinished(m1, 1, boards, results).length, 0);
});

test('over50 flags HV readings above 50 V on the HV board and its system', () => {
  const { boards, results, h1, s1 } = mk();
  put(results, resultOps(results, h1.id, 'h2.p48', { value: '49.9' }, who));
  eq(over50(h1, boards, results).length, 0);
  put(results, resultOps(results, h1.id, 'h2.n48', { value: '-51.2' }, who));
  eq(over50(h1, boards, results).map((x) => x.value), [-51.2]);
  eq(over50(s1, boards, results).length, 1);
});

test('deleteBoardOps removes the board and only its results', () => {
  const { results, m1, m2 } = mk();
  put(results, resultOps(results, m1.id, 'm0.ics', { status: 'pass' }, who));
  put(results, resultOps(results, m2.id, 'm0.ics', { status: 'pass' }, who));
  eq(deleteBoardOps(m1, results).map((o) => o.id), [m1.id, resultId(m1.id, 'm0.ics')]);
});

// ---- protocols
function proto() {
  const sec = { ...newProtoStep('section'), title: 'FPC 준비' };
  const a = { ...newProtoStep('step'), title: 'a' };
  const b = { ...newProtoStep('step'), title: 'b', value: true, unit: '°C' };
  const sec2 = { ...newProtoStep('section'), title: '본딩' };
  const c = { ...newProtoStep('step'), title: 'c' };
  const protocol = { id: 'array', kind: 'array', steps: [sec, a, b, sec2, c] };
  return { protocol, sec, a, b, sec2, c };
}

test('runSteps numbers steps through sections, progress counts done and fail', () => {
  const { protocol, a, b, c } = proto();
  const run = newRun({ kind: 'array', name: 'B2' }, who);
  const results = new Map();
  eq(runSteps(protocol, run, results).map((s) => s.no || s.title), ['FPC 준비', '1', '2', '본딩', '3']);
  put(results, resultOps(results, run.id, a.id, { status: 'pass' }, who));
  put(results, resultOps(results, run.id, b.id, { status: 'fail', value: '70' }, who));
  const p = runProgress(run, protocol, results);
  eq([p.total, p.done, p.fail, p.next.id], [3, 1, 1, b.id]);
  eq(stepCount(protocol), 3);
  put(results, resultOps(results, run.id, c.id, { status: 'skip' }, who));
  eq(runProgress(run, protocol, results).done, 2);
});

test('removeStep keeps a step with results (only where recorded), drops one without', () => {
  const { protocol, a, b } = proto();
  const r1 = newRun({ kind: 'array', name: 'B1' }, who);
  const r2 = newRun({ kind: 'array', name: 'B2' }, who);
  const results = new Map();
  put(results, resultOps(results, r1.id, a.id, { status: 'pass' }, who));
  let steps = removeStep(protocol.steps, a.id, results);
  eq(steps.find((s) => s.id === a.id).removed, true, 'recorded step is kept as removed');
  steps = removeStep(steps, b.id, results);
  eq(steps.some((s) => s.id === b.id), false, 'unrecorded step is gone');
  const p2 = { ...protocol, steps };
  eq(runSteps(p2, r1, results).filter((s) => s.type === 'step').map((s) => [s.title, s.no]), [['a', '1'], ['c', '2']]);
  eq(runSteps(p2, r2, results).filter((s) => s.type === 'step').map((s) => s.title), ['c']);
  eq(stepCount(p2), 1);
});

test('moveStep swaps with the next shown step, skipping removed ones', () => {
  const { protocol, sec, a, b, sec2, c } = proto();
  const ids = (steps) => steps.map((s) => s.id);
  eq(ids(moveStep(protocol.steps, b.id, -1)), ids([sec, b, a, sec2, c]));
  eq(ids(moveStep(protocol.steps, sec.id, -1)), ids(protocol.steps), 'top stays');
  const withRemoved = protocol.steps.map((s) => (s.id === sec2.id ? { ...s, removed: true } : s));
  eq(ids(moveStep(withRemoved, c.id, -1)), ids([sec, a, c, sec2, b]));
});

test('nextRunName, protocolPut, deleteRunOps', () => {
  const runs = new Map();
  eq(nextRunName(runs, 'array'), 'B1');
  for (const name of ['B1', 'B2', '시험']) {
    const r = newRun({ kind: 'array', name }, who);
    runs.set(r.id, r);
  }
  const p = newRun({ kind: 'phantom', name: 'P4' }, who);
  runs.set(p.id, p);
  eq([nextRunName(runs, 'array'), nextRunName(runs, 'phantom')], ['B3', 'P5']);
  const op = protocolPut({ kind: 'array' }, [], who);
  eq([op.coll, op.obj.id, op.obj.updatedBy], ['protocols', 'array', '미도']);
  const results = new Map();
  put(results, resultOps(results, p.id, 'x', { status: 'pass' }, who));
  put(results, resultOps(results, 'other', 'x', { status: 'pass' }, who));
  eq(deleteRunOps(p, results).map((o) => o.id), [p.id, resultId(p.id, 'x')]);
});

// ---- export
test('csv: header, one row per board step and run step, quoting', () => {
  const { boards, results, m1 } = mk();
  const { protocol, a } = proto();
  const run = newRun({ kind: 'array', name: 'B2' }, who);
  put(results, resultOps(results, m1.id, 'm1.pulls', { value: '9.98k, 10.02k', status: 'pass', note: 'R201 "ok"' }, who));
  put(results, resultOps(results, run.id, a.id, { status: 'pass' }, who));
  const csv = csvFor({ boards, results, runs: new Map([[run.id, run]]), protocols: new Map([['array', protocol]]) });
  const lines = csv.trim().split('\r\n');
  const steps = (k) => stagesFor(k).reduce((n, s) => n + s.steps.length, 0);
  eq(lines.length, 1 + 2 * steps('main') + 2 * steps('hv') + 2 * steps('system') + 3);
  if (!csv.includes('"9.98k, 10.02k"')) throw new Error('comma value not quoted');
  if (!csv.includes('"R201 ""ok"""')) throw new Error('quote not doubled');
  if (!csv.startsWith('﻿구분,')) throw new Error('missing BOM or header');
  if (!lines.some((l) => l.startsWith('어레이 제작,B2,FPC 준비,1,a,,,,완료'))) throw new Error('run row');
});

test('backup round trip, and a 0.1 backup without runs still loads', () => {
  const { boards, results, m1 } = mk();
  const { protocol } = proto();
  const run = newRun({ kind: 'phantom', name: 'P1' }, who);
  put(results, resultOps(results, m1.id, 'm0.ics', { status: 'pass' }, who));
  const ops = parseBackup(backupFile({ boards, results, runs: new Map([[run.id, run]]), protocols: new Map([['array', protocol]]) }, '0.2.0'));
  const count = (c) => ops.filter((o) => o.coll === c).length;
  eq([count('boards'), count('results'), count('runs'), count('protocols')], [6, 1, 1, 1]);
  const old = JSON.stringify({ app: 'us-bringup', version: '0.1.0', boards: [...boards.values()], results: [] });
  eq(parseBackup(old).length, 6);
  let threw = false;
  try { parseBackup('{"app":"planner"}'); } catch { threw = true; }
  eq(threw, true, 'foreign backup rejected');
});

// ---- files kept in Firestore
test('chunks: cover the file exactly, each under the 1 MiB document limit', () => {
  for (const size of [0, 1, CHUNK - 1, CHUNK, CHUNK + 1, 33442888]) {
    const r = chunkRanges(size);
    eq(r.length, chunkCount(size), `count for ${size}`);
    eq(r[0][0], 0);
    eq(r[r.length - 1][1], size, `end for ${size}`);
    for (let i = 1; i < r.length; i++) eq(r[i][0], r[i - 1][1], 'no gap');
    if (r.some(([a, b]) => b - a > CHUNK)) throw new Error('chunk too big');
  }
  if (CHUNK + 2000 > 1048576) throw new Error('chunk plus overhead over 1 MiB');
  eq(chunkCount(33442888), 37);
  eq(chunkId(7), '0007');
});

test('file types: pictures shown, drawings and decks downloaded', () => {
  eq(typeOf('a.PNG'), 'image/png');
  eq(typeOf('deck.pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  eq(typeOf('x.bin'), 'application/octet-stream');
  eq(typeOf('a.png', 'image/webp'), 'image/webp', 'browser type wins');
  eq([isPicture('image/png'), isPicture('image/svg+xml'), isPicture('image/vnd.dxf'), isPicture('application/zip')], [true, true, false, false]);
  eq(baseName('v2-3_stack.png'), 'v2-3_stack');
  eq([fileSize(13444), fileSize(33442888)], ['13 KB', '33.4 MB']);
});

test('moving site files: only entries not yet in Firestore are pending', () => {
  const st = { designs: new Map(), meetings: new Map(), config: new Map() };
  let p = legacyPending(st);
  eq([p.designs.length, p.meetings.length, p.home], [ARRAY_DESIGNS.length, MEETINGS.length, true]);
  st.designs.set('v2-3', {});
  st.meetings.set(MEETINGS[0].id, {});
  st.config.set('home', {});
  p = legacyPending(st);
  eq([p.designs.map((d) => d.id).includes('v2-3'), p.meetings.length, p.home], [false, 0, false]);
});

test('moving site files: pictures fit the limit, other files become Drive folder lines', () => {
  for (const d of ARRAY_DESIGNS) for (const im of d.images) if (!isPicture(typeOf(im.src))) throw new Error(`${im.src} is not a picture`);
  const v23 = ARRAY_DESIGNS.find((d) => d.id === 'v2-3');
  const lines = legacyContents(v23).split('\n');
  eq(lines.length, v23.files.length);
  eq(lines[0], 'array_v2-3_FPC1_signal_JLC.zip — FPC 1 신호 · JLC 주문용 Gerber');
  eq(legacyContents(MEETINGS[0]), '초음파 260911 미팅 (260903~).pptx — 슬라이드 원본 (PPTX)');
  const v31 = ARRAY_DESIGNS.find((d) => d.id === 'v3-1');
  eq([v31.files.length, legacyContents(v31).split('\n')[0]], [0, 'array_v3-1_FPC1_signal_JLC.zip — FPC 1 신호 · JLC 주문용 Gerber'], 'v3: files live in Drive, listed as lines');
  if (MAX_PICTURE > 50 * CHUNK) throw new Error('picture limit too big for chunks');
});

// ---- notes on items
test('notes: empty notes are not saved, threads stay apart and in order', () => {
  const me = { name: '미도', uid: 'u1' };
  eq([newNote('meetings/a', '   ', me), newNote('meetings/a', '', me), newNote('meetings/a', undefined, me)], [null, null, null]);
  const a1 = { ...newNote('meetings/a', '  첫 메모 \n', me), at: '2026-10-27T01:00:00Z' };
  const a2 = { ...newNote('meetings/a', '두 번째', { name: '정인', uid: 'u2' }), at: '2026-10-27T02:00:00Z' };
  const b1 = { ...newNote('designs/v2-3', '설계 메모', me), at: '2026-10-27T00:30:00Z' };
  eq([a1.text, a1.by, a1.byUid, a1.target], ['첫 메모', '미도', 'u1', 'meetings/a'], 'trimmed, who and where kept');
  const notes = new Map([a2, b1, a1].map((n) => [n.id, n]));
  eq(notesFor(notes, 'meetings/a').map((n) => n.text), ['첫 메모', '두 번째']);
  eq(notesFor(notes, targetOf('designs', 'v2-3')).length, 1);
  eq(deleteNotesOps(notes, 'meetings/a').map((o) => [o.op, o.coll, o.id]), [['remove', 'notes', a1.id], ['remove', 'notes', a2.id]]);
  eq(newNote('x/y', 'a'.repeat(NOTE_MAX + 50), me).text.length, NOTE_MAX, 'capped');
});

// ---- home: pictures, 목차
test('home pictures: a 0.6 record reads as one wide picture; the first stays readable by old copies', () => {
  eq(homeImages(undefined), []);
  eq(homeImages({ id: 'home', image: 'f1', caption: '진행 사항', link: '#/meetings' }), [{ file: 'f1', caption: '진행 사항', link: '#/meetings', wide: true }]);
  const list = withImage(withImage([], { file: 'a', caption: 'A', link: '', wide: true }), { file: 'b', caption: 'B', link: '', wide: false });
  eq(withImage(list, { file: 'a', caption: 'again' }).length, 2, 'no doubles');
  const rec = homeRecord(moved(list, 1, -1), '미도');
  eq([rec.images.map((x) => x.file), rec.image, rec.caption], [['b', 'a'], 'b', 'B']);
  eq(moved(list, 0, -1), list, 'cannot move past the start');
  eq(homeRecord([], '미도').image, '');
  eq([homeLink('#/meetings'), homeLink('https://x.y/z'), homeLink('javascript:alert(1)'), homeLink('http://x')], ['#/meetings', 'https://x.y/z', '', '']);
});

test('folders: seed tree, children in order, moves never go inside themselves, delete takes the subtree', () => {
  const f = new Map(SEED_FOLDERS.map((x) => [x.id, x]));
  eq(new Set(SEED_FOLDERS.map((x) => x.id)).size, SEED_FOLDERS.length, 'ids unique');
  eq(childrenOf(f, ROOT).map((x) => x.name), ['미팅 자료', '어레이 설계', '회로 보드', '측정 데이터', '논문 · 참고 자료']);
  eq(childrenOf(f, 'array').map((x) => x.name), ['v1', 'v2-1', 'v2-2', 'v2-3', 'v3-1', 'v3-2', 'v3-3']);
  f.set('lost', { id: 'lost', parent: 'gone', name: '고아', order: 999 });
  eq(childrenOf(f, ROOT).pop().id, 'lost', 'a folder whose parent is gone shows at the top');
  eq(placesFor(f, 'array').some((p) => p.id === 'array' || p.id === 'array-v1'), false);
  eq(placesFor(f, 'array').find((p) => p.id === 'meetings-2026-09-11').depth, 2);
  eq(deleteFolderOps(f, 'array').length, 8);
  eq(descendantsOf(f, 'meetings').map((x) => x.id), ['meetings-2026-09-11']);
  eq(nextOrder(f, 'array') > Math.max(...childrenOf(f, 'array').map((x) => x.order)), true);
});

test('memos: only text, line breaks and the six colors survive', () => {
  eq(sanitizeMemo('<b>굵게</b> <span class="mc-red">빨강</span><img src=x onerror=alert(1)><script>alert(2)</script>'), '굵게 <span class="mc-red">빨강</span>');
  eq(sanitizeMemo('<span class="mc-evil" style="color:red">x</span>'), 'x');
  eq(sanitizeMemo('첫 줄<div>둘째 줄</div><div><br></div><div>넷째</div>'), '첫 줄<br>둘째 줄<br><br>넷째');
  eq(sanitizeMemo('a &amp; &lt;b&gt;<br><br>'), 'a &amp; &lt;b&gt;', 'escaped, trailing breaks dropped');
  eq(memoText('<span class="mc-blue">파랑</span> 글자'), '파랑 글자');
  eq(sanitizeMemo(''), '');
});

test('memos: painting a selection splits and merges runs', () => {
  const runs = runsOf(document.createRange().createContextualFragment('가나다라마'));
  eq(memoHtml(paintRuns(runs, 1, 3, 'red')), '가<span class="mc-red">나다</span>라마');
  const twice = paintRuns(paintRuns(runs, 1, 3, 'red'), 2, 5, 'red');
  eq(memoHtml(twice), '가<span class="mc-red">나다라마</span>');
  eq(memoHtml(paintRuns(twice, 0, 5, '')), '가나다라마', 'back to the default gray');
});

test('memos: editor selection ↔ character offsets', () => {
  const box = document.createElement('div');
  box.innerHTML = '가<span class="mc-red">나다</span><br>라';
  document.body.append(box);
  const [red] = box.getElementsByTagName('span');
  eq(memoOffset(box, red.firstChild, 1), 2);
  eq(memoOffset(box, box, 2), 3, 'just before the <br>');
  eq(memoOffset(box, box.lastChild, 1), 5);
  const [n, o] = memoPoint(box, 4);
  eq([n.nodeValue, o], ['라', 0]);
  const typed = document.createElement('div');
  typed.innerHTML = '첫<div>둘</div>';                 // what Enter makes while typing
  eq(memoOffset(typed, typed.lastChild.firstChild, 0), 2);
  box.remove();
});

// ---- design files: every picture and file listed exists, at the listed size
{
  const bad = [];
  const ids = new Set();
  for (const d of ARRAY_DESIGNS) {
    if (ids.has(d.id)) bad.push(`duplicate id ${d.id}`);
    ids.add(d.id);
    for (const { src } of d.images) {
      const r = await fetch(`../${src}`, { method: 'HEAD', cache: 'no-store' });
      if (!r.ok) bad.push(`${src}: ${r.status}`);
    }
    for (const { href, size } of d.files) {
      const r = await fetch(`../${href}`, { method: 'HEAD', cache: 'no-store' });
      // GitHub Pages compresses text files; then the length is the compressed one.
      const len = r.headers.get('content-encoding') ? 0 : Number(r.headers.get('content-length'));
      if (!r.ok) bad.push(`${href}: ${r.status}`);
      else if (len && len !== size) bad.push(`${href}: ${len} bytes, listed ${size}`);
    }
  }
  results.push([!bad.length, 'design files: all listed pictures and files exist', bad.join('\n      ')]);
}

// ---- meeting slides and the home picture: files exist, the pptx at its size, links are https
{
  const bad = [];
  const head = (u) => fetch(`../${u}`, { method: 'HEAD', cache: 'no-store' });
  for (const m of MEETINGS) {
    if (m.thumb && !(await head(m.thumb)).ok) bad.push(m.thumb);
    if (m.pptx) {
      const r = await head(m.pptx.href);
      const len = Number(r.headers.get('content-length'));
      if (!r.ok) bad.push(`${m.pptx.href}: ${r.status}`);
      else if (len && len !== m.pptx.size) bad.push(`${m.pptx.href}: ${len} bytes, listed ${m.pptx.size}`);
    }
    if (m.google && !m.google.startsWith('https://docs.google.com/')) bad.push(`${m.id}: odd Slides link`);
  }
  if (HOME_FIGURE && !(await head(HOME_FIGURE.src)).ok) bad.push(HOME_FIGURE.src);
  if (HOME_FIGURE && !MEETINGS.some((m) => m.id === HOME_FIGURE.meeting)) bad.push('home picture points at no meeting');
  results.push([!bad.length, 'meeting slides: files exist, sizes and links look right', bad.join('\n      ')]);
}

// ---- report
const pass = results.filter((r) => r[0]).length;
const fail = results.length - pass;
document.title = fail ? `FAIL ${fail}/${results.length}` : `PASS ${pass}/${results.length}`;
document.getElementById('out').textContent = results
  .map(([ok, name, msg]) => `${ok ? 'PASS' : 'FAIL'}  ${name}${msg ? `\n      ${msg}` : ''}`)
  .join('\n');

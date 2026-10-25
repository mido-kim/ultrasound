// US Control bring-up: startup, sign-in, routing, the three screens (boards,
// one board's stages and steps, the reference guide) and settings.
// Pages are HTML strings put in #app; input is handled by delegation on #app.

import { firebaseConfig } from './config.js';
import { GUIDE_HTML } from './guide.js';
import { describeSpec, judge } from './judge.js';
import {
  backupFile, boardProgress, csvFor, deleteBoardOps, earlierUnfinished, newBoard, over50, parseBackup,
  resultOf, resultOps, stageProgress, starterBoards,
} from './records.js';
import { loadSettings, saveSettings } from './settings.js';
import { KINDS, stagesFor, stepById } from './steps.js';
import { localStore, readLocalData } from './store.js';
import { $, esc, readJSON, saveFile, when, writeJSON } from './util.js';
import { VERSION } from './version.js';

const app = $('#app');
let settings = loadSettings();
const state = { boards: new Map(), results: new Map(), pending: false, error: null };
let store = null;
let cloud = null;
let unsubscribe = null;
const drafts = new Map(); // input id → text typed but not yet in the store
const timers = new Map(); // input id → pending save
const SAVE_MS = 800;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

boot();

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  applyTheme();
  darkQuery.addEventListener('change', () => settings.theme === 'system' && applyTheme());
  addEventListener('hashchange', () => store && render(true));
  addEventListener('online', () => store && render());
  addEventListener('offline', () => store && render());
  wireEvents();
  if (!firebaseConfig || settings.mode === 'local') return start(localStore());
  showMessage('불러오는 중…');
  try {
    const { connectCloud } = await import('./cloud.js');
    cloud = await connectCloud(firebaseConfig);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="center-msg"><div class="stack">
      <p>동기화를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.</p>
      <div class="row" style="justify-content:center"><button type="button" data-act="use-local">이 기기에서만 쓰기</button></div>
    </div></div>`;
    return;
  }
  cloud.onUser((user) => (user ? start(cloud.storeFor(user, onSyncError)) : showSignIn()));
}

function start(s) {
  unsubscribe?.();
  store = s;
  state.error = null;
  if (!settings.name && s.email) {
    settings.name = s.email.split('@')[0];
    saveSettings(settings);
  }
  let first = true;
  unsubscribe = store.subscribe((snap) => {
    state.boards = snap.boards;
    state.results = snap.results;
    state.pending = snap.pending;
    // A draft that the store now holds is no longer a draft.
    for (const [id, text] of drafts) {
      const [field, stepId] = splitInput(id);
      const r = resultOf(state.results, route().boardId, stepId);
      if (r && (r[field] || '') === text && !timers.has(id)) drafts.delete(id);
    }
    render();
    if (first && store.kind === 'cloud') setTimeout(offerLocalCopy, 300);
    first = false;
  });
}

const who = () => ({ name: settings.name || store?.email?.split('@')[0] || '이 기기', uid: store?.uid || '' });
const commit = (ops) => store.apply(ops);

function onSyncError(err) {
  console.error(err);
  state.error = err;
  render();
}

function showMessage(text) {
  app.innerHTML = `<div class="center-msg">${esc(text)}</div>`;
}

function applyTheme() {
  const t = settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : darkQuery.matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#151c19' : '#ffffff';
}

let toastTimer = null;
function toast(text) {
  let el = $('.toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { className: 'toast', role: 'status' });
    document.body.append(el);
  }
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

// ---------------------------------------------------------------- routing

// '#/' boards · '#/b/<id>' or '#/b/<id>/<stage>' one board · '#/guide' · '#/settings'
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'b' && parts[1]) return { view: 'board', boardId: decodeURIComponent(parts[1]), stage: parts[2] !== undefined ? Number(parts[2]) : null };
  if (parts[0] === 'guide') return { view: 'guide' };
  if (parts[0] === 'settings') return { view: 'settings' };
  return { view: 'boards' };
}

// ---------------------------------------------------------------- render

function render(newPage = false) {
  if (!store) return;
  const active = document.activeElement;
  const focusId = active && app.contains(active) && active.id ? active.id : null;
  const sel = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const y = scrollY;
  const anchor = anchorRow(active);
  const anchorId = anchor?.id;
  const anchorTop = anchor?.getBoundingClientRect().top;
  const r = route();
  let body;
  if (r.view === 'board') body = boardPage(r);
  else if (r.view === 'guide') body = guidePage();
  else if (r.view === 'settings') body = settingsPage();
  else body = boardsPage();
  app.innerHTML = `${shell(r)}<main id="main">${errorBanner()}${body}</main>`;
  if (newPage) {
    scrollTo(0, 0);
    return;
  }
  scrollTo(0, y);
  // Banners above (50 V, earlier stages) come and go with a save: keep the row in view still.
  const row = anchorId && document.getElementById(anchorId);
  if (row) scrollBy(0, row.getBoundingClientRect().top - anchorTop);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus({ preventScroll: true });
      if (sel && 'setSelectionRange' in el) {
        try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ }
      }
    }
  }
}

// The step row being worked on, else the first one on screen.
function anchorRow(active) {
  const own = active && app.contains(active) ? active.closest('.step[id]') : null;
  return own || [...app.querySelectorAll('.step[id]')].find((el) => el.getBoundingClientRect().bottom > 80) || null;
}

function shell(r) {
  const tab = (href, label, on) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
  <header class="topbar"><div class="topbar-in">
    <a class="brand" href="#/"><img src="icons/icon.svg" alt="">US Control 브링업</a>
    <nav class="tabs" aria-label="화면">
      ${tab('#/', '보드', r.view === 'boards' || r.view === 'board')}
      ${tab('#/guide', '가이드', r.view === 'guide')}
      ${tab('#/settings', '설정', r.view === 'settings')}
    </nav>
    ${syncPill()}
  </div></header>`;
}

function syncPill() {
  if (store.kind === 'local') return '<span class="sync local" title="동기화 없이 이 브라우저에만 저장됩니다">이 기기에만</span>';
  if (state.error) return '<span class="sync error">동기화 오류</span>';
  if (!navigator.onLine) return '<span class="sync pending" title="연결되면 자동으로 보냅니다">오프라인</span>';
  if (state.pending) return '<span class="sync pending">저장 중</span>';
  return `<span class="sync" title="${esc(store.email)}">동기화됨</span>`;
}

function errorBanner() {
  const e = state.error;
  if (!e) return '';
  if (e.code === 'permission-denied') {
    return `<div class="banner danger"><b>이 계정은 아직 공유 기록에 접근할 수 없습니다.</b>
      <p>Firestore 규칙에 이 계정의 UID를 넣어야 합니다. <a href="#/settings">설정 → 공유</a>에 UID와 붙여 넣을 규칙이 있습니다.</p></div>`;
  }
  return `<div class="banner danger"><b>동기화 오류</b><p>${esc(e.message || String(e))}</p></div>`;
}

// ---------------------------------------------------------------- boards

function boardsPage() {
  const boards = [...state.boards.values()];
  const head = `<div class="row"><h1>보드</h1><span class="spacer"></span><button type="button" class="primary" data-act="add-board">보드 추가</button></div>`;
  if (!boards.length) {
    return `${head}
    <div class="empty">
      <h2>아직 보드가 없습니다</h2>
      <p>조립한 보드마다 하나씩 추가합니다. 메인 보드는 단계 0 · 1 · 3 · 4, HV 보드는 단계 0 · 1 · 2를 거치고, 두 보드를 묶은 <b>시스템</b>이 단계 5 · 6 · 7을 거칩니다.</p>
      <p class="muted small">2세트 기본 구성은 메인 #1 · #2, HV #1 · #2, 그리고 시스템 #1 (메인 #1 + HV #1) · 시스템 #2 (메인 #2 + HV #2)입니다.</p>
      <div class="row"><button type="button" class="primary" data-act="starter">2세트 기본 구성 만들기</button><button type="button" data-act="add-board">보드 하나 추가</button></div>
    </div>`;
  }
  const groups = ['main', 'hv', 'system'].map((k) => {
    const list = boards.filter((b) => b.kind === k).sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
    if (!list.length) return '';
    return `<section class="kind-group"><h2>${esc(KINDS[k].name)}</h2><div class="cards">${list.map(boardCard).join('')}</div></section>`;
  }).join('');
  return head + groups;
}

function boardCard(b) {
  const p = boardProgress(b, state.results);
  const pct = (n) => (p.total ? (100 * n) / p.total : 0);
  const link = b.kind === 'system' ? `<div class="meta">${esc(state.boards.get(b.mainId)?.name || '메인 ?')} + ${esc(state.boards.get(b.hvId)?.name || 'HV ?')}</div>` : '';
  const next = p.next ? `다음: 단계 ${p.next.stage.n} · ${esc(p.next.stage.title)}` : '모든 단계 완료';
  const flag = over50(b, state.boards, state.results).length ? '<span class="chip fail">50 V 초과</span>' : '';
  return `
  <a class="card" href="#/b/${encodeURIComponent(b.id)}">
    <div class="card-top"><h3>${esc(b.name)}</h3><span class="chip">${esc(KINDS[b.kind].short)}</span>${flag}</div>
    ${link}
    <div class="bar" aria-hidden="true"><i style="width:${pct(p.done)}%"></i><i class="fail" style="width:${pct(p.fail)}%"></i></div>
    <div class="counts num"><span class="chip${p.total && p.done === p.total ? ' ok' : ''}">완료 ${p.done} / ${p.total}</span>${p.fail ? `<span class="chip fail">불합격 ${p.fail}</span>` : ''}</div>
    <div class="meta">${next}</div>
    ${p.last ? `<div class="meta">마지막 기록: ${esc(p.last.by)} · ${when(p.last.at)}</div>` : ''}
  </a>`;
}

// ---------------------------------------------------------------- one board

function boardPage(r) {
  const b = state.boards.get(r.boardId);
  if (!b) return '<div class="empty"><h2>이 보드를 찾을 수 없습니다</h2><p>지워졌거나 아직 동기화되지 않았습니다.</p><a class="btn" href="#/">보드 목록</a></div>';
  const stages = stagesFor(b.kind);
  const progress = stages.map((s) => stageProgress(b, s, state.results));
  let idx = stages.findIndex((s) => s.n === r.stage);
  if (idx < 0) {
    idx = progress.findIndex((p) => p.done < p.total);
    if (idx < 0) idx = 0;
  }
  const stage = stages[idx];
  const link = b.kind === 'system'
    ? `<p class="muted small">${['mainId', 'hvId'].map((k) => {
      const x = state.boards.get(b[k]);
      return x ? `<a href="#/b/${encodeURIComponent(x.id)}">${esc(x.name)}</a>` : (k === 'mainId' ? '메인 보드 없음' : 'HV 보드 없음');
    }).join(' + ')}</p>` : '';
  const flags = over50(b, state.boards, state.results);
  const flagBanner = flags.length
    ? `<div class="banner warn"><b>HV 실측값이 50 V를 넘었습니다</b> 실측 ${flags.map((f) => `${f.value < 0 ? '−' : '+'}${Math.abs(f.value).toFixed(1)} V`).join(', ')}. 어레이 FFC 커넥터 정격이 50 V라서 단계 7 전에 결정이 필요합니다.</div>` : '';
  const tabs = stages.map((s, i) => {
    const p = progress[i];
    const cls = p.fail ? 'fail' : p.done === p.total ? 'done' : '';
    return `<a href="#/b/${encodeURIComponent(b.id)}/${s.n}"${i === idx ? ' aria-current="true"' : ''}>
      <span class="n">단계 ${s.n}</span><span class="t">${esc(s.title)}</span>
      <span class="p ${cls} num">${p.done}/${p.total}${p.fail ? ` · 불합격 ${p.fail}` : ''}</span></a>`;
  }).join('');
  const prev = stages[idx - 1];
  const next = stages[idx + 1];
  const navBtns = `<div class="row">
    ${prev ? `<a class="btn" href="#/b/${encodeURIComponent(b.id)}/${prev.n}">← 단계 ${prev.n}</a>` : ''}
    <span class="spacer"></span>
    ${next ? `<a class="btn" href="#/b/${encodeURIComponent(b.id)}/${next.n}">단계 ${next.n} →</a>` : ''}
  </div>`;
  return `
  <div class="board-head">
    <a href="#/" class="small">← 보드 목록</a>
    <div class="row"><h1>${esc(b.name)}</h1><span class="chip">${esc(KINDS[b.kind].name)}</span><span class="spacer"></span><button type="button" data-act="edit-board">편집</button></div>
    ${link}
    ${b.notes ? `<p class="muted">${esc(b.notes)}</p>` : ''}
  </div>
  ${flagBanner}
  <nav class="stage-tabs" aria-label="단계">${tabs}</nav>
  ${stageSection(b, stage)}
  ${navBtns}`;
}

function stageSection(b, s) {
  const gate = earlierUnfinished(b, s.n, state.boards, state.results);
  const gateBanner = gate.length && s.n > 0
    ? `<div class="banner warn"><b>앞 단계가 아직 다 합격하지 않았습니다</b>
      <p>${gate.map((g) => `${g.label ? esc(g.board.name) + ' ' : ''}단계 ${g.stage.n} (${g.done}/${g.total}${g.fail ? `, 불합격 ${g.fail}` : ''})`).join(' · ')}</p>
      <p class="small">규칙 1: 전압은 직전 단계의 파형 · 전류 측정이 합격했을 때만 올립니다.</p></div>` : '';
  const setup = s.setup ? `<div class="setup"><span class="lbl">연결 상태</span><div class="chips">${s.setup.map(([c, t]) => `<span class="chip ${c}">${esc(t)}</span>`).join('')}</div></div>` : '';
  const notes = (s.notes || []).map((n) => `<div class="note ${n.tone}"><span class="tag">${esc(n.tag)}</span><p>${esc(n.text)}</p></div>`).join('');
  let html = '';
  let group = null;
  let open = false;
  for (const st of s.steps) {
    if (st.group !== group) {
      if (open) html += '</div>';
      group = st.group;
      if (group) html += `<h3 class="group-title">${esc(group)}</h3>`;
      html += '<div class="steps">';
      open = true;
    }
    html += stepRow(b, st);
  }
  if (open) html += '</div>';
  return `
  <section class="stack" aria-labelledby="stage-title">
    <div class="stage-head"><span class="num-label">단계 ${s.n}</span><h2 id="stage-title">${esc(s.title)}</h2><span class="meta">${esc(s.meta)}</span></div>
    ${gateBanner}
    ${s.intro ? `<p>${esc(s.intro)}</p>` : ''}
    ${setup}
    ${notes}
    ${html}
  </section>`;
}

function stepRow(b, st) {
  const r = resultOf(state.results, b.id, st.id) || {};
  const vid = `v-${st.id}`;
  const nid = `n-${st.id}`;
  const value = drafts.has(vid) ? drafts.get(vid) : r.value || '';
  const note = drafts.has(nid) ? drafts.get(nid) : r.note || '';
  const status = r.status || '';
  const seg = [['pass', '합격'], ['fail', '불합격'], ['skip', '건너뜀']]
    .map(([s, label]) => `<button type="button" data-step="${esc(st.id)}" data-s="${s}" aria-pressed="${status === s}">${label}</button>`).join('');
  const valueField = st.spec || st.rec
    ? `<div class="val"><input type="text" id="${esc(vid)}" data-step="${esc(st.id)}" data-field="value" value="${esc(value)}" placeholder="${st.spec ? '측정값' : '기록'}" autocomplete="off" aria-label="${esc(st.no)} ${st.spec ? '측정값' : '기록'}">${st.spec?.unit ? `<span class="unit">${esc(st.spec.unit)}</span>` : ''}</div>`
    : '';
  const range = st.spec ? `<div class="row small"><span class="range">${esc(describeSpec(st.spec))}</span><span class="judge-slot" id="j-${esc(st.id)}">${judgeBadge(st, value)}</span></div>` : '';
  return `
  <div class="step${status ? ` s-${status}` : ''}" id="row-${esc(st.id)}">
    <div class="no">${esc(st.no)}</div>
    <div class="what">
      <div class="do">${esc(st.do)}</div>
      <div class="crit"><b class="${st.rec ? 'rec' : ''}">${st.rec ? '기록' : '합격'}</b>${esc(st.pass)}</div>
    </div>
    <div class="ctl">
      ${valueField}
      ${range}
      <div class="seg" role="group" aria-label="${esc(st.no)} 결과">${seg}</div>
      <input type="text" class="note-in" id="${esc(nid)}" data-step="${esc(st.id)}" data-field="note" value="${esc(note)}" placeholder="메모" autocomplete="off" aria-label="${esc(st.no)} 메모">
      ${r.at ? `<div class="who">${esc(r.by)} · ${when(r.at)}</div>` : ''}
    </div>
  </div>`;
}

function judgeBadge(st, value) {
  const j = judge(st.spec, value);
  if (j.state === 'ok') return '<span class="judge ok">범위 안</span>';
  if (j.state === 'out') return '<span class="judge out">범위 밖</span>';
  return '';
}

// ---------------------------------------------------------------- guide

function guidePage() {
  const links = [['g-rules', '세 가지 규칙'], ['g-map', '보드 지도'], ['g-power', '전원 순서'], ['g-trouble', '증상별 점검'], ['g-diff', '바뀐 것 · 미결']];
  return `
  <div class="row"><h1>가이드</h1></div>
  <p class="lede">측정 위치를 찾을 때 보는 참고 자료입니다. 단계별 절차와 기록은 보드 화면에 있습니다.</p>
  <nav class="guide-nav">${links.map(([id, t]) => `<a href="#/guide" data-scroll="${id}">${t}</a>`).join('')}</nav>
  <div class="guide">${GUIDE_HTML}</div>`;
}

// ---------------------------------------------------------------- settings

function settingsPage() {
  const isCloud = store.kind === 'cloud';
  const rules = `match /bringup/{project}/{document=**} {
  allow read, write: if request.auth != null
    && request.auth.uid in ['${isCloud ? store.uid : '미도 UID'}', '정인 UID'];
}`;
  const account = isCloud
    ? `<dl class="kv">
        <dt>계정</dt><dd>${esc(store.email)}</dd>
        <dt>UID</dt><dd><code>${esc(store.uid)}</code></dd>
      </dl>
      <div class="row"><button type="button" data-act="copy-uid">UID 복사</button><button type="button" data-act="sign-out">로그아웃</button></div>
      <h3>공유 설정</h3>
      <p class="small">기록은 <code>bringup/us-control-v5/</code> 아래에 있고, Firestore 규칙에 UID가 들어 있는 계정만 읽고 쓸 수 있습니다. 두 사람이 각자 로그인해서 UID를 확인한 뒤, Firebase 콘솔 → Firestore → 규칙에서 Planner 규칙 옆에 아래 블록을 넣고 게시하세요. 자세한 순서는 README에 있습니다.</p>
      <pre class="rules" id="rules-text">${esc(rules)}</pre>
      <div class="row"><button type="button" data-act="copy-rules">규칙 복사</button></div>`
    : `<p>지금은 <b>이 기기에만</b> 저장합니다. 동기화 없이 이 브라우저에만 남습니다.</p>
      <div class="row">${firebaseConfig ? '<button type="button" data-act="use-cloud">로그인해서 공유하기</button>' : ''}</div>`;
  return `
  <div class="row"><h1>설정</h1></div>
  <section class="panel">
    <h2>내 이름</h2>
    <label class="field">기록마다 함께 남는 이름<input type="text" id="set-name" value="${esc(settings.name)}" autocomplete="off" placeholder="예: 미도"></label>
  </section>
  <section class="panel">
    <h2>화면</h2>
    <label class="field">테마
      <select id="set-theme">
        ${[['system', '기기 설정 따르기'], ['light', '밝게'], ['dark', '어둡게']].map(([v, t]) => `<option value="${v}"${settings.theme === v ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
    </label>
  </section>
  <section class="panel">
    <h2>동기화</h2>
    ${account}
  </section>
  <section class="panel">
    <h2>데이터</h2>
    <p class="small">CSV는 엑셀에서 열리는 결과표, JSON은 이 앱으로 다시 불러올 수 있는 백업입니다. 불러오면 같은 항목은 덮어쓰고 나머지는 그대로 둡니다.</p>
    <div class="row">
      <button type="button" data-act="export-csv">결과표 내보내기 (.csv)</button>
      <button type="button" data-act="export-json">백업 내보내기 (.json)</button>
      <button type="button" data-act="import-json">백업 불러오기</button>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
    </div>
  </section>
  <section class="panel">
    <h2>정보</h2>
    <dl class="kv"><dt>버전</dt><dd class="mono">${VERSION}</dd><dt>절차 출처</dt><dd>us_control_v5_build_guide.html Rev 0.3 → us_control_v5.4_pcb_bringup_guide.html</dd></dl>
  </section>`;
}

// ---------------------------------------------------------------- input

const splitInput = (id) => [id.startsWith('v-') ? 'value' : 'note', id.slice(2)];

function wireEvents() {
  app.addEventListener('click', onClick);
  app.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset?.field) return;
    drafts.set(t.id, t.value);
    if (t.dataset.field === 'value') {
      const slot = document.getElementById(`j-${t.dataset.step}`);
      const st = stepById.get(t.dataset.step);
      if (slot && st) slot.innerHTML = judgeBadge(st, t.value);
    }
    clearTimeout(timers.get(t.id));
    timers.set(t.id, setTimeout(() => flush(t.id), SAVE_MS));
  });
  app.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.dataset?.field && timers.has(t.id)) flush(t.id);
  });
  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'set-name') {
      settings.name = t.value.trim();
      saveSettings(settings);
      toast('이름을 저장했습니다');
    } else if (t.id === 'set-theme') {
      settings.theme = t.value;
      saveSettings(settings);
      applyTheme();
    } else if (t.id === 'import-file' && t.files?.[0]) {
      importBackup(t.files[0]);
      t.value = '';
    }
  });
}

const currentBoard = () => state.boards.get(route().boardId);

function flush(inputId) {
  clearTimeout(timers.get(inputId));
  timers.delete(inputId);
  const b = currentBoard();
  if (!b || !drafts.has(inputId)) return;
  const [field, stepId] = splitInput(inputId);
  const text = drafts.get(inputId);
  const r = resultOf(state.results, b.id, stepId);
  if ((r?.[field] || '') === text) {
    drafts.delete(inputId);
    return;
  }
  commit(resultOps(state.results, b.id, stepId, { [field]: text }, who()));
}

function onClick(e) {
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) {
    e.preventDefault();
    document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return;
  }
  const seg = e.target.closest('button[data-s]');
  if (seg) return setStatus(seg.dataset.step, seg.dataset.s);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'add-board': return boardDialog(null);
    case 'edit-board': return boardDialog(currentBoard());
    case 'starter': return makeStarter();
    case 'copy-uid': return copy(store.uid, 'UID를 복사했습니다');
    case 'copy-rules': return copy($('#rules-text').textContent, '규칙을 복사했습니다');
    case 'sign-out': return cloud?.signOut();
    case 'export-csv': return saveFile(`us-bringup-${stamp()}.csv`, csvFor(state.boards, state.results), 'text/csv');
    case 'export-json': return saveFile(`us-bringup-backup-${stamp()}.json`, backupFile(state.boards, state.results, VERSION), 'application/json');
    case 'import-json': return $('#import-file').click();
    case 'use-local':
      settings.mode = 'local';
      saveSettings(settings);
      return start(localStore());
    case 'use-cloud':
      settings.mode = '';
      saveSettings(settings);
      return location.reload();
  }
}

const stamp = () => new Date().toISOString().slice(0, 10);

function setStatus(stepId, s) {
  const b = currentBoard();
  if (!b) return;
  const r = resultOf(state.results, b.id, stepId);
  const change = { status: r?.status === s ? '' : s };
  // Save a value or note that is still being typed together with the status.
  for (const [field, prefix] of [['value', 'v-'], ['note', 'n-']]) {
    const id = prefix + stepId;
    if (drafts.has(id)) {
      change[field] = drafts.get(id);
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
  }
  commit(resultOps(state.results, b.id, stepId, change, who()));
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast('복사하지 못했습니다. 직접 선택해서 복사하세요.');
  }
}

function makeStarter() {
  if (state.boards.size && !confirm('기본 구성 6개를 더 만들까요?')) return;
  commit(starterBoards(who()).map((obj) => ({ op: 'put', coll: 'boards', obj })));
  toast('보드 6개를 만들었습니다');
}

async function importBackup(file) {
  try {
    const ops = parseBackup(await file.text());
    if (!confirm(`보드 ${ops.filter((o) => o.coll === 'boards').length}개, 기록 ${ops.filter((o) => o.coll === 'results').length}개를 불러올까요? 같은 항목은 백업 내용으로 바뀝니다.`)) return;
    commit(ops);
    toast('불러왔습니다');
  } catch (err) {
    toast(err.message);
  }
}

// ---------------------------------------------------------------- board dialog

function boardDialog(board) {
  const editing = !!board;
  const kind0 = board?.kind || 'main';
  const count = (k) => [...state.boards.values()].filter((b) => b.kind === k).length;
  const defName = (k) => `${KINDS[k].short} #${count(k) + 1}`;
  const opts = (k, sel) => [...state.boards.values()].filter((b) => b.kind === k)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))
    .map((b) => `<option value="${esc(b.id)}"${b.id === sel ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
  <form method="dialog" id="board-form">
    <h2>${editing ? '보드 편집' : '보드 추가'}</h2>
    <label class="field">종류
      <select name="kind"${editing ? ' disabled' : ''}>
        ${Object.entries(KINDS).map(([k, v]) => `<option value="${k}"${k === kind0 ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}
      </select>
    </label>
    <label class="field">이름<input type="text" name="name" value="${esc(board?.name || defName(kind0))}" required autocomplete="off"></label>
    <div class="sys stack"${kind0 === 'system' ? '' : ' hidden'}>
      <label class="field">메인 보드<select name="mainId"><option value="">선택</option>${opts('main', board?.mainId)}</select></label>
      <label class="field">HV 보드<select name="hvId"><option value="">선택</option>${opts('hv', board?.hvId)}</select></label>
    </div>
    <label class="field">메모 (시리얼, 특이사항)<textarea name="notes">${esc(board?.notes || '')}</textarea></label>
    <div class="actions">
      ${editing ? '<button type="button" class="danger left" data-del>보드 삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">${editing ? '저장' : '추가'}</button>
    </div>
  </form>`;
  document.body.append(dlg);
  const f = dlg.querySelector('form');
  const sys = dlg.querySelector('.sys');
  let nameTouched = editing;
  f.elements.name.addEventListener('input', () => (nameTouched = true));
  f.elements.kind.addEventListener('change', () => {
    const k = f.elements.kind.value;
    sys.hidden = k !== 'system';
    if (!nameTouched) f.elements.name.value = defName(k);
  });
  dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`${board.name}와 그 기록을 모두 지울까요? 되돌릴 수 없습니다.`)) return;
    commit(deleteBoardOps(board, state.results));
    dlg.close();
    location.hash = '#/';
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    if (!name) return f.elements.name.focus();
    const fields = { kind: editing ? board.kind : f.elements.kind.value, name, notes: f.elements.notes.value.trim(), mainId: f.elements.mainId.value, hvId: f.elements.hvId.value };
    const obj = editing
      ? { ...board, name: fields.name, notes: fields.notes, mainId: board.kind === 'system' ? fields.mainId : '', hvId: board.kind === 'system' ? fields.hvId : '', updatedAt: new Date().toISOString() }
      : newBoard(fields, who());
    commit([{ op: 'put', coll: 'boards', obj }]);
    dlg.close();
    if (!editing) location.hash = `#/b/${encodeURIComponent(obj.id)}`;
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

// ---------------------------------------------------------------- local → cloud

function offerLocalCopy() {
  const flag = `usbringup.copied.${store.uid}`;
  if (readJSON(flag, false)) return;
  writeJSON(flag, true);
  const local = readLocalData();
  const boards = Object.values(local.boards);
  const results = Object.values(local.results);
  if (!boards.length) return;
  if (confirm(`이 기기에 로그인 전에 만든 보드 ${boards.length}개와 기록 ${results.length}개가 있습니다. 공유 기록으로 옮길까요?`)) {
    commit([...boards.map((obj) => ({ op: 'put', coll: 'boards', obj })), ...results.map((obj) => ({ op: 'put', coll: 'results', obj }))]);
  }
}

// ---------------------------------------------------------------- sign-in

const AUTH_ERRORS = {
  'auth/invalid-credential': '이메일이나 비밀번호가 맞지 않습니다.',
  'auth/invalid-email': '이메일 주소 형식이 맞지 않습니다.',
  'auth/user-not-found': '이메일이나 비밀번호가 맞지 않습니다.',
  'auth/wrong-password': '이메일이나 비밀번호가 맞지 않습니다.',
  'auth/email-already-in-use': '이미 이 이메일로 만든 계정이 있습니다. 로그인하세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/missing-password': '비밀번호를 입력하세요.',
  'auth/too-many-requests': '시도가 너무 많습니다. 몇 분 뒤 다시 하세요.',
  'auth/network-request-failed': '연결이 없습니다. 처음 로그인할 때는 인터넷이 필요합니다.',
  'auth/operation-not-allowed': 'Firebase에서 이메일 로그인이 꺼져 있습니다.',
  'auth/admin-restricted-operation': '이 프로젝트는 새 계정 만들기가 막혀 있습니다. Firebase 콘솔 → Authentication → 사용자 추가로 계정을 만드세요.',
};

function showSignIn() {
  unsubscribe?.();
  unsubscribe = null;
  store = null;
  app.innerHTML = `
  <div class="signin">
    <form class="card" id="signin" novalidate>
      <div class="logo"><img src="icons/icon.svg" alt="" width="56" height="56"></div>
      <h1>US Control 브링업</h1>
      <p class="hint">로그인하면 같은 기록을 함께 보고 고칩니다.</p>
      <label class="field">이메일<input type="email" name="email" autocomplete="username" inputmode="email" required></label>
      <label class="field">비밀번호<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="form-error" role="alert" hidden></p>
      <p class="form-note" hidden></p>
      <button class="primary wide" type="submit">로그인</button>
      <button class="wide" type="button" data-signup>계정 만들기</button>
      <button class="link" type="button" data-reset>비밀번호를 잊었어요</button>
      <button class="link" type="button" data-local>로그인 없이 이 기기에서만 쓰기</button>
    </form>
  </div>`;
  const f = $('#signin');
  const err = f.querySelector('.form-error');
  const note = f.querySelector('.form-note');
  const show = (e) => {
    err.textContent = AUTH_ERRORS[e.code] || e.message || String(e);
    err.hidden = false;
    note.hidden = true;
  };
  const creds = () => [f.elements.email.value.trim(), f.elements.password.value];
  const busy = (on) => f.querySelectorAll('button').forEach((b) => (b.disabled = on));
  const attempt = async (fn) => {
    err.hidden = true;
    busy(true);
    try {
      await fn();
    } catch (e) {
      show(e);
    } finally {
      busy(false);
    }
  };
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    attempt(() => cloud.signIn(...creds()));
  });
  f.querySelector('[data-signup]').addEventListener('click', () => {
    f.elements.password.autocomplete = 'new-password';
    attempt(() => cloud.signUp(...creds()));
  });
  f.querySelector('[data-reset]').addEventListener('click', () => {
    const [email] = creds();
    if (!email) return show({ message: '이메일을 먼저 입력하고 다시 누르세요.' });
    attempt(async () => {
      await cloud.resetPassword(email);
      note.textContent = `${email} 계정이 있으면 재설정 메일을 보냈습니다.`;
      note.hidden = false;
    });
  });
  f.querySelector('[data-local]').addEventListener('click', () => {
    settings.mode = 'local';
    saveSettings(settings);
    start(localStore());
  });
}

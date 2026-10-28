// Wearable Ultrasound: startup, sign-in, routing and the screens: home (pictures,
// 메모판, 목차), board checks (list, one board, reference guide), array / phantom
// protocols (runs, one run, the step editor) and settings.
// Pages are HTML strings put in #app; input is handled by delegation on #app.

import { backupFile, csvFor, parseBackup } from './backup.js';
import { firebaseConfig } from './config.js';
import { MAX_PICTURE, baseName, fileSize, isPicture } from './files.js';
import {
  MEMO_COLORS, MEMO_MAX, ROOT, SEED_FOLDERS, childrenOf, deleteFolderOps, descendantsOf, memoHtml, memoOffset, memoPoint,
  memoText, nextOrder, paintRuns, placesFor, runsOf, sanitizeMemo,
} from './folders.js';
import { GUIDE_HTML } from './guide.js';
import { homeImages, homeLink, homeRecord, moved, withImage } from './home.js';
import { describeSpec, judge } from './judge.js';
import { pending as legacyPending, runImport } from './legacy-import.js';
import { NOTE_MAX, deleteNotesOps, newNote, notesFor, targetOf } from './notes.js';
import {
  PROTO_KINDS, deleteRunOps, moveStep, newProtoStep, newRun, nextRunName, protocolOf, protocolPut,
  removeStep, runProgress, runSteps, stepCount, stepHasResults,
} from './protocols.js';
import {
  boardProgress, deleteBoardOps, earlierUnfinished, newBoard, nextBoardName, over50, resultOf, resultOps, stageProgress,
} from './records.js';
import { PLACE_GROUPS, SEED_PLACES } from './places.js';
import { loadSettings, saveSettings } from './settings.js';
import { KINDS, stagesFor, stepById } from './steps.js';
import { COLLS, localStore, readLocalData } from './store.js';
import { $, esc, readJSON, saveFile, uid, when, writeJSON } from './util.js';
import { VERSION } from './version.js';

const app = $('#app');
let settings = loadSettings();
// Every collection starts empty: an account outside the rules gets errors and
// never a first snapshot, and the pages still have to draw (with the banner).
const state = { ...Object.fromEntries(COLLS.map((c) => [c, new Map()])), pending: false, error: null };
let store = null;
let cloud = null;
let unsubscribe = null;
const drafts = new Map(); // input id → text typed but not yet in the store
const timers = new Map(); // input id → pending save
const SAVE_MS = 800;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
// The protocol open in the step editor: a working copy, saved as it changes.
let protoEdit = null; // { kind, steps }
let protoTimer = null;

const ORDER = ['main', 'hv', 'system'];
const BOARD_LABELS = { pass: '통과', fail: '문제', skip: '건너뜀' };
const RUN_LABELS = { pass: '완료', fail: '문제', skip: '건너뜀' };

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  applyTheme();
  darkQuery.addEventListener('change', () => settings.theme === 'system' && applyTheme());
  addEventListener('hashchange', onRouteChange);
  addEventListener('online', () => store && render());
  addEventListener('offline', () => store && render());
  document.addEventListener('visibilitychange', () => document.hidden && store && flushAll());
  wireEvents();
  if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('dev')) {
    const { devStore } = await import('./dev-store.js');
    return start(devStore());
  }
  if (!firebaseConfig || settings.mode === 'local') return start(localStore());
  showMessage('불러오는 중…');
  try {
    const { connectCloud } = await import('./cloud.js');
    cloud = await connectCloud(firebaseConfig);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="center-msg"><div class="stack">
      <p>동기화를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침하세요.</p>
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
    for (const c of COLLS) state[c] = snap[c];
    state.pending = snap.pending;
    // A draft that the store now holds is no longer a draft.
    for (const [id, text] of drafts) {
      const [field, stepId] = splitInput(id);
      const r = resultOf(state.results, route().targetId, stepId);
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

// '#/' home · '#/boards' · '#/b/<id>[/<stage n>]' one board · '#/guide' ·
// '#/p/<kind>' runs · '#/p/<kind>/edit' step editor · '#/p/array/designs' design files ·
// '#/r/<id>' one run · '#/meetings' meeting slides · '#/places' 자료 지도 · '#/settings'
function route() {
  const [a, b, c] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (a === 'boards') return { view: 'boards' };
  if (a === 'meetings') return { view: 'meetings' };
  if (a === 'places') return { view: 'places' };
  if (a === 'b' && b) return { view: 'board', targetId: decodeURIComponent(b), stage: c !== undefined ? Number(c) : null };
  if (a === 'guide') return { view: 'guide' };
  if (a === 'p' && b === 'array' && c === 'designs') return { view: 'designs', kind: b };
  if (a === 'p' && PROTO_KINDS[b]) return { view: c === 'edit' ? 'edit' : 'proto', kind: b };
  if (a === 'r' && b) return { view: 'run', targetId: decodeURIComponent(b) };
  if (a === 'settings') return { view: 'settings' };
  return { view: 'home' };
}

function onRouteChange() {
  if (!store) return;
  const r = route();
  if (protoEdit && !(r.view === 'edit' && r.kind === protoEdit.kind)) {
    saveProto();
    protoEdit = null;
  }
  render(true);
}

// The board or run whose checklist is on screen.
function currentTarget() {
  const r = route();
  if (r.view === 'board') return state.boards.get(r.targetId) || null;
  if (r.view === 'run') return state.runs.get(r.targetId) || null;
  return null;
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
  const pages = {
    boards: boardsPage, board: () => boardPage(r), guide: guidePage, proto: () => protoPage(r.kind), designs: designsPage,
    edit: () => editPage(r.kind), run: () => runPage(r), meetings: meetingsPage, places: placesPage, settings: settingsPage, home: homePage,
  };
  app.innerHTML = `${shell(r)}<main id="main">${errorBanner()}${pages[r.view]()}</main>`;
  hydrateFiles();
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

// The row being worked on, else the first one on screen.
function anchorRow(active) {
  const rows = '.step[id], .pe-row[id]';
  const own = active && app.contains(active) ? active.closest(rows) : null;
  return own || [...app.querySelectorAll(rows)].find((el) => el.getBoundingClientRect().bottom > 80) || null;
}

function shell(r) {
  return `
  <header class="topbar"><div class="topbar-in">
    <a class="brand" href="#/"><img src="icons/icon.svg" alt="">Wearable Ultrasound</a>
    <span class="spacer"></span>
    ${syncPill()}
    <a class="top-link" href="#/settings"${r.view === 'settings' ? ' aria-current="page"' : ''}>설정</a>
  </div></header>`;
}

function syncPill() {
  if (store.kind === 'local') return '<span class="sync local" title="이 기기에만 저장돼요">이 기기에만</span>';
  if (state.error) return '<span class="sync error" title="동기화 오류">동기화 오류</span>';
  if (!navigator.onLine) return '<span class="sync pending" title="오프라인 · 연결되면 자동으로 보내요">오프라인</span>';
  if (state.pending) return '<span class="sync pending" title="저장 중">저장 중</span>';
  return `<span class="sync" title="동기화됨 · ${esc(store.email)}">동기화됨</span>`;
}

function errorBanner() {
  const e = state.error;
  if (!e) return '';
  if (e.code === 'permission-denied') {
    return `<div class="banner danger"><b>이 계정은 아직 공유 기록을 볼 수 없어요</b>
      <p>Firestore 규칙에 이 계정 UID를 넣어야 해요. <a href="#/settings">설정</a>에 UID와 붙여 넣을 규칙이 있어요.</p></div>`;
  }
  return `<div class="banner danger"><b>동기화 오류</b><p>${esc(e.message || String(e))}</p></div>`;
}

const back = (href, label) => `<a class="back" href="${href}">← ${esc(label)}</a>`;
const notFound = (href, label) => `<div class="empty"><h2>찾을 수 없어요</h2><p>지워졌거나 아직 동기화 안 됐어요.</p><a class="btn" href="${href}">${esc(label)}</a></div>`;

function progressBar(p) {
  const pct = (n) => (p.total ? (100 * n) / p.total : 0);
  return `<div class="prog"><div class="bar" aria-hidden="true"><i style="width:${pct(p.done)}%"></i><i class="fail" style="width:${pct(p.fail)}%"></i></div>
    <span class="num">${p.done}/${p.total}${p.fail ? ` · <span class="fail-t">문제 ${p.fail}</span>` : ''}</span></div>`;
}

const sortedBoards = () => [...state.boards.values()]
  .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.name.localeCompare(b.name, 'ko', { numeric: true }));
const sortedRuns = (kind) => [...state.runs.values()].filter((r) => r.kind === kind)
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

// ---------------------------------------------------------------- home

function homePage() {
  const card = (href, title, blurb, status) => `
  <a class="card hub-card" href="${href}">
    <h2>${esc(title)}</h2>
    <p class="muted small">${esc(blurb)}</p>
    ${status}
  </a>`;
  return `${homePictures()}${stickyBoard()}${tocPanel()}<div class="hub">
    ${card('#/boards', '회로 보드 검증', '메인 · HV 보드를 단계별로 확인', boardsSummary())}
    ${Object.entries(PROTO_KINDS).map(([k, K]) => card(`#/p/${k}`, K.name, K.blurb, protoSummary(k))).join('')}
    ${card('#/meetings', '미팅 자료', '미팅 슬라이드 모음', meetingsSummary())}
    ${card('#/places', '자료 지도', '자료가 어디에 있는지', placesSummary())}
  </div>`;
}

// ---- pictures at the top (home.js). 그림 편집 shows the + / move / size / edit buttons.
let homeEdit = false;
const shownHomeImages = () => homeImages(state.config.get('home')).filter((x) => state.files.has(x.file));

function homePictures() {
  if (store.kind !== 'cloud') return '';
  const list = shownHomeImages();
  const figs = list.map((im, i) => {
    const link = homeLink(im.link);
    const text = im.caption ? (link ? `<a href="${esc(link)}"${link.startsWith('https') ? ' target="_blank" rel="noopener"' : ''}>${esc(im.caption)} →</a>` : esc(im.caption)) : '';
    const tools = homeEdit ? `<span class="pic-tools">
        <button type="button" data-act="home-move" data-i="${i}" data-step="-1" aria-label="앞으로"${i === 0 ? ' disabled' : ''}>←</button>
        <button type="button" data-act="home-move" data-i="${i}" data-step="1" aria-label="뒤로"${i === list.length - 1 ? ' disabled' : ''}>→</button>
        <button type="button" data-act="home-pic" data-i="${i}">편집</button></span>` : '';
    return `<figure class="home-pic${im.wide ? ' wide' : ''}">${picture(im.file, im.caption || '홈 그림')}
      ${text || tools ? `<figcaption><span>${text}</span>${tools}</figcaption>` : ''}</figure>`;
  }).join('');
  const bar = `<div class="row home-pic-bar">
      ${homeEdit ? `<label class="btn">+ 그림<input type="file" id="home-pic-file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" multiple hidden></label>
      <span class="small muted">넓게 / 반쪽은 그림마다 편집에서 골라요.</span>` : ''}
      <span class="spacer"></span>
      <button type="button" class="link" data-act="home-edit">${homeEdit ? '다 했어요' : (list.length ? '그림 편집' : '+ 홈 그림')}</button>
    </div>`;
  return `<section class="home-pics">${figs ? `<div class="home-figs">${figs}</div>` : ''}${bar}</section>`;
}

function saveHomeImages(images) {
  commit([{ op: 'put', coll: 'config', obj: homeRecord(images, who().name) }]);
}

async function addHomePictures(files) {
  const bad = [];
  const good = [...files].filter((f) => {
    if (!isPicture(f.type)) bad.push(`${f.name}: 그림이 아니에요`);
    else if (f.size > MAX_PICTURE) bad.push(`${f.name}: ${fileSize(f.size)}`);
    else return true;
    return false;
  });
  if (bad.length) toast(`안 넣은 파일: ${bad.join(', ')}`);
  if (!good.length) return;
  if (!navigator.onLine) return toast('그림을 올리려면 인터넷 연결이 필요해요.');
  let images = homeImages(state.config.get('home'));
  for (const [n, f] of good.entries()) {
    try {
      const meta = await store.uploadFile(f, { owner: 'home', createdBy: who().name },
        (i, total) => toast(`올리는 중 ${n + 1}/${good.length} · ${Math.round((100 * i) / total)}%`));
      images = withImage(images, { file: meta.id, caption: baseName(f.name), link: '', wide: !images.length });
      saveHomeImages(images);
    } catch (err) {
      console.error(err);
      return toast(`올리지 못했어요: ${err.message}`);
    }
  }
  toast('홈에 그림을 넣었어요');
}

function homePicDialog(i) {
  const images = homeImages(state.config.get('home'));
  const im = images[i];
  if (!im) return;
  const own = state.files.get(im.file)?.owner === 'home';
  const dlg = openDialog(`
  <form method="dialog" novalidate>
    <h2>홈 그림 편집</h2>
    <div class="dlg-pic">${picture(im.file, im.caption)}</div>
    <label class="field">설명<input type="text" name="caption" value="${esc(im.caption || '')}" autocomplete="off"></label>
    <label class="field">누르면 갈 곳 (선택)<input type="text" name="link" value="${esc(im.link || '')}" autocomplete="off" placeholder="#/meetings 또는 https://…"></label>
    <label class="field">크기<select name="wide">
      <option value="1"${im.wide ? ' selected' : ''}>넓게 (한 줄 전체)</option>
      <option value=""${im.wide ? '' : ' selected'}>반쪽 (옆에 하나 더)</option></select></label>
    <div class="actions">
      <button type="button" class="danger left" data-del>홈에서 빼기</button>
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">저장</button>
    </div>
  </form>`);
  hydrateIn(dlg);
  const f = dlg.querySelector('form');
  dlg.querySelector('[data-del]').addEventListener('click', () => {
    if (!confirm(own ? '홈에서 빼고 그림 파일도 지울까요?' : '홈에서 뺄까요? 원래 항목의 그림은 그대로 있어요.')) return;
    saveHomeImages(images.filter((_, j) => j !== i));
    if (own) forgetFiles([im.file]);
    dlg.close();
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const link = f.elements.link.value.trim();
    if (link && !homeLink(link)) return toast('#/… (앱 안 화면) 또는 https://… 주소를 넣어요');
    saveHomeImages(images.map((x, j) => (j === i ? { ...x, caption: f.elements.caption.value.trim(), link, wide: !!f.elements.wide.value } : x)));
    dlg.close();
  });
}

// ---- 메모판: notes for everyone (notes.js, target 'home'), newest first.
const HOME_NOTES = 'home';
const isMine = (n) => (n.byUid && store.uid ? n.byUid === store.uid : n.by === who().name);

function stickyBoard() {
  const list = notesFor(state.notes, HOME_NOTES).reverse();
  const box = 'nt-home';
  const notes = list.map((n) => `
    <article class="sticky">
      <p>${esc(n.text)}</p>
      <footer><b>${esc(n.by || '')}</b><span>${when(n.at)}${n.editedAt ? ' · 고침' : ''}</span><span class="spacer"></span>
        ${isMine(n) ? `<button type="button" class="link" data-act="edit-sticky" data-id="${esc(n.id)}">고치기</button>` : ''}
        <button type="button" class="link" data-act="del-note" data-id="${esc(n.id)}">지우기</button></footer>
    </article>`).join('');
  return `<section class="stickies" aria-labelledby="stickies-h">
    <h2 id="stickies-h">메모판${list.length ? ` <span class="muted small">${list.length}</span>` : ''}</h2>
    <div class="sticky-grid">
      <div class="sticky sticky-new">
        <textarea id="${box}" data-note-for="${HOME_NOTES}" rows="3" maxlength="${NOTE_MAX}" placeholder="모두에게 남길 메모" aria-label="메모판에 남길 메모">${esc(noteDrafts.get(HOME_NOTES) || '')}</textarea>
        <button type="button" data-act="add-note" data-target="${HOME_NOTES}" data-box="${box}">붙이기</button>
      </div>${notes}
    </div>
  </section>`;
}

function stickyDialog(id) {
  const n = state.notes.get(id);
  if (!n || !isMine(n)) return;
  const dlg = openDialog(`
  <form method="dialog" novalidate>
    <h2>메모 고치기</h2>
    <label class="field">메모<textarea name="text" rows="5" maxlength="${NOTE_MAX}">${esc(n.text)}</textarea></label>
    <div class="actions"><button type="button" data-cancel>취소</button><button type="submit" class="primary">저장</button></div>
  </form>`);
  const f = dlg.querySelector('form');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = f.elements.text.value.trim();
    if (!text) return f.elements.text.focus();
    commit([{ op: 'put', coll: 'notes', obj: { ...n, text, editedAt: new Date().toISOString() } }]);
    dlg.close();
  });
}

// ---- 목차: the Drive folder tree (folders.js). Which folders are open is kept per device.
const OPEN_KEY = 'usbringup.toc.open';
const openFolders = new Set(readJSON(OPEN_KEY, []));
const ICON_PEN = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function folderTools(f) {
  const link = safeLink(f.drive);
  return `<button type="button" class="icon-btn" data-act="edit-folder" data-id="${esc(f.id)}" aria-label="${esc(f.name)} 메모 · 편집">${ICON_PEN}</button>`
    + (link ? `<a class="icon-btn" href="${esc(link)}" target="_blank" rel="noopener" aria-label="${esc(f.name)} Drive 폴더 열기">${ICON_LINK}</a>` : '');
}

function tocPanel() {
  const folders = state.folders;
  if (!folders.size) {
    return `<section class="panel toc"><h2>목차</h2>
      <p class="small muted">Google Drive 폴더 구조를 여기에 보여요. 폴더마다 메모와 Drive 링크를 달아요.</p>
      <div class="row"><button type="button" class="primary" data-act="seed-folders">Drive 폴더 목록 넣기</button></div></section>`;
  }
  const root = folders.get(ROOT) || { id: ROOT, name: 'Wearable Ultrasound', memo: '', drive: '' };
  const items = (parent) => childrenOf(folders, parent).map((f) => {
    const kids = childrenOf(folders, f.id).length;
    const open = kids && openFolders.has(f.id);
    const memo = sanitizeMemo(f.memo);
    return `<li>
      <div class="toc-row">
        ${kids ? `<button type="button" class="toc-caret" data-act="toc-toggle" data-id="${esc(f.id)}" aria-expanded="${open ? 'true' : 'false'}" aria-label="${esc(f.name)} ${open ? '접기' : '펼치기'}"></button>` : '<span class="toc-caret" aria-hidden="true"></span>'}
        <div class="toc-main">
          <span class="toc-name${kids ? ' has-kids' : ''}"${kids ? ` data-act="toc-toggle" data-id="${esc(f.id)}"` : ''}>${esc(f.name)}${kids && !open ? ` <span class="muted small">${kids}</span>` : ''}</span>
          ${folderTools(f)}
          ${memo ? `<span class="toc-memo">${memo}</span>` : ''}
        </div>
      </div>
      ${open ? `<ul class="toc-list">${items(f.id)}</ul>` : ''}
    </li>`;
  }).join('');
  const parents = [...folders.values()].filter((f) => f.id !== ROOT && childrenOf(folders, f.id).length);
  const allOpen = parents.length && parents.every((f) => openFolders.has(f.id));
  const rootMemo = sanitizeMemo(root.memo);
  return `<section class="panel toc">
    <div class="row toc-head"><h2>목차</h2><span class="muted small">${esc(root.name)} · Google Drive</span>${folderTools(root)}
      <span class="spacer"></span>
      ${parents.length ? `<button type="button" class="link" data-act="toc-all">${allOpen ? '모두 접기' : '모두 펴기'}</button>` : ''}
      <button type="button" data-act="add-folder">+ 폴더</button></div>
    ${rootMemo ? `<p class="toc-memo">${rootMemo}</p>` : ''}
    <ul class="toc-list top">${items(ROOT)}</ul>
  </section>`;
}

function toggleFolder(id, open = !openFolders.has(id)) {
  if (open) openFolders.add(id);
  else openFolders.delete(id);
  writeJSON(OPEN_KEY, [...openFolders]);
}

function seedFolders() {
  const now = new Date().toISOString();
  commit(SEED_FOLDERS.filter((f) => !state.folders.has(f.id))
    .map((f) => ({ op: 'put', coll: 'folders', obj: { ...f, createdAt: now, createdBy: who().name, updatedAt: now, updatedBy: who().name } })));
  toast('Drive 폴더 목록을 넣었어요. 폴더 옆 연필로 메모와 링크를 달아요.');
}

// Adds or edits a folder: name, where it sits, the memo (pick words, then a
// color) and its Drive link. The dialog is outside #app, so redraws while
// typing don't touch it.
function folderDialog(folder) {
  const editing = !!folder;
  const isRoot = folder?.id === ROOT;
  const places = placesFor(state.folders, editing ? folder.id : null);
  const parent = folder?.parent || ROOT;
  const dlg = openDialog(`
  <form method="dialog" novalidate>
    <h2>${isRoot ? 'Drive 폴더 (맨 위)' : editing ? '폴더 편집' : '폴더 추가'}</h2>
    <label class="field">이름<input type="text" name="name" value="${esc(folder?.name || '')}" required autocomplete="off" placeholder="Drive 폴더 이름 그대로"></label>
    ${isRoot ? '' : `<label class="field">위치<select name="parent">${places.map((p) => `<option value="${esc(p.id)}"${p.id === parent ? ' selected' : ''}>${'　'.repeat(p.depth)}${esc(p.name)}</option>`).join('')}</select></label>`}
    <div class="field memo-field">
      <span class="lbl" id="memo-lbl">메모</span>
      <div class="memo-tools" role="toolbar" aria-label="글자 색">
        ${MEMO_COLORS.map((c) => `<button type="button" class="swatch" data-color="${c.key}" title="${esc(c.label)}" aria-label="${esc(c.label)}"><i class="mc-${c.key || 'base'}"></i></button>`).join('')}
        <span class="small muted">글자를 끌어서 고른 뒤 색을 눌러요</span>
      </div>
      <div class="memo-edit" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="memo-lbl">${sanitizeMemo(folder?.memo)}</div>
    </div>
    <label class="field">Drive 폴더 링크<input type="url" name="drive" value="${esc(folder?.drive || '')}" autocomplete="off" placeholder="https://drive.google.com/drive/folders/…"></label>
    <div class="actions">
      ${editing && !isRoot ? '<button type="button" class="danger left" data-del>삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">저장</button>
    </div>
  </form>`);
  const f = dlg.querySelector('form');
  const editor = dlg.querySelector('.memo-edit');
  const tools = dlg.querySelector('.memo-tools');
  tools.addEventListener('mousedown', (e) => e.target.closest('.swatch') && e.preventDefault()); // keep the selection
  tools.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    const sel = getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer) || range.collapsed) return toast('먼저 메모에서 글자를 끌어서 골라요');
    const a = memoOffset(editor, range.startContainer, range.startOffset);
    const b = memoOffset(editor, range.endContainer, range.endOffset);
    editor.innerHTML = memoHtml(paintRuns(runsOf(editor), a, b, sw.dataset.color));
    const [sn, so] = memoPoint(editor, a);
    const [en, eo] = memoPoint(editor, b);
    const r = document.createRange();
    r.setStart(sn, so);
    r.setEnd(en, eo);
    sel.removeAllRanges();
    sel.addRange(r);
  });
  editor.addEventListener('paste', (e) => { // plain text only
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!document.execCommand('insertText', false, text)) editor.append(text);
  });
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    const n = descendantsOf(state.folders, folder.id).length;
    if (!confirm(`목차에서 지울까요? ${folder.name}${n ? ` (안의 폴더 ${n}개도)` : ''}. Drive 폴더는 그대로 남아요.`)) return;
    commit(deleteFolderOps(state.folders, folder.id));
    dlg.close();
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    if (!name) return f.elements.name.focus();
    const drive = f.elements.drive.value.trim();
    if (drive && !safeLink(drive)) return toast('링크는 https://로 시작해야 해요.');
    const memo = sanitizeMemo(editor.innerHTML);
    if (memoText(memo).length > MEMO_MAX) return toast(`메모는 ${MEMO_MAX}자까지예요.`);
    const now = new Date().toISOString();
    const to = isRoot ? '' : f.elements.parent.value;
    const moving = !editing || folder.parent !== to;
    commit([{ op: 'put', coll: 'folders', obj: {
      ...(folder || { id: uid(), createdAt: now, createdBy: who().name }),
      parent: to, name, memo, drive,
      order: moving && !isRoot ? nextOrder(state.folders, to) : folder.order,
      updatedAt: now, updatedBy: who().name,
    } }]);
    if (to && to !== ROOT) toggleFolder(to, true); // show where it went
    dlg.close();
  });
  if (!editing) f.elements.name.focus();
}

function meetingsSummary() {
  if (store.kind !== 'cloud') return '<p class="hub-status">로그인하면 보여요</p>';
  const list = sortedMeetings();
  if (!list.length) return '<p class="hub-status">아직 없음</p>';
  return `<ul class="hub-list">${list.slice(0, 4).map((m) => `<li><b>${esc(m.date)}</b><span>${esc(m.title)}</span></li>`).join('')}${more(list.length)}</ul>`;
}

function placesSummary() {
  const n = state.places.size;
  if (!n) return '<p class="hub-status">아직 비어 있어요</p>';
  const groups = [...new Set(sortedPlaces().map((p) => p.group || '기타'))];
  return `<p class="hub-status">${n}곳 · ${esc(groups.join(', '))}</p>`;
}

const more = (n) => (n > 4 ? `<li class="muted">외 ${n - 4}개</li>` : '');

function boardsSummary() {
  const list = sortedBoards();
  if (!list.length) return '<p class="hub-status">등록한 보드 없음</p>';
  return `<ul class="hub-list">${list.slice(0, 4).map((b) => {
    const p = boardProgress(b, state.results);
    return `<li><b>${esc(b.name)}</b><span>${p.next ? `${p.next.stage.shown}. ${esc(p.next.stage.title)}` : '끝'}</span></li>`;
  }).join('')}${more(list.length)}</ul>`;
}

function protoSummary(kind) {
  const protocol = protocolOf(state.protocols, kind);
  const n = stepCount(protocol);
  if (!n) return '<p class="hub-status">아직 단계를 안 적었어요</p>';
  const runs = sortedRuns(kind);
  if (!runs.length) return `<p class="hub-status">단계 ${n}개 · 아직 ${PROTO_KINDS[kind].item} 없음</p>`;
  return `<ul class="hub-list">${runs.slice(0, 4).map((run) => {
    const p = runProgress(run, protocol, state.results);
    return `<li><b>${esc(run.name)}</b><span class="num">${p.done}/${p.total}${p.fail ? ` · 문제 ${p.fail}` : ''}</span></li>`;
  }).join('')}${more(runs.length)}</ul>`;
}

// ---------------------------------------------------------------- boards

function boardsPage() {
  const list = sortedBoards();
  const has = (k) => list.some((b) => b.kind === k);
  const canPair = has('main') && has('hv');
  const add = `<div class="row">
    <button type="button" class="primary" data-act="add-board" data-kind="main">+ 메인 보드</button>
    <button type="button" class="primary" data-act="add-board" data-kind="hv">+ HV 보드</button>
    <button type="button" data-act="add-system"${canPair ? '' : ' disabled'}>+ 연결 테스트</button>
  </div>`;
  const head = `<div class="page-head">
    ${back('#/', '홈')}
    <div class="row"><h1>회로 보드 검증</h1><span class="spacer"></span><a class="btn" href="#/guide">보드 지도 · 표</a></div>
  </div>`;
  if (!list.length) {
    return `${head}
    <div class="empty">
      <h2>납땜이 끝난 보드를 등록하세요</h2>
      <p>보드마다 체크리스트가 생겨요. 메인과 HV를 각각 확인한 다음, 둘을 묶어 연결 테스트를 해요.</p>
      ${add}
    </div>`;
  }
  const groups = ORDER.map((k) => {
    const g = list.filter((b) => b.kind === k);
    if (!g.length) return '';
    return `<section class="kind-group"><h2>${esc(KINDS[k].name)}</h2><div class="cards">${g.map(boardCard).join('')}</div></section>`;
  }).join('');
  const hint = canPair ? '' : '<p class="muted small">연결 테스트는 메인과 HV 보드가 하나씩 있으면 만들 수 있어요.</p>';
  return `${head}<div class="stack">${add}${hint}</div>${groups}`;
}

const pairName = (b) => `${state.boards.get(b.mainId)?.name || '메인 ?'} + ${state.boards.get(b.hvId)?.name || 'HV ?'}`;

function boardCard(b) {
  const p = boardProgress(b, state.results);
  const pair = b.kind === 'system' && b.name !== pairName(b) ? `<div class="meta">${esc(pairName(b))}</div>` : '';
  const flag = over50(b, state.boards, state.results).length ? '<span class="chip fail">50 V 초과</span>' : '';
  return `
  <a class="card" href="#/b/${encodeURIComponent(b.id)}">
    <div class="card-top"><h3>${esc(b.name)}</h3>${flag}</div>
    ${pair}
    ${progressBar(p)}
    <div class="meta">${p.next ? `다음: <b>${p.next.stage.shown}. ${esc(p.next.stage.title)}</b>` : '모든 단계 끝'}</div>
    ${p.last ? `<div class="meta">${esc(p.last.by)} · ${when(p.last.at)}</div>` : ''}
  </a>`;
}

// ---------------------------------------------------------------- one board

function boardPage(r) {
  const b = state.boards.get(r.targetId);
  if (!b) return notFound('#/boards', '회로 보드 검증');
  const stages = stagesFor(b.kind);
  const progress = stages.map((s) => stageProgress(b, s, state.results));
  let idx = stages.findIndex((s) => s.n === r.stage);
  if (idx < 0) {
    idx = progress.findIndex((p) => p.done < p.total);
    if (idx < 0) idx = 0;
  }
  const stage = stages[idx];
  const href = (s) => `#/b/${encodeURIComponent(b.id)}/${s.n}`;
  const pair = b.kind === 'system'
    ? `<p class="muted small">${['mainId', 'hvId'].map((k) => {
      const x = state.boards.get(b[k]);
      return x ? `<a href="#/b/${encodeURIComponent(x.id)}">${esc(x.name)}</a>` : (k === 'mainId' ? '메인 보드 없음' : 'HV 보드 없음');
    }).join(' + ')}</p>` : '';
  const flags = over50(b, state.boards, state.results);
  const flagBanner = flags.length
    ? `<div class="banner warn"><b>HV가 50 V를 넘었어요</b>
      <p>실측 ${flags.map((f) => `${f.value < 0 ? '−' : '+'}${Math.abs(f.value).toFixed(1)} V`).join(', ')}. 어레이 FFC 커넥터 정격이 50 V라서 어레이 연결 전에 정해야 해요.</p></div>` : '';
  const tabs = stages.map((s, i) => {
    const p = progress[i];
    const cls = p.fail ? 'fail' : p.done === p.total ? 'done' : '';
    return `<a href="${href(s)}"${i === idx ? ' aria-current="true"' : ''}>
      <span class="n">${s.shown}</span><span class="t">${esc(s.title)}</span>
      <span class="p ${cls} num">${p.done}/${p.total}${p.fail ? ` · 문제 ${p.fail}` : ''}</span></a>`;
  }).join('');
  const prev = stages[idx - 1];
  const next = stages[idx + 1];
  const navBtns = `<div class="row">
    ${prev ? `<a class="btn" href="${href(prev)}">← ${prev.shown}. ${esc(prev.title)}</a>` : ''}
    <span class="spacer"></span>
    ${next ? `<a class="btn" href="${href(next)}">${next.shown}. ${esc(next.title)} →</a>` : ''}
  </div>`;
  return `
  <div class="page-head">
    ${back('#/boards', '회로 보드 검증')}
    <div class="row"><h1>${esc(b.name)}</h1><span class="chip">${esc(KINDS[b.kind].name)}</span><span class="spacer"></span><button type="button" data-act="edit-board">편집</button></div>
    ${pair}
    ${b.notes ? `<p class="muted">${esc(b.notes)}</p>` : ''}
  </div>
  ${flagBanner}
  <nav class="stage-tabs" aria-label="단계">${tabs}</nav>
  ${stageSection(b, stage)}
  ${navBtns}`;
}

function stageSection(b, s) {
  const gate = earlierUnfinished(b, s.n, state.boards, state.results);
  const gateBanner = gate.length
    ? `<div class="banner warn"><b>앞 단계가 아직 안 끝났어요</b>
      <p>${gate.map((g) => `${g.label ? `${esc(g.board.name)} ` : ''}${g.stage.shown}. ${esc(g.stage.title)} (${g.done}/${g.total}${g.fail ? `, 문제 ${g.fail}` : ''})`).join(' · ')}</p>
      ${s.n >= 2 ? '<p class="small">전압은 앞 단계가 다 통과했을 때만 올려요.</p>' : ''}</div>` : '';
  const setup = s.setup ? `<div class="setup"><span class="lbl">준비</span><div class="chips">${s.setup.map(([c, t]) => `<span class="chip ${c}">${esc(t)}</span>`).join('')}</div></div>` : '';
  const notes = (s.notes || []).map((n) => `<div class="note ${n.tone}"><span class="tag">${esc(n.tag)}</span><p>${esc(n.text)}</p></div>`).join('');
  let html = '';
  let group = null;
  let open = false;
  for (const st of s.steps) {
    if (st.group !== group || !open) {
      if (open) html += '</div>';
      group = st.group;
      if (group) html += `<h3 class="group-title">${esc(group)}</h3>`;
      html += '<div class="steps">';
      open = true;
    }
    html += checkRow({
      id: st.id, no: st.no, title: st.do, sub: st.pass, subLabel: st.rec ? '기록' : '기준', subTone: st.rec ? 'rec' : '',
      field: st.spec || st.rec ? { placeholder: st.spec ? '측정값' : '기록', unit: st.spec?.unit } : null,
      judgeStep: st.spec ? st : null, result: resultOf(state.results, b.id, st.id) || {}, labels: BOARD_LABELS,
    });
  }
  if (open) html += '</div>';
  return `
  <section class="stack" aria-labelledby="stage-title">
    <div class="stage-head"><span class="num-label">단계 ${s.shown}</span><h2 id="stage-title">${esc(s.title)}</h2><span class="meta">${esc(s.meta)}</span></div>
    ${gateBanner}
    ${s.intro ? `<p>${esc(s.intro)}</p>` : ''}
    ${setup}
    ${notes}
    ${html}
  </section>`;
}

// One line of a checklist, for a board step or a run step.
function checkRow({ id, no, title, sub, subLabel = '', subTone = '', field, judgeStep, result: r, labels, removed }) {
  const vid = `v-${id}`;
  const nid = `n-${id}`;
  const value = drafts.has(vid) ? drafts.get(vid) : r.value || '';
  const note = drafts.has(nid) ? drafts.get(nid) : r.note || '';
  const status = r.status || '';
  const seg = Object.entries(labels)
    .map(([s, label]) => `<button type="button" data-step="${esc(id)}" data-s="${s}" aria-pressed="${status === s}">${label}</button>`).join('');
  const valueField = field
    ? `<div class="val"><input type="text" id="${esc(vid)}" data-step="${esc(id)}" data-field="value" value="${esc(value)}" placeholder="${field.placeholder}" autocomplete="off" aria-label="${esc(no)} ${field.placeholder}">${field.unit ? `<span class="unit">${esc(field.unit)}</span>` : ''}${judgeStep ? `<span class="judge-slot" id="j-${esc(id)}">${judgeBadge(judgeStep, value)}</span>` : ''}</div>`
    : '';
  return `
  <div class="step${status ? ` s-${status}` : ''}" id="row-${esc(id)}">
    <div class="no">${esc(no)}</div>
    <div class="what">
      <div class="do">${title ? esc(title) : '<span class="muted">(제목 없음)</span>'}${removed ? ' <span class="chip off">프로토콜에서 뺀 단계</span>' : ''}</div>
      ${sub ? `<div class="crit">${subLabel ? `<b class="${subTone}">${subLabel}</b>` : ''}${esc(sub)}</div>` : ''}
    </div>
    <div class="ctl">
      ${valueField}
      <div class="seg" role="group" aria-label="${esc(no)} 결과">${seg}</div>
      <input type="text" class="note-in" id="${esc(nid)}" data-step="${esc(id)}" data-field="note" value="${esc(note)}" placeholder="메모" autocomplete="off" aria-label="${esc(no)} 메모">
      ${r.at ? `<div class="who">${esc(r.by)} · ${when(r.at)}</div>` : ''}
    </div>
  </div>`;
}

function judgeBadge(st, value) {
  const j = judge(st.spec, value);
  const tip = ` title="기준 ${esc(describeSpec(st.spec))}"`;
  if (j.state === 'ok') return `<span class="judge ok"${tip}>범위 안</span>`;
  if (j.state === 'out') return `<span class="judge out"${tip}>범위 밖</span>`;
  return '';
}

// ---------------------------------------------------------------- guide

function guidePage() {
  const links = [['g-rules', '꼭 지킬 것'], ['g-map', '보드 지도'], ['g-power', '전원 순서'], ['g-trouble', '문제 생기면'], ['g-open', '남은 문제']];
  return `
  <div class="page-head">
    ${back('#/boards', '회로 보드 검증')}
    <h1>보드 지도 · 표</h1>
    <p class="lede">측정 위치를 찾을 때 보세요. 체크리스트는 보드 화면에 있어요.</p>
  </div>
  <nav class="guide-nav">${links.map(([id, t]) => `<a href="#/guide" data-scroll="${id}">${t}</a>`).join('')}</nav>
  <div class="guide">${GUIDE_HTML}</div>`;
}

// ---------------------------------------------------------------- array / phantom

function protoPage(kind) {
  const K = PROTO_KINDS[kind];
  const protocol = protocolOf(state.protocols, kind);
  const n = stepCount(protocol);
  const runs = sortedRuns(kind);
  const addBtn = `<button type="button" class="primary" data-act="add-run">+ 새 ${K.item}</button>`;
  const head = `<div class="page-head">
    ${back('#/', '홈')}
    <div class="row"><h1>${K.name}</h1><span class="spacer"></span>${kind === 'array' ? '<a class="btn" href="#/p/array/designs">설계 파일</a>' : ''}<a class="btn" href="#/p/${kind}/edit">단계 편집</a>${n ? addBtn : ''}</div>
    ${n ? `<p class="muted small">프로토콜 단계 ${n}개${protocol.updatedAt ? ` · ${esc(protocol.updatedBy || '')} ${when(protocol.updatedAt)} 수정` : ''}</p>` : ''}
  </div>`;
  if (!n) {
    return `${head}
    <div class="empty">
      <h2>아직 단계가 없어요</h2>
      <p>먼저 프로토콜 단계를 적어 주세요. 적은 단계는 둘 다 보고 고칠 수 있어요.</p>
      <a class="btn primary" href="#/p/${kind}/edit">단계 적기</a>
    </div>`;
  }
  if (!runs.length) {
    return `${head}
    <div class="empty">
      <h2>아직 ${K.item} 없음</h2>
      <p>새 ${K.itemObj} 추가하면 이 단계들로 체크리스트가 생겨요.</p>
      ${addBtn}
    </div>`;
  }
  return `${head}<div class="cards">${runs.map((run) => runCard(run, protocol)).join('')}</div>`;
}

function runCard(run, protocol) {
  const p = runProgress(run, protocol, state.results);
  return `
  <a class="card" href="#/r/${encodeURIComponent(run.id)}">
    <div class="card-top"><h3>${esc(run.name)}</h3>${run.date ? `<span class="chip">${esc(run.date)}</span>` : ''}</div>
    ${progressBar(p)}
    <div class="meta">${p.next ? `다음: <b>${esc(p.next.no)}. ${p.next.title ? esc(p.next.title) : '(제목 없음)'}</b>` : '모든 단계 끝'}</div>
    ${p.last ? `<div class="meta">${esc(p.last.by)} · ${when(p.last.at)}</div>` : ''}
  </a>`;
}

function runPage(r) {
  const run = state.runs.get(r.targetId);
  if (!run) return notFound('#/', '홈');
  const K = PROTO_KINDS[run.kind];
  const protocol = protocolOf(state.protocols, run.kind);
  const rows = runSteps(protocol, run, state.results);
  let html = '';
  let open = false;
  for (const s of rows) {
    if (s.type === 'section') {
      if (open) html += '</div>';
      open = false;
      html += `<h3 class="group-title">${s.title ? esc(s.title) : '(소제목 없음)'}</h3>`;
      continue;
    }
    if (!open) html += '<div class="steps">';
    open = true;
    html += checkRow({
      id: s.id, no: s.no, title: s.title, sub: s.detail, field: s.value ? { placeholder: '값', unit: s.unit } : null,
      result: resultOf(state.results, run.id, s.id) || {}, labels: RUN_LABELS, removed: s.removed,
    });
  }
  if (open) html += '</div>';
  const body = rows.some((s) => s.type === 'step')
    ? `<section class="stack">${html}</section><p class="small"><a href="#/p/${run.kind}/edit">단계 편집</a></p>`
    : `<div class="empty"><h2>프로토콜에 단계가 없어요</h2><a class="btn primary" href="#/p/${run.kind}/edit">단계 적기</a></div>`;
  return `
  <div class="page-head">
    ${back(`#/p/${run.kind}`, K.name)}
    <div class="row"><h1>${esc(run.name)}</h1>${run.date ? `<span class="chip">${esc(run.date)}</span>` : ''}<span class="spacer"></span><button type="button" data-act="edit-run">편집</button></div>
    ${run.notes ? `<p class="muted">${esc(run.notes)}</p>` : ''}
    ${progressBar(runProgress(run, protocol, state.results))}
  </div>
  ${body}`;
}

// ---------------------------------------------------------------- preview pictures (Firestore)

const fileUrls = new Map(); // file id → object URL of a picture already loaded
const fileLoads = new Map(); // file id → its loading promise
const loadQueue = [];
let loadsRunning = 0;

function pictureUrl(id) {
  if (fileUrls.has(id)) return Promise.resolve(fileUrls.get(id));
  if (!fileLoads.has(id)) {
    fileLoads.set(id, new Promise((resolve, reject) => {
      loadQueue.push(() => store.readFile(id).then((blob) => {
        const url = URL.createObjectURL(blob);
        fileUrls.set(id, url);
        resolve(url);
      }, (err) => {
        fileLoads.delete(id);
        reject(err);
      }));
      pumpLoads();
    }));
  }
  return fileLoads.get(id);
}

function pumpLoads() {
  while (loadsRunning < 3 && loadQueue.length) {
    loadsRunning++;
    loadQueue.shift()().finally(() => {
      loadsRunning--;
      pumpLoads();
    });
  }
}

// A picture from Firestore: filled in after render from the cache or once loaded.
function picture(file, alt) {
  const url = fileUrls.get(file);
  return `<a class="fig-link" data-src-file="${esc(file)}" target="_blank" rel="noopener"${url ? ` href="${url}"` : ''}>`
    + `<img data-src-file="${esc(file)}"${url ? ` src="${url}"` : ''} alt="${esc(alt)}" decoding="async"></a>`;
}

function hydrateFiles() {
  hydrateIn(app);
}

function hydrateIn(root) {
  if (store.kind !== 'cloud') return;
  for (const el of root.querySelectorAll('[data-src-file]')) {
    const id = el.dataset.srcFile;
    const set = (url) => (el.tagName === 'IMG' ? el.setAttribute('src', url) : el.setAttribute('href', url));
    if (fileUrls.has(id)) set(fileUrls.get(id));
    else pictureUrl(id).then(set, () => el.classList.add('missing'));
  }
}

function forgetFiles(ids) {
  for (const id of ids) {
    store.deleteFile(id).catch((err) => console.error(err));
    if (fileUrls.has(id)) URL.revokeObjectURL(fileUrls.get(id));
    fileUrls.delete(id);
    fileLoads.delete(id);
  }
  const images = homeImages(state.config.get('home'));
  if (images.some((x) => ids.includes(x.file))) saveHomeImages(images.filter((x) => !ids.includes(x.file)));
}

const pictureIdsOf = (item) => (item.images || []).map((x) => x.file);
const safeLink = (u) => (/^https:\/\//.test(u || '') ? u : '');
const contentLines = (item) => String(item.contents || '').split('\n').map((x) => x.trim()).filter(Boolean);

// What a meeting or a design version holds: pictures, the Drive folder and
// other links, and the list of files in that folder.
function itemBody(item, coll) {
  const onHome = new Set(homeImages(state.config.get('home')).map((x) => x.file));
  const pics = (item.images || []).map((im) => `
    <figure>
      ${picture(im.file, im.caption || item.title)}
      <figcaption><span>${esc(im.caption || '')}</span>${onHome.has(im.file)
    ? '<span class="chip ok">홈 화면 그림</span>'
    : `<button type="button" class="link" data-act="set-home" data-file="${esc(im.file)}" data-coll="${coll}" data-id="${esc(item.id)}">홈에 표시</button>`}</figcaption>
    </figure>`).join('');
  const links = [
    safeLink(item.drive) && { url: item.drive, label: 'Drive 폴더' },
    ...(item.links || []).filter((l) => safeLink(l.url)),
  ].filter(Boolean);
  const lines = contentLines(item);
  const contents = lines.map((l) => {
    const [name, ...rest] = l.split(' — ');
    return `<li><span class="mono">${esc(name)}</span>${rest.length ? `<span class="muted">${esc(rest.join(' — '))}</span>` : ''}</li>`;
  }).join('');
  return `
    ${pics ? `<div class="figs">${pics}</div>` : ''}
    ${links.length ? `<div class="row">${links.map((l, i) => `<a class="btn${i === 0 ? ' primary' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || '링크')}</a>`).join('')}</div>` : ''}
    ${lines.length && !safeLink(item.drive) ? '<p class="small warn-t">Drive 폴더 링크가 아직 없어요 · 편집에서 붙여 주세요</p>' : ''}
    ${contents ? `<details class="contents"><summary>Drive 폴더 안 파일 ${lines.length}개</summary><ul class="files">${contents}</ul></details>` : ''}`;
}

// ---------------------------------------------------------------- notes on an item

const noteDrafts = new Map(); // item target → text typed in its note box, kept across redraws

function notesBlock(coll, item) {
  const target = targetOf(coll, item.id);
  const list = notesFor(state.notes, target);
  const boxId = `nt-${coll}-${item.id}`;
  return `
    <div class="notes">
      <h3 class="notes-title">메모${list.length ? ` <span class="muted">${list.length}</span>` : ''}</h3>
      ${list.map((n) => `
      <div class="note-item">
        <p>${esc(n.text)}</p>
        <div class="note-meta"><span>${esc(n.by || '')} · ${when(n.at)}</span><button type="button" class="link" data-act="del-note" data-id="${esc(n.id)}">지우기</button></div>
      </div>`).join('')}
      <div class="note-add">
        <textarea id="${esc(boxId)}" data-note-for="${esc(target)}" rows="2" maxlength="${NOTE_MAX}" placeholder="메모 남기기" aria-label="${esc(item.title || '')} 메모">${esc(noteDrafts.get(target) || '')}</textarea>
        <button type="button" data-act="add-note" data-target="${esc(target)}" data-box="${esc(boxId)}">추가</button>
      </div>
    </div>`;
}

function addNote(target, boxId) {
  const box = document.getElementById(boxId);
  const note = newNote(target, box ? box.value : noteDrafts.get(target), who());
  if (!note) {
    box?.focus();
    return toast('메모를 적어 주세요');
  }
  // Clear the draft first: the store redraws as soon as the note is in.
  noteDrafts.delete(target);
  if (box) {
    box.value = '';
    box.blur();
  }
  commit([{ op: 'put', coll: 'notes', obj: note }]);
}

function deleteNote(id) {
  const n = state.notes.get(id);
  if (!n || !confirm(`이 메모를 지울까요?\n${n.text.slice(0, 80)}`)) return;
  commit([{ op: 'remove', coll: 'notes', id }]);
}

function needsLogin(what) {
  return `<div class="empty"><h2>로그인하면 보여요</h2><p>${what} Firebase에 있어서, 이 기기에만 쓰는 모드에서는 안 보여요.</p>
    ${firebaseConfig ? '<button type="button" data-act="use-cloud">로그인해서 같이 쓰기</button>' : ''}</div>`;
}

function legacyHint() {
  const p = legacyPending(state);
  if (!p.designs.length && !p.meetings.length) return '';
  return '<div class="banner info"><b>사이트에 있던 자료가 아직 안 옮겨졌어요</b><p><a href="#/settings">설정 → 자료 옮기기</a>에서 한 번 옮겨 주세요.</p></div>';
}

const sortedMeetings = () => [...state.meetings.values()]
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
const sortedDesigns = () => [...state.designs.values()]
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.title || '').localeCompare(a.title || '', 'ko', { numeric: true }));

// ---------------------------------------------------------------- array design versions

function designsPage() {
  const cloudOn = store.kind === 'cloud';
  const head = `<div class="page-head">
    ${back('#/p/array', PROTO_KINDS.array.name)}
    <div class="row"><h1>어레이 설계</h1><span class="spacer"></span>${cloudOn ? '<button type="button" class="primary" data-act="add-design">+ 버전 추가</button>' : ''}</div>
    <p class="lede">버전마다 미리보기 그림과 Drive 폴더. 파일은 Drive에 있어요.</p>
  </div>`;
  if (!cloudOn) return head + needsLogin('설계 버전은');
  const list = sortedDesigns();
  const versions = list.map((d) => `
  <section class="panel design" id="design-${esc(d.id)}">
    <div class="row"><h2>${esc(d.title)}</h2>${d.date ? `<span class="chip">${esc(d.date)}</span>` : ''}<span class="spacer"></span><button type="button" data-act="edit-design" data-id="${esc(d.id)}">편집</button></div>
    ${(d.points || []).length ? `<ul class="small">${d.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${itemBody(d, 'designs')}
    ${notesBlock('designs', d)}
  </section>`).join('');
  const nav = list.length > 1 ? `<nav class="guide-nav">${list.map((d) => `<a href="#/p/array/designs" data-scroll="design-${esc(d.id)}">${esc(d.title)}</a>`).join('')}</nav>` : '';
  return `${head}${legacyHint()}${nav}${versions || '<div class="empty"><h2>아직 설계 버전이 없어요</h2><p>+ 버전 추가로 그림과 Drive 링크를 넣어요.</p></div>'}`;
}

// ---------------------------------------------------------------- meeting slides

function meetingsPage() {
  const cloudOn = store.kind === 'cloud';
  const head = `<div class="page-head">
    ${back('#/', '홈')}
    <div class="row"><h1>미팅 자료</h1><span class="spacer"></span>${cloudOn ? '<button type="button" class="primary" data-act="add-meeting">+ 미팅 추가</button>' : ''}</div>
    <p class="lede">미팅마다 그림, 슬라이드 링크, Drive 폴더. 파일은 Drive에 있어요.</p>
  </div>`;
  if (!cloudOn) return head + needsLogin('미팅 자료는');
  const items = sortedMeetings().map((m) => `
  <section class="panel meeting" id="meeting-${esc(m.id)}">
    <div class="row"><h2>${esc(m.title)}</h2>${m.date ? `<span class="chip">${esc(m.date)}</span>` : ''}<span class="spacer"></span><button type="button" data-act="edit-meeting" data-id="${esc(m.id)}">편집</button></div>
    ${m.sub ? `<p class="muted small">${esc(m.sub)}</p>` : ''}
    ${itemBody(m, 'meetings')}
    ${notesBlock('meetings', m)}
  </section>`).join('');
  return `${head}${legacyHint()}${items || '<div class="empty"><h2>아직 미팅 자료가 없어요</h2><p>+ 미팅 추가로 그림과 링크를 넣어요.</p></div>'}`;
}

// ---------------------------------------------------------------- 자료 지도: where everything is

const sortedPlaces = () => {
  const list = [...state.places.values()];
  const groups = [...new Set([...PLACE_GROUPS, ...list.map((p) => p.group || '기타')])];
  return list.sort((a, b) => groups.indexOf(a.group || '기타') - groups.indexOf(b.group || '기타') || (a.order || 0) - (b.order || 0));
};

function placesPage() {
  const list = sortedPlaces();
  const head = `<div class="page-head">
    ${back('#/', '홈')}
    <div class="row"><h1>자료 지도</h1><span class="spacer"></span><button type="button" class="primary" data-act="add-place">+ 장소 추가</button></div>
    <p class="lede">자료가 어디에 있는지 한눈에. 주소는 누르면 열리고, PC 경로는 복사돼요.</p>
  </div>`;
  if (!list.length) {
    return `${head}<div class="empty"><h2>아직 비어 있어요</h2><p>Drive, Notion, PC 폴더, GitHub, Firebase 같은 기본 목록부터 넣을 수 있어요.</p>
      <button type="button" class="primary" data-act="seed-places">기본 목록 넣기</button></div>`;
  }
  let html = '';
  let group = null;
  for (const p of list) {
    if ((p.group || '기타') !== group) {
      if (group !== null) html += '</div></section>';
      group = p.group || '기타';
      html += `<section class="stack"><h2 class="group-title">${esc(group)}</h2><div class="places">`;
    }
    const link = safeLink(p.where);
    const where = link
      ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(link.replace(/^https:\/\//, ''))}</a>`
      : p.where ? `<button type="button" class="link mono" data-act="copy-path" data-path="${esc(p.where)}" title="복사">${esc(p.where)}</button>` : '<span class="warn-t">아직 비어 있어요 · 편집에서 넣어 주세요</span>';
    html += `
      <div class="place">
        <div class="row"><b>${esc(p.label)}</b><span class="spacer"></span><button type="button" class="link" data-act="edit-place" data-id="${esc(p.id)}">편집</button></div>
        <div class="where">${where}</div>
        ${p.note ? `<p class="small muted">${esc(p.note)}</p>` : ''}
      </div>`;
  }
  html += '</div></section>';
  return head + html;
}

// ---------------------------------------------------------------- step editor

function editPage(kind) {
  const K = PROTO_KINDS[kind];
  if (!protoEdit || protoEdit.kind !== kind) protoEdit = { kind, steps: structuredClone(protocolOf(state.protocols, kind).steps) };
  const shown = protoEdit.steps.filter((s) => !s.removed);
  let n = 0;
  const rows = shown.map((s, i) => editRow(s, s.type === 'step' ? ++n : null, i === 0, i === shown.length - 1)).join('');
  return `
  <div class="page-head">
    ${back(`#/p/${kind}`, K.name)}
    <h1>${K.name} · 단계 편집</h1>
    <p class="muted small">적는 대로 저장돼요. 고친 단계는 모든 ${K.item}에 바로 보여요.</p>
  </div>
  ${shown.length ? `<div class="pe-list">${rows}</div>` : '<p class="muted">아래 버튼으로 첫 단계를 추가하세요. 소제목으로 단계를 묶을 수 있어요.</p>'}
  <div class="row">
    <button type="button" class="primary" data-act="pe-add" data-type="step">+ 단계</button>
    <button type="button" data-act="pe-add" data-type="section">+ 소제목</button>
    <span class="spacer"></span>
    <a class="btn" href="#/p/${kind}">다 적었어요</a>
  </div>`;
}

function editRow(s, no, first, last) {
  const id = esc(s.id);
  const tools = `<div class="pe-tools">
    <button type="button" data-act="pe-move" data-dir="-1" data-id="${id}"${first ? ' disabled' : ''} aria-label="위로">↑</button>
    <button type="button" data-act="pe-move" data-dir="1" data-id="${id}"${last ? ' disabled' : ''} aria-label="아래로">↓</button>
    <button type="button" data-act="pe-del" data-id="${id}">삭제</button>
  </div>`;
  if (s.type === 'section') {
    return `<div class="pe-row section" id="pe-${id}"><span class="no">소제목</span>
      <div class="pe-fields"><input type="text" id="pt-${id}" data-pe="title" data-id="${id}" value="${esc(s.title)}" placeholder="소제목" autocomplete="off"></div>
      ${tools}</div>`;
  }
  return `<div class="pe-row" id="pe-${id}"><span class="no">${no}</span>
    <div class="pe-fields">
      <input type="text" id="pt-${id}" data-pe="title" data-id="${id}" value="${esc(s.title)}" placeholder="할 일" autocomplete="off">
      <input type="text" id="pd-${id}" data-pe="detail" data-id="${id}" value="${esc(s.detail)}" placeholder="조건 · 기준 (선택)" autocomplete="off" class="small-in">
      <div class="row pe-val">
        <label class="check"><input type="checkbox" id="pv-${id}" data-pe="value" data-id="${id}"${s.value ? ' checked' : ''}> 값 적는 칸</label>
        ${s.value ? `<input type="text" id="pu-${id}" data-pe="unit" data-id="${id}" value="${esc(s.unit)}" placeholder="단위 (선택)" autocomplete="off" class="small-in unit-in">` : ''}
      </div>
    </div>
    ${tools}</div>`;
}

function editField(id, field, value) {
  protoEdit.steps = protoEdit.steps.map((s) => (s.id === id ? { ...s, [field]: value } : s));
}

function saveProto() {
  clearTimeout(protoTimer);
  protoTimer = null;
  if (!protoEdit) return;
  const current = protocolOf(state.protocols, protoEdit.kind);
  if (JSON.stringify(current.steps) === JSON.stringify(protoEdit.steps)) return;
  commit([protocolPut(current, protoEdit.steps, who())]);
}

function editAction(act, el) {
  const id = el.dataset.id;
  if (act === 'pe-add') {
    const s = newProtoStep(el.dataset.type);
    protoEdit.steps = [...protoEdit.steps, s];
    saveProto();
    render();
    document.getElementById(`pt-${s.id}`)?.focus();
  } else if (act === 'pe-move') {
    protoEdit.steps = moveStep(protoEdit.steps, id, Number(el.dataset.dir));
    saveProto();
    render();
  } else if (act === 'pe-del') {
    const s = protoEdit.steps.find((x) => x.id === id);
    if (!s) return;
    const recorded = stepHasResults(id, state.results);
    const ask = recorded ? '이 단계를 뺄까요? 이미 적은 기록은 그 체크리스트에 남아요.' : s.title.trim() ? `이 단계를 지울까요?\n${s.title.trim()}` : '';
    if (ask && !confirm(ask)) return;
    protoEdit.steps = removeStep(protoEdit.steps, id, state.results);
    saveProto();
    render();
  }
}

// ---------------------------------------------------------------- settings

function settingsPage() {
  const isCloud = store.kind === 'cloud';
  const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bringup/{project}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid in ['${isCloud ? store.uid : '내 UID'}', '상대방 UID'];
    }
  }
}`;
  const account = isCloud
    ? `<dl class="kv">
        <dt>계정</dt><dd>${esc(store.email)}</dd>
        <dt>UID</dt><dd><code>${esc(store.uid)}</code></dd>
      </dl>
      <div class="row"><button type="button" data-act="copy-uid">UID 복사</button><button type="button" data-act="sign-out">로그아웃</button></div>
      <h3>같이 쓰기</h3>
      <p class="small">Firestore 규칙에 두 사람의 UID가 있어야 같은 기록을 봐요. 둘 다 로그인해서 UID를 확인한 뒤, 아래 규칙을 Firebase 콘솔 → Firestore → 규칙에 붙여 넣고 '상대방 UID'를 바꿔 게시하세요.</p>
      <pre class="rules" id="rules-text">${esc(rules)}</pre>
      <div class="row"><button type="button" data-act="copy-rules">규칙 복사</button></div>`
    : `<p>지금은 <b>이 기기에만</b> 저장돼요.</p>
      <div class="row">${firebaseConfig ? '<button type="button" data-act="use-cloud">로그인해서 같이 쓰기</button>' : ''}</div>`;
  return `
  <div class="page-head">${back('#/', '홈')}<h1>설정</h1></div>
  <section class="panel">
    <h2>내 이름</h2>
    <label class="field">기록 옆에 남는 이름<input type="text" id="set-name" value="${esc(settings.name)}" autocomplete="off" placeholder="예: 미도"></label>
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
    <p class="small">CSV는 엑셀용 결과표, JSON은 이 앱으로 되돌릴 수 있는 백업이에요. 백업을 불러오면 같은 항목만 바뀌어요.</p>
    <div class="row">
      <button type="button" data-act="export-csv">결과표 (.csv)</button>
      <button type="button" data-act="export-json">백업 (.json)</button>
      <button type="button" data-act="import-json">백업 불러오기</button>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
    </div>
  </section>
  <section class="panel">
    <h2>정보</h2>
    <dl class="kv"><dt>버전</dt><dd class="mono">${VERSION}</dd></dl>
  </section>
  ${isCloud ? importPanel() : ''}`;
}

// The one-time move of the files the site used to serve (legacy-import.js).
let importing = false;
let importStatus = '';

function importPanel() {
  const p = legacyPending(state);
  const left = p.designs.length + p.meetings.length;
  if (!left && !p.home && !importStatus) return '';
  return `
  <section class="panel">
    <h2>자료 옮기기</h2>
    ${left || p.home
    ? `<p class="small">사이트에 있던 설계 버전 ${p.designs.length}개와 미팅 ${p.meetings.length}개를 앱 기록으로 옮겨요. 미리보기 그림은 Firebase로, 나머지 파일은 각 항목에 "Drive 폴더 안 파일" 목록으로 남아요. 한 번만 하면 돼요.</p>
      <div class="row"><button type="button" class="primary" data-act="run-import"${importing ? ' disabled' : ''}>옮기기</button></div>`
    : '<p class="small">다 옮겼어요. 파일을 Drive에 올리고, 항목마다 편집 → Drive 폴더 링크를 붙여 주세요.</p>'}
    <p class="small" id="import-status" role="status">${esc(importStatus)}</p>
  </section>`;
}

function sayImport(text) {
  importStatus = text;
  const el = document.getElementById('import-status');
  if (el) el.textContent = text;
}

async function startImport() {
  if (importing) return;
  if (!navigator.onLine) return toast('인터넷 연결이 필요해요.');
  importing = true;
  sayImport('시작하는 중…');
  render();
  try {
    const done = await runImport(store, state, who(), sayImport);
    sayImport(`다 옮겼어요: 설계 ${done.designs.length}개, 미팅 ${done.meetings.length}개.`);
  } catch (err) {
    console.error(err);
    sayImport(`멈췄어요: ${err.message} 다시 누르면 이어서 해요.`);
  } finally {
    importing = false;
    render();
  }
}

// ---------------------------------------------------------------- input

const splitInput = (id) => [id.startsWith('v-') ? 'value' : 'note', id.slice(2)];

function wireEvents() {
  // Pressing a button while typing would blur the field first, and the save and
  // re-render on blur replaced the button before the click landed (the click was
  // lost). Keep focus in the field; the click handlers save what was typed.
  app.addEventListener('mousedown', (e) => {
    const field = document.activeElement;
    if (e.target.closest('button') && field?.matches?.('input[data-field], input[data-pe], textarea[data-note-for]')) e.preventDefault();
  });
  app.addEventListener('click', onClick);
  app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset?.pe && t.type !== 'checkbox') {
      editField(t.dataset.id, t.dataset.pe, t.value);
      clearTimeout(protoTimer);
      protoTimer = setTimeout(saveProto, SAVE_MS);
      return;
    }
    if (t.dataset?.noteFor !== undefined) {
      noteDrafts.set(t.dataset.noteFor, t.value);
      return;
    }
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
    if (t.dataset?.pe && protoTimer) saveProto();
    if (t.dataset?.field && timers.has(t.id)) flush(t.id);
  });
  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset?.pe === 'value') {
      editField(t.dataset.id, 'value', t.checked);
      saveProto();
      render();
      if (t.checked) document.getElementById(`pu-${t.dataset.id}`)?.focus();
    } else if (t.id === 'set-name') {
      settings.name = t.value.trim();
      saveSettings(settings);
      toast('이름을 저장했어요');
    } else if (t.id === 'set-theme') {
      settings.theme = t.value;
      saveSettings(settings);
      applyTheme();
    } else if (t.id === 'home-pic-file' && t.files?.length) {
      addHomePictures([...t.files]);
      t.value = '';
    } else if (t.id === 'import-file' && t.files?.[0]) {
      importBackup(t.files[0]);
      t.value = '';
    }
  });
}

function flush(inputId) {
  clearTimeout(timers.get(inputId));
  timers.delete(inputId);
  const target = currentTarget();
  if (!target || !drafts.has(inputId)) return;
  const [field, stepId] = splitInput(inputId);
  const text = drafts.get(inputId);
  const r = resultOf(state.results, target.id, stepId);
  if ((r?.[field] || '') === text) {
    drafts.delete(inputId);
    return;
  }
  commit(resultOps(state.results, target.id, stepId, { [field]: text }, who()));
}

function flushAll() {
  for (const id of [...timers.keys()]) flush(id);
  if (protoTimer) saveProto();
}

function onClick(e) {
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) {
    e.preventDefault();
    document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return;
  }
  const seg = e.target.closest('button[data-s]');
  if (seg) {
    setStatus(seg.dataset.step, seg.dataset.s);
    document.activeElement?.blur?.(); // the row is done, as before: close the keyboard
    return;
  }
  const el = e.target.closest('[data-act]');
  const act = el?.dataset.act;
  if (!act) return;
  if (act.startsWith('pe-')) return editAction(act, el);
  switch (act) {
    case 'add-board': return addBoard(el.dataset.kind);
    case 'add-system': return boardDialog(null);
    case 'edit-board': return boardDialog(currentTarget());
    case 'add-run': return runDialog(null, route().kind);
    case 'edit-run': return runDialog(currentTarget());
    case 'add-meeting': return itemDialog('meetings', null);
    case 'edit-meeting': return itemDialog('meetings', state.meetings.get(el.dataset.id));
    case 'add-design': return itemDialog('designs', null);
    case 'edit-design': return itemDialog('designs', state.designs.get(el.dataset.id));
    case 'add-place': return placeDialog(null);
    case 'edit-place': return placeDialog(state.places.get(el.dataset.id));
    case 'seed-places': return seedPlaces();
    case 'copy-path': return copy(el.dataset.path, '경로를 복사했어요');
    case 'set-home': return setHome(el.dataset.coll, el.dataset.id, el.dataset.file);
    case 'add-note': return addNote(el.dataset.target, el.dataset.box);
    case 'edit-sticky': return stickyDialog(el.dataset.id);
    case 'home-edit':
      homeEdit = !homeEdit;
      return render();
    case 'home-move': return saveHomeImages(moved(homeImages(state.config.get('home')), Number(el.dataset.i), Number(el.dataset.step)));
    case 'home-pic': return homePicDialog(Number(el.dataset.i));
    case 'toc-toggle':
      toggleFolder(el.dataset.id);
      return render();
    case 'toc-all': {
      const parents = [...state.folders.values()].filter((f) => f.id !== ROOT && childrenOf(state.folders, f.id).length);
      const open = !parents.every((f) => openFolders.has(f.id));
      parents.forEach((f) => toggleFolder(f.id, open));
      return render();
    }
    case 'seed-folders': return seedFolders();
    case 'add-folder': return folderDialog(null);
    case 'edit-folder': {
      const folder = state.folders.get(el.dataset.id) || (el.dataset.id === ROOT ? { id: ROOT, parent: '', name: 'Wearable Ultrasound', memo: '', drive: '', order: 0 } : null);
      return folder && folderDialog(folder);
    }
    case 'del-note': return deleteNote(el.dataset.id);
    case 'run-import': return startImport();
    case 'copy-uid': return copy(store.uid, 'UID를 복사했어요');
    case 'copy-rules': return copy($('#rules-text').textContent, '규칙을 복사했어요');
    case 'sign-out': return cloud?.signOut();
    case 'export-csv': return saveFile(`wearable-us-${stamp()}.csv`, csvFor(state), 'text/csv');
    case 'export-json': return saveFile(`wearable-us-backup-${stamp()}.json`, backupFile(state, VERSION), 'application/json');
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
  const target = currentTarget();
  if (!target) return;
  const r = resultOf(state.results, target.id, stepId);
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
  commit(resultOps(state.results, target.id, stepId, change, who()));
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast('복사하지 못했어요. 직접 선택해서 복사하세요.');
  }
}

function addBoard(kind) {
  const obj = newBoard({ kind, name: nextBoardName(state.boards, kind) }, who());
  commit([{ op: 'put', coll: 'boards', obj }]);
  toast(`추가했어요: ${obj.name}`);
  location.hash = `#/b/${encodeURIComponent(obj.id)}`;
}

async function importBackup(file) {
  try {
    const ops = parseBackup(await file.text());
    const count = (c) => ops.filter((o) => o.coll === c).length;
    if (!confirm(`보드 ${count('boards')}개, 배치 · 팬텀 ${count('runs')}개, 기록 ${count('results')}개를 불러올까요? 같은 항목은 백업 내용으로 바뀌어요.`)) return;
    commit(ops);
    toast('불러왔어요');
  } catch (err) {
    toast(err.message);
  }
}

// ---------------------------------------------------------------- dialogs

function openDialog(html) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = html;
  document.body.append(dlg);
  dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  return dlg;
}

// Edits any board, or makes a new 연결 테스트 (a main + HV pair).
function boardDialog(board) {
  const editing = !!board;
  const kind = board?.kind || 'system';
  const isSys = kind === 'system';
  const boards = sortedBoards();
  const used = (k, id) => boards.some((b) => b.kind === 'system' && b[k] === id);
  const pick = (kk, k) => board?.[k] || (boards.find((b) => b.kind === kk && !used(k, b.id)) || boards.find((b) => b.kind === kk))?.id || '';
  const mainId = pick('main', 'mainId');
  const hvId = pick('hv', 'hvId');
  const opts = (k, sel) => boards.filter((b) => b.kind === k)
    .map((b) => `<option value="${esc(b.id)}"${b.id === sel ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
  const nameOf = (id) => state.boards.get(id)?.name || '';
  const dlg = openDialog(`
  <form method="dialog">
    <h2>${editing ? '보드 편집' : '연결 테스트 만들기'}</h2>
    ${isSys ? `
    <label class="field">메인 보드<select name="mainId" required>${opts('main', mainId)}</select></label>
    <label class="field">HV 보드<select name="hvId" required>${opts('hv', hvId)}</select></label>` : ''}
    <label class="field">이름<input type="text" name="name" value="${esc(board?.name || `${nameOf(mainId)} + ${nameOf(hvId)}`)}" required autocomplete="off"></label>
    <label class="field">메모 (시리얼, 특이사항)<textarea name="notes">${esc(board?.notes || '')}</textarea></label>
    <div class="actions">
      ${editing ? '<button type="button" class="danger left" data-del>삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">${editing ? '저장' : '만들기'}</button>
    </div>
  </form>`);
  const f = dlg.querySelector('form');
  let nameTouched = editing;
  f.elements.name.addEventListener('input', () => (nameTouched = true));
  if (isSys) {
    const rename = () => !nameTouched && (f.elements.name.value = `${nameOf(f.elements.mainId.value)} + ${nameOf(f.elements.hvId.value)}`);
    f.elements.mainId.addEventListener('change', rename);
    f.elements.hvId.addEventListener('change', rename);
  }
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`${board.name}와 그 기록을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    commit(deleteBoardOps(board, state.results));
    dlg.close();
    location.hash = '#/boards';
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    if (!name) return f.elements.name.focus();
    const pair = isSys ? { mainId: f.elements.mainId.value, hvId: f.elements.hvId.value } : {};
    const notes = f.elements.notes.value.trim();
    const obj = editing
      ? { ...board, name, notes, ...pair, updatedAt: new Date().toISOString() }
      : newBoard({ kind, name, notes, ...pair }, who());
    commit([{ op: 'put', coll: 'boards', obj }]);
    dlg.close();
    if (!editing) location.hash = `#/b/${encodeURIComponent(obj.id)}`;
  });
}

function setHome(coll, id, file) {
  const item = state[coll].get(id);
  const image = item?.images?.find((im) => im.file === file);
  if (!image) return;
  const caption = coll === 'meetings' ? `${item.title} · ${item.date} 미팅` : `${item.title} · ${image.caption || '설계'}`;
  const images = homeImages(state.config.get('home'));
  saveHomeImages(withImage(images, { file, caption, link: coll === 'meetings' ? '#/meetings' : '#/p/array/designs', wide: !images.length }));
  toast('홈 화면에 넣었어요');
}

// Adds or edits a meeting or a design version: text, the Drive folder, other
// links, what's in the folder, and preview pictures. New pictures go up when
// 저장 is pressed; pictures taken out are deleted after.
function itemDialog(coll, item) {
  const editing = !!item;
  const meeting = coll === 'meetings';
  const today = new Date().toLocaleDateString('sv-SE');
  const pics = (item?.images || []).map((x) => ({ file: x.file, text: x.caption || '', name: state.files.get(x.file)?.name || '(그림)', size: state.files.get(x.file)?.size || 0 }));
  const links = (item?.links || []).map((l) => ({ ...l }));
  const removed = new Set();
  let busy = false;
  const title = editing ? (meeting ? '미팅 편집' : '버전 편집') : (meeting ? '새 미팅' : '새 설계 버전');
  const fields = meeting ? `
    <label class="field">날짜<input type="date" name="date" value="${esc(item?.date || today)}"></label>
    <label class="field">제목<input type="text" name="title" value="${esc(item?.title || '')}" required autocomplete="off" placeholder="예: 진행 사항"></label>
    <label class="field">설명 (선택)<input type="text" name="sub" value="${esc(item?.sub || '')}" autocomplete="off" placeholder="예: 김미도, 최정인 · 15장"></label>` : `
    <label class="field">이름<input type="text" name="title" value="${esc(item?.title || '')}" required autocomplete="off" placeholder="예: 버전 2-4"></label>
    <label class="field">날짜<input type="date" name="date" value="${esc(item?.date || today)}"></label>
    <label class="field">바뀐 점 (한 줄에 하나)<textarea name="points">${esc((item?.points || []).join('\n'))}</textarea></label>`;
  const dlg = openDialog(`
  <form method="dialog" novalidate>
    <h2>${title}</h2>
    ${fields}
    <label class="field">Drive 폴더 링크<input type="url" name="drive" value="${esc(item?.drive || '')}" autocomplete="off" placeholder="https://drive.google.com/drive/folders/…"></label>
    <div class="stack att">
      <span class="lbl">다른 링크 (Google Slides, Notion, 파일 하나 등)</span>
      <div class="link-rows"></div>
      <button type="button" class="att-add" data-add-link>+ 링크 추가</button>
    </div>
    <label class="field">Drive 폴더 안 파일 (한 줄에 하나, 선택)<textarea name="contents" placeholder="파일 이름 — 설명">${esc(item?.contents || '')}</textarea></label>
    <div class="stack att">
      <span class="lbl">미리보기 그림 (png · jpg · svg, ${fileSize(MAX_PICTURE)}까지)</span>
      <div class="att-rows"></div>
      <label class="btn att-add">+ 그림 추가<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" multiple hidden></label>
    </div>
    <p class="small att-progress" role="status" hidden></p>
    <div class="actions">
      ${editing ? '<button type="button" class="danger left" data-del>삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">저장</button>
    </div>
  </form>`);
  const f = dlg.querySelector('form');
  const picRows = dlg.querySelector('.att-rows');
  const linkRows = dlg.querySelector('.link-rows');
  const progress = dlg.querySelector('.att-progress');
  const say = (text) => {
    progress.textContent = text;
    progress.hidden = !text;
  };
  const drawPics = () => {
    picRows.innerHTML = pics.map((r, i) => `
      <div class="att-row${removed.has(i) ? ' gone' : ''}">
        <span class="att-name">${esc(r.name)}${r.size ? ` · ${fileSize(r.size)}` : ''}${r.blob ? ' · 새 그림' : ''}</span>
        <input type="text" data-i="${i}" value="${esc(r.text)}" placeholder="설명" autocomplete="off"${removed.has(i) ? ' disabled' : ''}>
        <button type="button" data-rm="${i}">${removed.has(i) ? '되살리기' : '빼기'}</button>
      </div>`).join('') || '<p class="small muted">아직 없어요.</p>';
  };
  const drawLinks = () => {
    linkRows.innerHTML = links.map((l, i) => `
      <div class="link-row">
        <input type="text" data-li="${i}" data-k="label" value="${esc(l.label || '')}" placeholder="이름 (예: Google Slides)" autocomplete="off">
        <input type="url" data-li="${i}" data-k="url" value="${esc(l.url || '')}" placeholder="https://…" autocomplete="off">
        <button type="button" data-lrm="${i}">빼기</button>
      </div>`).join('');
  };
  drawPics();
  drawLinks();
  picRows.addEventListener('input', (e) => {
    if (e.target.dataset.i !== undefined) pics[Number(e.target.dataset.i)].text = e.target.value;
  });
  picRows.addEventListener('click', (e) => {
    const i = e.target.dataset.rm;
    if (i === undefined) return;
    const n = Number(i);
    if (pics[n].blob) pics.splice(n, 1); // a new pick: just drop it
    else if (removed.has(n)) removed.delete(n);
    else removed.add(n);
    drawPics();
  });
  linkRows.addEventListener('input', (e) => {
    const { li, k } = e.target.dataset;
    if (li !== undefined) links[Number(li)][k] = e.target.value;
  });
  linkRows.addEventListener('click', (e) => {
    if (e.target.dataset.lrm === undefined) return;
    links.splice(Number(e.target.dataset.lrm), 1);
    drawLinks();
  });
  dlg.querySelector('[data-add-link]').addEventListener('click', () => {
    links.push({ label: '', url: '' });
    drawLinks();
    linkRows.querySelector(`[data-li="${links.length - 1}"]`)?.focus();
  });
  dlg.querySelector('input[type=file]').addEventListener('change', (e) => {
    const big = [];
    for (const file of e.target.files) {
      if (!isPicture(file.type)) big.push(`${file.name}: 그림이 아니에요`);
      else if (file.size > MAX_PICTURE) big.push(`${file.name}: ${fileSize(file.size)}`);
      else pics.push({ blob: file, name: file.name, size: file.size, text: baseName(file.name) });
    }
    e.target.value = '';
    say(big.length ? `안 넣은 파일 (${big.join(', ')}). 큰 파일은 Drive에 올리고 링크를 붙여 주세요.` : '');
    drawPics();
  });
  const lock = (on) => {
    busy = on;
    f.querySelectorAll('button, input, textarea').forEach((x) => (x.disabled = on));
  };
  dlg.addEventListener('cancel', (e) => busy && e.preventDefault()); // Esc while uploading
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`지울까요? ${item.title} · 그림 ${pictureIdsOf(item).length}개. Drive 파일은 그대로 남아요.`)) return;
    commit([{ op: 'remove', coll, id: item.id }, ...deleteNotesOps(state.notes, targetOf(coll, item.id))]);
    forgetFiles(pictureIdsOf(item));
    dlg.close();
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = f.elements.title.value.trim();
    if (!name) return f.elements.title.focus();
    const drive = f.elements.drive.value.trim();
    const goodLinks = links.map((l) => ({ label: (l.label || '').trim(), url: (l.url || '').trim() })).filter((l) => l.url);
    if ((drive && !safeLink(drive)) || goodLinks.some((l) => !safeLink(l.url))) return say('링크는 https://로 시작해야 해요.');
    const fresh = pics.filter((r) => r.blob);
    if (fresh.length && !navigator.onLine) return say('그림을 올리려면 인터넷 연결이 필요해요.');
    const id = item?.id || uid();
    lock(true);
    try {
      for (const [n, r] of fresh.entries()) {
        const meta = await store.uploadFile(r.blob, { owner: `${coll}/${id}`, createdBy: who().name },
          (i, total) => say(`올리는 중 ${n + 1}/${fresh.length} · ${r.name} ${Math.round((100 * i) / total)}%`));
        r.file = meta.id;
      }
    } catch (err) {
      console.error(err);
      forgetFiles(fresh.filter((r) => r.file).map((r) => r.file));
      fresh.forEach((r) => delete r.file);
      lock(false);
      return say(`올리지 못했어요: ${err.message}`);
    }
    const now = new Date().toISOString();
    const obj = {
      ...(item || { createdAt: now, createdBy: who().name }),
      id,
      title: name,
      date: f.elements.date.value,
      drive,
      links: goodLinks.map((l) => ({ label: l.label || '링크', url: l.url })),
      contents: f.elements.contents.value.trim(),
      images: pics.filter((r, i) => !removed.has(i) && r.file).map((r) => ({ file: r.file, caption: r.text.trim() })),
      updatedAt: now,
      ...(meeting
        ? { sub: f.elements.sub.value.trim() }
        : { points: f.elements.points.value.split('\n').map((x) => x.trim()).filter(Boolean) }),
    };
    commit([{ op: 'put', coll, obj }]);
    forgetFiles(pics.filter((r, i) => removed.has(i) && r.file).map((r) => r.file));
    lock(false);
    dlg.close();
    toast('저장했어요');
  });
}

// One place on the 자료 지도: a link or a PC path, with a group and a note.
function placeDialog(place) {
  const editing = !!place;
  const groups = [...new Set([...PLACE_GROUPS, ...[...state.places.values()].map((p) => p.group).filter(Boolean)])];
  const dlg = openDialog(`
  <form method="dialog" novalidate>
    <h2>${editing ? '장소 편집' : '장소 추가'}</h2>
    <label class="field">이름<input type="text" name="label" value="${esc(place?.label || '')}" required autocomplete="off" placeholder="예: Google Drive · 측정 데이터"></label>
    <label class="field">주소 또는 PC 경로<input type="text" name="where" value="${esc(place?.where || '')}" autocomplete="off" placeholder="https://… 또는 C:\\…"></label>
    <label class="field">묶음<input type="text" name="group" value="${esc(place?.group || groups[0])}" list="place-groups" autocomplete="off"></label>
    <datalist id="place-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <label class="field">메모 (선택)<textarea name="note">${esc(place?.note || '')}</textarea></label>
    <div class="actions">
      ${editing ? '<button type="button" class="danger left" data-del>삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">저장</button>
    </div>
  </form>`);
  const f = dlg.querySelector('form');
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`지울까요? ${place.label}`)) return;
    commit([{ op: 'remove', coll: 'places', id: place.id }]);
    dlg.close();
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = f.elements.label.value.trim();
    if (!label) return f.elements.label.focus();
    const where = f.elements.where.value.trim();
    if (/^[a-z]+:/i.test(where) && !/^[a-z]:\\/i.test(where) && !safeLink(where)) return toast('주소는 https://로 시작해야 해요.');
    const maxOrder = Math.max(0, ...[...state.places.values()].map((p) => p.order || 0));
    const now = new Date().toISOString();
    commit([{ op: 'put', coll: 'places', obj: {
      ...(place || { id: uid(), order: maxOrder + 10, createdAt: now, createdBy: who().name }),
      label, where, group: f.elements.group.value.trim() || '기타', note: f.elements.note.value.trim(), updatedAt: now,
    } }]);
    dlg.close();
  });
}

function seedPlaces() {
  const now = new Date().toISOString();
  commit(SEED_PLACES.map((p, i) => ({ op: 'put', coll: 'places', obj: { id: uid(), ...p, order: (i + 1) * 10, createdAt: now, createdBy: who().name } })));
  toast('기본 목록을 넣었어요');
}

function runDialog(run, kindArg) {
  const editing = !!run;
  const kind = run?.kind || kindArg;
  const K = PROTO_KINDS[kind];
  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, local time
  const dlg = openDialog(`
  <form method="dialog">
    <h2>${editing ? `${K.item} 편집` : `새 ${K.item}`}</h2>
    <label class="field">이름<input type="text" name="name" value="${esc(run?.name || nextRunName(state.runs, kind))}" required autocomplete="off"></label>
    <label class="field">날짜<input type="date" name="date" value="${esc(run ? run.date : today)}"></label>
    <label class="field">메모 (선택)<textarea name="notes">${esc(run?.notes || '')}</textarea></label>
    <div class="actions">
      ${editing ? '<button type="button" class="danger left" data-del>삭제</button>' : ''}
      <button type="button" data-cancel>취소</button>
      <button type="submit" class="primary">${editing ? '저장' : '만들기'}</button>
    </div>
  </form>`);
  const f = dlg.querySelector('form');
  dlg.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`${run.name}와 그 기록을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    commit(deleteRunOps(run, state.results));
    dlg.close();
    location.hash = `#/p/${kind}`;
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    if (!name) return f.elements.name.focus();
    const fields = { kind, name, date: f.elements.date.value, notes: f.elements.notes.value.trim() };
    const obj = editing ? { ...run, ...fields, updatedAt: new Date().toISOString() } : newRun(fields, who());
    commit([{ op: 'put', coll: 'runs', obj }]);
    dlg.close();
    if (!editing) location.hash = `#/r/${encodeURIComponent(obj.id)}`;
  });
}

// ---------------------------------------------------------------- local → cloud

function offerLocalCopy() {
  const flag = `usbringup.copied.${store.uid}`;
  if (readJSON(flag, false)) return;
  writeJSON(flag, true);
  const local = readLocalData();
  const nb = Object.keys(local.boards).length;
  const nr = Object.keys(local.runs).length;
  // A protocol already in the shared records wins over this device's copy.
  const protos = Object.values(local.protocols).filter((p) => !state.protocols.has(p.id));
  if (!nb && !nr && !protos.length) return;
  if (!confirm(`로그인 전에 이 기기에 적은 기록이 있어요 (보드 ${nb}개, 배치 · 팬텀 ${nr}개). 공유 기록으로 옮길까요?`)) return;
  const put = (coll, list) => list.map((obj) => ({ op: 'put', coll, obj }));
  commit([
    ...put('boards', Object.values(local.boards)),
    ...put('runs', Object.values(local.runs)),
    ...put('protocols', protos),
    ...put('results', Object.values(local.results)),
  ]);
}

// ---------------------------------------------------------------- sign-in

const AUTH_ERRORS = {
  'auth/invalid-credential': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/invalid-email': '이메일 주소 형식이 맞지 않아요.',
  'auth/user-not-found': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/wrong-password': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/email-already-in-use': '이미 이 이메일로 만든 계정이 있어요. 로그인하세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/missing-password': '비밀번호를 입력하세요.',
  'auth/too-many-requests': '시도가 너무 많아요. 몇 분 뒤 다시 하세요.',
  'auth/network-request-failed': '연결이 없어요. 처음 로그인할 때는 인터넷이 필요해요.',
  'auth/operation-not-allowed': 'Firebase에서 이메일 로그인이 꺼져 있어요.',
  'auth/admin-restricted-operation': '새 계정 만들기가 막혀 있어요. Firebase 콘솔 → Authentication → 사용자 추가로 만드세요.',
};

function showSignIn() {
  unsubscribe?.();
  unsubscribe = null;
  store = null;
  app.innerHTML = `
  <div class="signin">
    <form class="card" id="signin" novalidate>
      <div class="logo"><img src="icons/icon.svg" alt="" width="56" height="56"></div>
      <h1>Wearable Ultrasound</h1>
      <p class="hint">로그인하면 같은 기록을 같이 봐요.</p>
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
      note.textContent = `${email} 계정이 있으면 재설정 메일을 보냈어요.`;
      note.hidden = false;
    });
  });
  f.querySelector('[data-local]').addEventListener('click', () => {
    settings.mode = 'local';
    saveSettings(settings);
    start(localStore());
  });
}

// Last, so every const above exists before the first render.
boot();

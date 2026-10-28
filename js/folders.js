// 목차 on the home screen: the Google Drive folder tree. Each folder is its own
// record, so two people editing different folders never overwrite each other:
//   folders/{id} { id, parent, name, order, memo, drive, updatedAt, updatedBy }
// ROOT is the Drive folder itself (Wearable Ultrasound); the others hang under it.
// "Drive 폴더 목록 넣기" puts in SEED_FOLDERS, the layout of ../drive_upload/; the
// PC sync with Drive will keep it matching later.
//
// A memo is HTML of plain text, <br> and <span class="mc-red"> (one of
// MEMO_COLORS); sanitizeMemo() rebuilds anything else into that, so a memo is
// safe to put on the page. The only DOM used here is a <template> to read HTML
// and Ranges for the editor's selection, so tests can call all of it.

import { esc } from './util.js';

export const ROOT = 'root';
export const MEMO_MAX = 2000;

export const MEMO_COLORS = [
  { key: '', label: '기본 (회색)' },
  { key: 'red', label: '빨강' },
  { key: 'orange', label: '주황' },
  { key: 'green', label: '초록' },
  { key: 'blue', label: '파랑' },
  { key: 'purple', label: '보라' },
];
const COLOR_KEYS = new Set(MEMO_COLORS.map((c) => c.key).filter(Boolean));

// Fixed ids, so pressing "Drive 폴더 목록 넣기" twice (or on two phones) adds nothing twice.
export const SEED_FOLDERS = [
  { id: ROOT, parent: '', name: 'Wearable Ultrasound', memo: '' },
  { id: 'meetings', parent: ROOT, name: '미팅 자료', memo: '미팅마다 폴더 (날짜 제목). 슬라이드 원본과 그림.' },
  { id: 'meetings-2026-09-11', parent: 'meetings', name: '2026-09-11 진행 사항', memo: '' },
  { id: 'array', parent: ROOT, name: '어레이 설계', memo: '버전마다 폴더. JLC 주문 파일, KiCad, 도면, 미리보기.' },
  ...['v1', 'v2-1', 'v2-2', 'v2-3', 'v2-4', 'v2-5', 'v3-1', 'v3-2', 'v3-3', 'v3-4'].map((v) => ({ id: `array-${v}`, parent: 'array', name: v, memo: '' })),
  { id: 'boards', parent: ROOT, name: '회로 보드', memo: '메인 · HV 보드 파일' },
  { id: 'data', parent: ROOT, name: '측정 데이터', memo: '측정 날짜별 폴더 (예: 2026-08-27). 스코프 csv · 사진.' },
  { id: 'papers', parent: ROOT, name: '논문 · 참고 자료', memo: '' },
].map((f, i) => ({ ...f, order: (i + 1) * 10, drive: '' }));

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'ko', { numeric: true });

// Children in order. A folder whose parent is gone shows at the top level.
export function childrenOf(folders, parent) {
  return [...folders.values()]
    .filter((f) => f.id !== ROOT && (f.parent === parent || (parent === ROOT && !folders.has(f.parent))))
    .sort(byOrder);
}

export function descendantsOf(folders, id) {
  const out = [];
  const walk = (p) => childrenOf(folders, p).forEach((f) => {
    out.push(f);
    walk(f.id);
  });
  walk(id);
  return out;
}

// Every folder a folder can move under, in tree order with its depth: not the
// folder itself or anything inside it.
export function placesFor(folders, movingId = null) {
  const skip = new Set(movingId ? [movingId, ...descendantsOf(folders, movingId).map((f) => f.id)] : []);
  const root = folders.get(ROOT);
  const out = [{ id: ROOT, name: root?.name || 'Wearable Ultrasound', depth: 0 }];
  const walk = (p, depth) => childrenOf(folders, p).forEach((f) => {
    if (skip.has(f.id)) return;
    out.push({ id: f.id, name: f.name, depth });
    walk(f.id, depth + 1);
  });
  walk(ROOT, 1);
  return out;
}

export const nextOrder = (folders, parent) => Math.max(0, ...childrenOf(folders, parent).map((f) => f.order ?? 0)) + 10;

export const deleteFolderOps = (folders, id) =>
  [id, ...descendantsOf(folders, id).map((f) => f.id)].map((x) => ({ op: 'remove', coll: 'folders', id: x }));

// ---------------------------------------------------------------- memos

// Text as runs [{ text, color }]. Text, <br> and the start of a block (Enter in
// the editor makes a <div>) give the text and new lines; <span class="mc-…">
// gives the color. Anything else only passes its text through.
export function runsOf(node) {
  const runs = [];
  let all = '';
  const push = (t, color) => {
    if (!t) return;
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.text += t;
    else runs.push({ text: t, color });
    all += t;
  };
  const walk = (n, color) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) push(c.nodeValue.replace(/ /g, ' '), color);
      else if (c.nodeType === 1) {
        if (/^(SCRIPT|STYLE)$/.test(c.tagName)) continue;
        if (c.tagName === 'BR') {
          push('\n', color);
          continue;
        }
        if (/^(DIV|P|LI|H\d)$/.test(c.tagName) && all && !all.endsWith('\n')) push('\n', color);
        const m = c.tagName === 'SPAN' && [...c.classList].map((x) => /^mc-([a-z]+)$/.exec(x)?.[1]).find((k) => COLOR_KEYS.has(k));
        walk(c, m || color);
      }
    }
  };
  walk(node, '');
  return runs;
}

export function memoHtml(runs) {
  const out = runs.map((r) => ({ ...r })).filter((r) => r.text);
  while (out.length && /\s$/.test(out[out.length - 1].text)) {
    const last = out[out.length - 1];
    last.text = last.text.replace(/\s+$/, '');
    if (!last.text) out.pop();
  }
  return out.map((r) => {
    const h = esc(r.text).replace(/\n/g, '<br>');
    return r.color ? `<span class="mc-${r.color}">${h}</span>` : h;
  }).join('');
}

const parse = (html) => {
  const t = document.createElement('template');
  t.innerHTML = String(html ?? '');
  return t.content;
};

export const sanitizeMemo = (html) => memoHtml(runsOf(parse(html)));
export const memoText = (html) => runsOf(parse(html)).map((r) => r.text).join('').trim();

// Runs with the characters [a, b) in another color ('' = the default gray).
export function paintRuns(runs, a, b, color) {
  const out = [];
  let pos = 0;
  for (const r of runs) {
    for (let i = 0; i < r.text.length; i++, pos++) {
      const c = pos >= a && pos < b ? color : r.color;
      const last = out[out.length - 1];
      if (last && last.color === c) last.text += r.text[i];
      else out.push({ text: r.text[i], color: c });
    }
  }
  return out;
}

// Selection point in the editor → character offset in runsOf(editor).
export function memoOffset(root, node, offset) {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  return runsOf(r.cloneContents()).reduce((n, x) => n + x.text.length, 0);
}

// Character offset → selection point, in an editor holding memoHtml().
export function memoPoint(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) {
      if (offset <= n.nodeValue.length) return [n, offset];
      offset -= n.nodeValue.length;
    } else if (n.tagName === 'BR') {
      if (offset === 0) return [n.parentNode, [...n.parentNode.childNodes].indexOf(n)];
      offset -= 1;
    }
  }
  return [root, root.childNodes.length];
}

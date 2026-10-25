// One-time move of what the site used to serve (designs/array/, meetings/)
// into the app's records: preview pictures go to Firestore, the Google Slides
// link becomes a link, and the other files are listed as what belongs in each
// item's Drive folder (they are uploaded to Drive by hand; drive_upload/ on
// the PC has the folder tree ready). Run from 설정 by a signed-in account.
// Entries already in Firestore (same id) are skipped, so a stopped move can
// simply be run again.
// Once the move is done, delete this file, designs.js, meetings.js and the two
// folders.

import { isPicture } from './files.js';
import { ARRAY_DESIGNS } from './designs.js';
import { HOME_FIGURE, MEETINGS } from './meetings.js';

export function pending(state) {
  return {
    designs: ARRAY_DESIGNS.filter((d) => !state.designs.has(d.id)),
    meetings: MEETINGS.filter((m) => !state.meetings.has(m.id)),
    home: !!HOME_FIGURE && !state.config.has('home'),
  };
}

const fileName = (href) => href.split('/').pop();

// "name — label" lines: what goes in the item's Drive folder.
export function contentsOf(entry) {
  if (entry.pptx) return `${entry.pptx.name} — 슬라이드 원본 (PPTX)`;
  return (entry.files || []).map((f) => `${fileName(f.href)} — ${f.label}`).join('\n');
}

export async function runImport(store, state, who, say) {
  const now = () => new Date().toISOString();
  const upload = async (url, name, owner, label) => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    const blob = await r.blob();
    const file = new File([blob], name, { type: blob.type });
    if (!isPicture(file.type)) throw new Error(`${name}: 그림이 아니에요`);
    return store.uploadFile(file, { owner, createdBy: who.name }, (i, n) => say(`${label} · ${name} ${i}/${n}`));
  };
  const put = (coll, obj) => store.apply([{ op: 'put', coll, obj }]);
  const todo = pending(state);
  const imageOf = new Map(); // site path → uploaded picture id, for the home picture

  for (const d of todo.designs) {
    const images = [];
    for (const im of d.images) {
      const f = await upload(im.src, fileName(im.src), `designs/${d.id}`, d.title);
      images.push({ file: f.id, caption: im.caption });
    }
    put('designs', { id: d.id, title: d.title, date: d.date, points: d.points, images, drive: '', links: [], contents: contentsOf(d), createdAt: now(), createdBy: who.name, updatedAt: now() });
  }

  for (const m of todo.meetings) {
    const images = [];
    if (m.thumb) {
      const f = await upload(m.thumb, `${m.id}_${fileName(m.thumb)}`, `meetings/${m.id}`, m.date);
      images.push({ file: f.id, caption: m.title });
      imageOf.set(m.thumb, f.id);
    }
    const links = m.google ? [{ label: 'Google Slides', url: m.google }] : [];
    put('meetings', { id: m.id, date: m.date, title: m.title, sub: m.sub || '', images, drive: '', links, contents: contentsOf(m), createdAt: now(), createdBy: who.name, updatedAt: now() });
  }

  if (todo.home) {
    const file = imageOf.get(HOME_FIGURE.src) || state.meetings.get(HOME_FIGURE.meeting)?.images?.[0]?.file;
    if (file) put('config', { id: 'home', image: file, caption: HOME_FIGURE.caption, link: '#/meetings', updatedAt: now(), updatedBy: who.name });
  }
  return todo;
}

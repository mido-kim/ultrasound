// Preview pictures kept in Firestore (meetings, design versions, the home
// picture). The free plan has no file storage, so each file is cut into chunks under Firestore's
// 1 MiB document limit and put back together when shown or downloaded:
//   bringup/{PROJECT}/files/{id}               { id, name, type, size, chunks, owner, createdAt, createdBy }
//   bringup/{PROJECT}/files/{id}/chunks/{0000} { i, data: Bytes }
// The metadata document is written last, so a file only shows up once all of
// its chunks are in. No DOM here, so tests can call it directly.

export const CHUNK = 900 * 1024;

// Only preview pictures are kept here; big files (decks, zips, data) live in
// Google Drive and the app links to them. Firestore's free plan holds 1 GiB.
export const MAX_PICTURE = 5 * 1000 * 1000;

export const chunkCount = (size) => Math.max(1, Math.ceil(size / CHUNK));

// [start, end) byte ranges of the chunks of a file of this size.
export function chunkRanges(size) {
  const out = [];
  for (let i = 0; i < chunkCount(size); i++) out.push([i * CHUNK, Math.min(size, (i + 1) * CHUNK)]);
  return out;
}

export const chunkId = (i) => String(i).padStart(4, '0');

const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip', md: 'text/markdown', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  dxf: 'image/vnd.dxf', dwg: 'image/vnd.dwg',
};

// The browser's type when it gives one, else from the extension.
export function typeOf(name, given = '') {
  if (given) return given;
  return TYPES[String(name).split('.').pop().toLowerCase()] || 'application/octet-stream';
}

// Pictures the browser can show; DXF / DWG drawings are files, not pictures.
export const isPicture = (type) => /^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(type);

export const fileSize = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

// "v2-3_stack.png" → "v2-3_stack": a starting caption for a new picture.
export const baseName = (name) => String(name).replace(/\.[^.]+$/, '');

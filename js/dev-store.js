// Development only: an in-memory store that behaves like the cloud one, files
// included, so the file screens can be tried without Firebase. Loaded only on
// localhost with ?dev (http://localhost:5174/?dev); nothing is saved.

import { chunkRanges, typeOf } from './files.js';
import { COLLS } from './store.js';
import { uid } from './util.js';

export function devStore() {
  const data = Object.fromEntries(COLLS.map((c) => [c, new Map()]));
  const chunks = new Map(); // file id → [Uint8Array]
  const subs = new Set();
  const snapshot = () => ({ ...Object.fromEntries(COLLS.map((c) => [c, new Map(data[c])])), pending: false });
  const emit = () => {
    const s = snapshot();
    subs.forEach((fn) => fn(s));
  };
  const tick = () => new Promise((r) => setTimeout(r, 15));
  return {
    kind: 'cloud',
    email: 'dev@localhost',
    uid: 'dev',
    subscribe(fn) {
      subs.add(fn);
      fn(snapshot());
      return () => subs.delete(fn);
    },
    async apply(ops) {
      for (const o of ops) {
        if (o.op === 'put') data[o.coll].set(o.obj.id, o.obj);
        else data[o.coll].delete(o.id);
      }
      emit();
    },
    async uploadFile(file, extra, onProgress) {
      const id = uid();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ranges = chunkRanges(bytes.length);
      const parts = [];
      for (const [i, [a, b]] of ranges.entries()) {
        parts.push(bytes.slice(a, b));
        await tick();
        onProgress?.(i + 1, ranges.length);
      }
      chunks.set(id, parts);
      const meta = { id, name: file.name, type: typeOf(file.name, file.type), size: bytes.length, chunks: ranges.length, ...extra, createdAt: new Date().toISOString() };
      data.files.set(id, meta);
      emit();
      return meta;
    },
    async readFile(id, onProgress) {
      const meta = data.files.get(id);
      const parts = chunks.get(id);
      if (!meta || !parts) throw new Error('파일을 찾을 수 없어요.');
      for (let i = 0; i < parts.length; i++) {
        await tick();
        onProgress?.(i + 1, parts.length);
      }
      return new Blob(parts, { type: meta.type });
    },
    async deleteFile(id) {
      chunks.delete(id);
      data.files.delete(id);
      emit();
    },
  };
}

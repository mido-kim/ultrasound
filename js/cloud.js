// Shared records through Firebase: email sign-in plus a Firestore database that
// keeps a copy on each device, so the app also works offline and catches up
// later. Everyone allowed by firestore.rules reads and writes the same data:
//   bringup/{PROJECT}/boards/{id}
//   bringup/{PROJECT}/results/{boardId}__{stepId}
//   bringup/{PROJECT}/runs/{id}           array batches and phantoms
//   bringup/{PROJECT}/protocols/{kind}    'array' and 'phantom' step lists
//   bringup/{PROJECT}/meetings/{id}       meeting slides (pictures, files, Slides link)
//   bringup/{PROJECT}/designs/{id}        array design versions
//   bringup/{PROJECT}/places/{id}         자료 지도: where everything lives
//   bringup/{PROJECT}/notes/{id}          notes on meetings and design versions (notes.js)
//   bringup/{PROJECT}/config/home         the picture on the home screen
//   bringup/{PROJECT}/files/{id}          preview picture metadata; the bytes in files/{id}/chunks (files.js)
// Big files themselves live in Google Drive; records only hold links to them.
// (The path keeps its first name, "bringup", so the rules didn't change.)
// The Firebase project is this app's own (config.js), not the Planner app's.

import { chunkId, chunkRanges, typeOf } from './files.js';
import { COLLS } from './store.js';
import { uid } from './util.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.6.0';
export const PROJECT = 'us-control-v5';

export async function connectCloud(config) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(config);
  const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] });
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });

  return {
    onUser: (fn) => A.onAuthStateChanged(auth, fn),
    signIn: (email, password) => A.signInWithEmailAndPassword(auth, email, password),
    signUp: (email, password) => A.createUserWithEmailAndPassword(auth, email, password),
    resetPassword: (email) => A.sendPasswordResetEmail(auth, email),
    signOut: () => A.signOut(auth),

    storeFor(user, onError) {
      const ref = (coll, id) => F.doc(db, 'bringup', PROJECT, coll, id);
      return {
        kind: 'cloud',
        email: user.email,
        uid: user.uid,
        subscribe(fn) {
          const maps = {};
          const pending = {};
          const colls = COLLS;
          const emit = () => {
            if (colls.every((c) => maps[c])) fn({ ...maps, pending: colls.some((c) => pending[c]) });
          };
          const unsubs = colls.map((coll) =>
            F.onSnapshot(
              F.collection(db, 'bringup', PROJECT, coll),
              { includeMetadataChanges: true },
              (snap) => {
                const m = new Map();
                snap.forEach((d) => m.set(d.id, d.data()));
                maps[coll] = m;
                pending[coll] = snap.metadata.hasPendingWrites;
                emit();
              },
              (err) => onError?.(err),
            ),
          );
          return () => unsubs.forEach((u) => u());
        },
        async apply(ops) {
          // Writes show up locally at once; the commit resolves only when the
          // server has them, which can be much later offline, so it isn't awaited.
          for (let i = 0; i < ops.length; i += 400) {
            const batch = F.writeBatch(db);
            for (const o of ops.slice(i, i + 400)) {
              if (o.op === 'put') batch.set(ref(o.coll, o.obj.id), o.obj);
              else batch.delete(ref(o.coll, o.id));
            }
            batch.commit().catch((err) => onError?.(err));
          }
        },

        // Files, unlike records, wait for the server: a chunk at a time, then the
        // metadata. onProgress(done, total) after each chunk. Returns the metadata.
        async uploadFile(file, extra, onProgress) {
          const id = uid();
          const bytes = new Uint8Array(await file.arrayBuffer());
          const ranges = chunkRanges(bytes.length);
          const chunk = (i) => F.doc(db, 'bringup', PROJECT, 'files', id, 'chunks', chunkId(i));
          try {
            for (const [i, [a, b]] of ranges.entries()) {
              await F.setDoc(chunk(i), { i, data: F.Bytes.fromUint8Array(bytes.subarray(a, b)) });
              onProgress?.(i + 1, ranges.length);
            }
            const meta = {
              id, name: file.name, type: typeOf(file.name, file.type), size: bytes.length, chunks: ranges.length,
              ...extra, createdAt: new Date().toISOString(),
            };
            await F.setDoc(ref('files', id), meta);
            return meta;
          } catch (err) {
            this.deleteFile(id).catch(() => {});
            throw err;
          }
        },
        async readFile(id, onProgress) {
          const meta = (await F.getDoc(ref('files', id))).data();
          if (!meta) throw new Error('파일을 찾을 수 없어요.');
          const parts = [];
          for (let i = 0; i < meta.chunks; i++) {
            const d = await F.getDoc(F.doc(db, 'bringup', PROJECT, 'files', id, 'chunks', chunkId(i)));
            if (!d.exists()) throw new Error(`${meta.name}: 조각 ${i + 1}이 없어요.`);
            parts.push(d.data().data.toUint8Array());
            onProgress?.(i + 1, meta.chunks);
          }
          return new Blob(parts, { type: meta.type });
        },
        async deleteFile(id) {
          const chunks = await F.getDocs(F.collection(db, 'bringup', PROJECT, 'files', id, 'chunks'));
          const batch = F.writeBatch(db);
          chunks.forEach((d) => batch.delete(d.ref));
          batch.delete(ref('files', id));
          await batch.commit();
        },
      };
    },
  };
}

// Where boards and results are kept. The local store (this file) and the cloud
// store (cloud.js) share one small interface, as in the Planner app:
//
//   subscribe(fn)  calls fn({ boards, results, pending }) now and after every
//                  change; each collection is a Map keyed by id
//   apply(ops)     applies [{ op: 'put' | 'remove', coll, obj | id }] together

export const LOCAL_KEY = 'usbringup.data.v1';
export const COLLS = ['boards', 'results'];

export function readLocalData() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (d && typeof d === 'object') {
      return { boards: d.boards && typeof d.boards === 'object' ? d.boards : {}, results: d.results && typeof d.results === 'object' ? d.results : {} };
    }
  } catch {
    // Unreadable data is treated as empty.
  }
  return { boards: {}, results: {} };
}

export function localStore() {
  let data = readLocalData();
  const subs = new Set();
  const snapshot = () => ({
    boards: new Map(Object.entries(data.boards)),
    results: new Map(Object.entries(data.results)),
    pending: false,
  });
  const emit = () => {
    const snap = snapshot();
    subs.forEach((fn) => fn(snap));
  };

  // Keep other open tabs in step.
  addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY) {
      data = readLocalData();
      emit();
    }
  });

  return {
    kind: 'local',
    subscribe(fn) {
      subs.add(fn);
      fn(snapshot());
      return () => subs.delete(fn);
    },
    async apply(ops) {
      for (const o of ops) {
        if (o.op === 'put') data[o.coll][o.obj.id] = o.obj;
        else delete data[o.coll][o.id];
      }
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      } catch {
        // Storage full or blocked: the change stays for this session.
      }
      emit();
    },
  };
}

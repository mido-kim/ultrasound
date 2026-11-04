// 채널 맵: which array element each board channel goes to, for when the
// array's own numbering doesn't follow the board's (J1001 odd pins = EL0–EL15).
// The shared record config/channels holds the maps:
//   { id: 'channels', maps: [{ id, name, el }], updatedAt, updatedBy }
// el has 16 entries, index = board channel: the array element number on that
// channel, or null when nothing is on it. Which map a laptop uses is a
// per-device setting (console.js). No DOM here: tests.js checks it.

import { uid } from './util.js';

export const CHANNELS_DOC = 'channels';
export const N_CH = 16;

export const sameAsBoard = () => Array.from({ length: N_CH }, (_, i) => i);
export const allBlank = () => new Array(N_CH).fill(null);

// The maps in config/channels; a missing record has none.
export function mapsOf(doc) {
  return Array.isArray(doc?.maps) ? doc.maps.filter((m) => m && m.id && Array.isArray(m.el) && m.el.length === N_CH) : [];
}

export const channelsRecord = (maps, by) => ({ id: CHANNELS_DOC, maps, updatedAt: new Date().toISOString(), updatedBy: by });

// A new map starts with the board's own numbers, so only the channels that
// differ need typing.
export function newMap(maps) {
  const n = maps.reduce((m, x) => Math.max(m, Number(/^맵 (\d+)$/.exec(x.name)?.[1] || 0)), 0);
  return { id: uid(), name: `맵 ${n + 1}`, el: sameAsBoard() };
}

// What was typed for one channel: "3" → 3, blank → null (nothing on it),
// anything else → undefined (keep the old value).
export function parseElement(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  return /^\d{1,3}$/.test(t) ? Number(t) : undefined;
}

export const elementOf = (map, ch) => (map ? map.el[ch] ?? null : ch);

// Board channels in the order of their element numbers, without the empty
// ones: the B-mode scan order and the order of the console's element
// buttons. No map: the board's own order.
export function scanOrder(map) {
  if (!map) return sameAsBoard();
  return map.el.map((e, ch) => [e, ch]).filter(([e]) => e !== null).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, ch]) => ch);
}

// Element numbers given to more than one channel.
export function clashes(map) {
  const seen = new Map();
  (map?.el || []).forEach((e, ch) => e !== null && seen.set(e, [...(seen.get(e) || []), ch]));
  return [...seen].filter(([, chs]) => chs.length > 1).map(([element, chs]) => ({ element, chs }));
}

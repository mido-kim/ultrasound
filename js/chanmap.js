// 채널 맵: for when the array's own element numbers don't follow the board's
// channels (J1001 odd pins = EL0–EL15). A map lists the array's elements in
// their own number order and gives each one the board channel it is wired to.
// The shared record config/channels keeps the maps, each under a name:
//   { id: 'channels', maps: [{ id, name, base, order }], updatedAt, updatedBy }
// order[k] = board channel of array element k + base (base 1 or 0, how the
// array is numbered), null = no element there. Which map a laptop uses is a
// per-device setting (console.js). No DOM here: tests.js checks it.

import { uid } from './util.js';

export const CHANNELS_DOC = 'channels';
export const N_CH = 16;

export const boardOrder = () => Array.from({ length: N_CH }, (_, i) => i);
export const noneOrder = () => new Array(N_CH).fill(null);

const isMap = (m) => m && m.id && Array.isArray(m.order) && m.order.length === N_CH;

// The maps in config/channels; a missing record has none.
export const mapsOf = (doc) => (Array.isArray(doc?.maps) ? doc.maps.filter(isMap) : []);

export const channelsRecord = (maps, by) => ({ id: CHANNELS_DOC, maps, updatedAt: new Date().toISOString(), updatedBy: by });

// A new map starts in the board's own order, so only what differs needs picking.
export function newMap(maps) {
  const n = maps.reduce((m, x) => Math.max(m, Number(/^맵 (\d+)$/.exec(x.name)?.[1] || 0)), 0);
  return { id: uid(), name: `맵 ${n + 1}`, base: 1, order: boardOrder() };
}

// The array element number on a board channel (the first one, if picked twice).
// No map: the channel number itself.
export function elementOf(map, ch) {
  if (!map) return ch;
  const k = map.order.indexOf(ch);
  return k < 0 ? null : k + (map.base ?? 1);
}

// Board channels in the array's number order, each once, empty places left
// out: the B-mode scan order and the order of the console's element buttons.
// No map: the board's own order.
export function scanOrder(map) {
  if (!map) return boardOrder();
  return map.order.filter((ch, k) => ch !== null && map.order.indexOf(ch) === k);
}

// Board channels picked for more than one array element.
export function clashes(map) {
  const seen = new Map();
  (map?.order || []).forEach((ch, k) => ch !== null && seen.set(ch, [...(seen.get(ch) || []), k + (map.base ?? 1)]));
  return [...seen].filter(([, els]) => els.length > 1).map(([ch, elements]) => ({ ch, elements }));
}

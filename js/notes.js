// Notes on a meeting or a design version (papers later): a thread per item.
// Each note is its own record, so two people writing at once never overwrite
// each other. No DOM here, so tests can call it directly.
//
// Note: { id, target: '<coll>/<item id>', text, by, byUid, at }

import { uid } from './util.js';

export const NOTE_MAX = 4000;

export const targetOf = (coll, id) => `${coll}/${id}`;

// Notes on one item, oldest first.
export function notesFor(notes, target) {
  return [...notes.values()].filter((n) => n.target === target).sort((a, b) => (a.at || '').localeCompare(b.at || ''));
}

// A new note, or null when there is nothing to save.
export function newNote(target, text, who) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  return { id: uid(), target, text: t.slice(0, NOTE_MAX), by: who.name, byUid: who.uid || '', at: new Date().toISOString() };
}

// Removes every note on an item (when the item itself is deleted).
export const deleteNotesOps = (notes, target) => notesFor(notes, target).map((n) => ({ op: 'remove', coll: 'notes', id: n.id }));

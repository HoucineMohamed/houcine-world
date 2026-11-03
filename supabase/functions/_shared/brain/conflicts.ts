// Possible duplicates and contradictions between notes, for Knowledge Studio's review queue. Pure: it only reads a
// compiled index (the admin view: every active note) and points at passages for the owner to compare. It never
// decides which one is right and never changes a note. docs/knowledge-studio.md, "Review".
//
// Two checks:
//   - duplicate passages: two sections of different notes that use mostly the same words (keep the fact in one note
//     and link to it from the other);
//   - contact details that disagree: an email address or phone number written in a note that no contact note lists.

import { terms } from "./text.ts";
import type { BrainIndex } from "./types.ts";

export interface ConflictFinding {
  kind: "possible_duplicate" | "contact_mismatch";
  /** Note ids involved (the first is the one to open). */
  notes: string[];
  /** Section headings, in the order of `notes`. */
  sections: string[];
  /** Plain explanation for the owner. */
  detail: string;
}

/** Share of distinct words two passages have in common (Jaccard) at which they are reported as possible duplicates. */
export const DUPLICATE_THRESHOLD = 0.45;
/** Shorter passages are skipped: a two-line section shares words with everything. */
const MIN_TERMS = 12;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// A phone number: "+" or a digit, then at least 8 digits with spaces, dots or dashes between.
const PHONE = /(?<![\w/])\+?\d(?:[ .-]?\d){8,}(?![\w/])/g;
// Compared by the last 9 digits, so "+33 0746503304", "+33746503304" and "07 46 50 33 04" are the same number.
const digits = (s: string) => s.replace(/\D/g, "").slice(-9);

export const findConflicts = (index: BrainIndex): ConflictFinding[] => {
  const out: ConflictFinding[] = [];
  const notes = new Map(index.notes.map((n) => [n.id, n]));
  const searchable = index.chunks.filter((c) => {
    const t = notes.get(c.note)?.type;
    return t !== "source" && t !== "index" && t !== "agent";
  });

  // 1. Duplicate passages (each pair of notes reported once, with its most similar sections).
  const sets = searchable.map((c) => ({ chunk: c, words: new Set(terms(c.text)) })).filter((x) => x.words.size >= MIN_TERMS);
  const best = new Map<string, { a: (typeof sets)[number]; b: (typeof sets)[number]; score: number }>();
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i]!;
      const b = sets[j]!;
      if (a.chunk.note === b.chunk.note) continue;
      let shared = 0;
      for (const w of a.words) if (b.words.has(w)) shared++;
      const score = shared / (a.words.size + b.words.size - shared);
      if (score < DUPLICATE_THRESHOLD) continue;
      const key = [a.chunk.note, b.chunk.note].sort().join("|");
      if ((best.get(key)?.score ?? 0) < score) best.set(key, { a, b, score });
    }
  }
  for (const { a, b, score } of [...best.values()].sort((x, y) => y.score - x.score)) {
    out.push({
      kind: "possible_duplicate",
      notes: [a.chunk.note, b.chunk.note],
      sections: [a.chunk.heading, b.chunk.heading],
      detail: `These sections use ${Math.round(score * 100)}% of the same words. If they state the same facts, keep them in one note and link to it from the other, so a correction is never made in one place only.`,
    });
  }

  // 2. Contact details: every email and phone number must be one a contact note lists.
  const contactChunks = index.chunks.filter((c) => notes.get(c.note)?.type === "contact");
  const knownEmails = new Set<string>();
  const knownPhones = new Set<string>();
  for (const n of index.notes) {
    for (const [k, v] of Object.entries(n.facts)) {
      if (k.includes("email")) knownEmails.add(v.toLowerCase());
      if (k.includes("phone")) knownPhones.add(digits(v));
    }
  }
  for (const c of contactChunks) {
    for (const m of c.text.matchAll(EMAIL)) knownEmails.add(m[0].toLowerCase());
    for (const m of c.text.matchAll(PHONE)) knownPhones.add(digits(m[0]));
  }
  for (const c of searchable) {
    const unknown = new Set<string>();
    for (const m of c.text.matchAll(EMAIL)) if (!knownEmails.has(m[0].toLowerCase())) unknown.add(m[0]);
    for (const m of c.text.matchAll(PHONE)) if (!knownPhones.has(digits(m[0]))) unknown.add(m[0].trim());
    if (!unknown.size) continue;
    out.push({
      kind: "contact_mismatch",
      notes: [c.note],
      sections: [c.heading],
      detail: `${[...unknown].join(", ")}: not listed in any contact note. If it is right, add it to the contact note; if not, correct it here.`,
    });
  }
  return out;
};

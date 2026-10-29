// Search over the compiled knowledge brain (index.generated.ts). Pure and deterministic: the same index and the
// same queries always give the same passages. Used by any agent; each agent passes the brands it may read.
//
// How a passage is scored (docs/knowledge-brain.md, "How retrieval works"):
//   1. Every query (the visitor's own words plus the search queries the language model wrote for them) becomes
//      search terms (text.ts). A term that is not in the index is matched to known terms within a small typo
//      allowance ("bookin", "weding"), at a lower weight.
//   2. Each passage gets a BM25 score on its body, plus a weighted score on its "meta" field (note title, aliases,
//      tags, section heading), plus a bonus when a query names the note (its title or an alias as a phrase).
//   3. Brand filter: only notes of the agent's brands, and the overview notes of its "referral" brands.
//   4. Graph step: the best passage of each note that a top note links to ([[wiki links]]) is added, so a related
//      policy or contact note comes along with the topic it belongs to.
//   5. A size budget keeps what reaches the model small; with no match at all, the agent's overview is returned so
//      the model can say plainly that the information is not there.

import type { Brand, BrainChunk, BrainIndex, BrainNote } from "./types.ts";
import { boundedDistance, phrase, terms, typoAllowance } from "./text.ts";

export interface SearchScope {
  /** Brands whose public notes the agent may use in full. */
  brands: Brand[];
  /** Brands of which only the `overview` note may be used (to point a visitor elsewhere). */
  referralBrands?: Brand[];
  /** The note returned when nothing matches. */
  fallbackNote?: string;
}

export interface SearchOptions {
  limit?: number;
  maxChars?: number;
  linkedLimit?: number;
}

export interface Passage {
  chunk: BrainChunk;
  note: BrainNote;
  score: number;
  via: "match" | "link" | "fallback";
}

const K1 = 1.2;
const B = 0.75;
const META_WEIGHT = 1.6;
const NAME_BONUS = 2.5;
const FUZZY_WEIGHT = 0.6;

const UNSEARCHABLE = new Set(["index", "source"]);

/** Precomputed per index: notes by id, the vocabulary, and which passages may be read under a scope. */
const prepared = new WeakMap<BrainIndex, { notes: Map<string, BrainNote>; vocab: string[] }>();
const prepare = (index: BrainIndex) => {
  let p = prepared.get(index);
  if (!p) {
    p = { notes: new Map(index.notes.map((n) => [n.id, n])), vocab: Object.keys(index.df) };
    prepared.set(index, p);
  }
  return p;
};

export const allowedNote = (note: BrainNote, scope: SearchScope): boolean => {
  if (UNSEARCHABLE.has(note.type)) return false;
  if (scope.brands.includes(note.brand)) return true;
  return note.type === "overview" && (scope.referralBrands ?? []).includes(note.brand);
};

/** The query's terms with weights: exact terms 1, typo matches FUZZY_WEIGHT, unknown terms dropped. */
const weightedTerms = (index: BrainIndex, vocab: string[], query: string): Map<string, number> => {
  const out = new Map<string, number>();
  for (const t of terms(query)) {
    if (index.df[t] !== undefined) {
      out.set(t, Math.max(out.get(t) ?? 0, 1));
      continue;
    }
    const allowance = typoAllowance(t);
    if (allowance === 0) continue;
    for (const v of vocab) {
      if (v[0] !== t[0] && allowance < 2) continue; // a one-typo match keeps the first letter: fewer false hits
      if (boundedDistance(t, v, allowance) <= allowance) out.set(v, Math.max(out.get(v) ?? 0, FUZZY_WEIGHT));
    }
  }
  return out;
};

const bm25 = (tf: number, df: number, n: number, len: number, avg: number): number => {
  if (tf <= 0) return 0;
  const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
  return idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * len) / avg)));
};

const cache = new Map<string, Passage[]>();
const CACHE_LIMIT = 200;

/** The passages for a set of queries, best first. Results are cached per index, scope and queries (never per visitor). */
export const search = (index: BrainIndex, queries: string[], scope: SearchScope, options: SearchOptions = {}): Passage[] => {
  const { limit = 6, maxChars = 7000, linkedLimit = 2 } = options;
  const cleaned = queries.map((q) => q.trim()).filter(Boolean).slice(0, 6);
  const key = JSON.stringify([index.fingerprint, scope, options, cleaned]);
  const hit = cache.get(key);
  if (hit) return hit;

  const { notes, vocab } = prepare(index);
  const n = index.chunks.length;
  const scores = new Map<string, number>();

  for (const query of cleaned) {
    const weighted = weightedTerms(index, vocab, query);
    const spoken = ` ${phrase(query)} `;
    const named = new Set(
      index.notes.filter((note) => note.names.some((name) => name.length >= 3 && spoken.includes(` ${name} `))).map((note) => note.id),
    );
    for (const chunk of index.chunks) {
      const note = notes.get(chunk.note);
      if (!note || !allowedNote(note, scope)) continue;
      let s = 0;
      for (const [term, w] of weighted) {
        const df = index.df[term] ?? 0;
        s += w * bm25(chunk.body[term] ?? 0, df, n, chunk.length, index.avgLength);
        s += w * META_WEIGHT * bm25(chunk.meta[term] ?? 0, df, n, 8, 8);
      }
      if (named.has(note.id)) s += NAME_BONUS;
      if (s > 0) scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + s);
    }
  }

  const byId = new Map(index.chunks.map((c) => [c.id, c]));
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, score]) => ({ chunk: byId.get(id)!, score }));

  const out: Passage[] = [];
  const perNote = new Map<string, number>();
  let chars = 0;
  const take = (chunk: BrainChunk, score: number, via: Passage["via"]): boolean => {
    if (out.some((p) => p.chunk.id === chunk.id)) return false;
    if ((perNote.get(chunk.note) ?? 0) >= 3) return false;
    if (chars + chunk.text.length > maxChars && out.length > 0) return false;
    out.push({ chunk, note: notes.get(chunk.note)!, score, via });
    perNote.set(chunk.note, (perNote.get(chunk.note) ?? 0) + 1);
    chars += chunk.text.length;
    return true;
  };

  for (const { chunk, score } of ranked) {
    if (out.length >= limit) break;
    // Keep passages that score at least a fifth of the best one: a weak tail only adds noise.
    if (out.length > 0 && score < ranked[0]!.score * 0.2) break;
    take(chunk, score, "match");
  }

  // Graph step: follow the links of the top notes.
  let linked = 0;
  const topNotes = [...new Set(out.map((p) => p.note.id))].slice(0, 3);
  for (const noteId of topNotes) {
    for (const target of notes.get(noteId)?.links ?? []) {
      if (linked >= linkedLimit) break;
      const tnote = notes.get(target);
      if (!tnote || !allowedNote(tnote, scope) || out.some((p) => p.note.id === target)) continue;
      const candidates = index.chunks.filter((c) => c.note === target);
      const best = candidates.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))[0];
      if (best && take(best, (scores.get(best.id) ?? 0) * 0.35, "link")) linked++;
    }
  }

  if (out.length === 0 && scope.fallbackNote) {
    for (const chunk of index.chunks.filter((c) => c.note === scope.fallbackNote).slice(0, 2)) take(chunk, 0, "fallback");
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
};

/** A note by id, or undefined. */
export const noteById = (index: BrainIndex, id: string): BrainNote | undefined => prepare(index).notes.get(id);

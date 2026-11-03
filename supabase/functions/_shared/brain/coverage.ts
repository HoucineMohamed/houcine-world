// Coverage score: for each brand, does the knowledge brain hold and FIND the note that answers a fixed list of real
// visitor questions (coverage-questions.ts)? Search only: the visitor's own words go through the same search the
// concierge uses (retrieve.ts), with no language model, no network and no cost, so it runs in read-only mode and
// before any AI key exists. Pure and deterministic: the same index always gives the same score.
// docs/knowledge-studio.md, "Coverage".
//
// Two views of every question:
//   - "brand": searched within the question's brand and the shared houcine-world notes only, so a La Rosa View
//     question can never be answered through a Houcine.tech note (brand separation);
//   - "concierge": searched with the La Rosa View Concierge's own access (full brands and referral overviews), i.e.
//     what the public chat can reach, including the passages it always receives (pinned).
// The real concierge also searches the queries its understanding step writes; this score uses the visitor's words
// alone, so it is a floor, not a ceiling.

import { search, type SearchScope } from "./retrieve.ts";
import type { BrainIndex, Brand } from "./types.ts";

/**
 * What a correct answer looks like:
 *   - "answered": the expected passage states the fact;
 *   - "awaiting": the honest answer is "not published yet, ask the team" (the passage says so, marked incomplete);
 *   - "gap": no note answers it yet (the reason says what is missing; fill it from the site or ask the owner).
 */
export type QuestionKind = "answered" | "awaiting" | "gap";

export interface CoverageQuestion {
  id: string;
  brand: Brand;
  question: string;
  kind: QuestionKind;
  /** Passages that answer it, any one is enough: "note-id" (any section) or "note-id#Section heading". Empty for a gap. */
  expect: string[];
  /** For a gap: what is missing and where the fact would come from. */
  gap?: string;
}

/** The result of one question in one view. "gap" is a known gap; "not_found" means the expected passage was missed. */
export type QuestionResult = "answered" | "awaiting" | "gap" | "not_found";

export interface ScoredQuestion {
  id: string;
  brand: Brand;
  question: string;
  kind: QuestionKind;
  expect: string[];
  gap: string | null;
  brand_view: QuestionResult;
  concierge_view: QuestionResult;
  /** The expected passages the brand view found ("note-id#Heading"). */
  found: string[];
  /** The first passages the brand view returned, for the inspector. */
  top: { note: string; section: string; via: string }[];
  /** Expected notes that are not in the index (internal, archived, renamed or deleted): never counted as found. */
  unknown: string[];
}

export interface BrandScore {
  brand: Brand;
  total: number;
  answered: number;
  awaiting: number;
  gap: number;
  not_found: number;
  /** Questions the public concierge reaches (answered or awaiting in the concierge view). */
  concierge: number;
}

export interface CoverageReport {
  fingerprint: string;
  questions: ScoredQuestion[];
  brands: BrandScore[];
}

export const CONCIERGE_ID = "la-rosa-view-concierge";

/** The concierge's code default, used when the index has no access note (agents/la-rosa-view-concierge.md). */
const CONCIERGE_DEFAULT: SearchScope = {
  brands: ["la-rosa-view", "houcine-world"],
  referralBrands: ["houcine-tech", "houcine-studio", "houcine-management", "houcine-education"],
};

/** The concierge's search scope, and the passages it always receives (pinned, by chunk id). */
const conciergeAccess = (index: BrainIndex): { scope: SearchScope; pinned: string[] } => {
  const access = index.agents?.[CONCIERGE_ID];
  return access ? { scope: { brands: access.brands, referralBrands: access.referralBrands }, pinned: access.pinned } : { scope: CONCIERGE_DEFAULT, pinned: [] };
};

const brandScope = (brand: Brand): SearchScope => ({ brands: brand === "houcine-world" ? [brand] : [brand, "houcine-world"] });

const splitExpect = (e: string) => {
  const at = e.indexOf("#");
  return at === -1 ? { note: e, section: null } : { note: e.slice(0, at), section: e.slice(at + 1) };
};

const run = (index: BrainIndex, q: CoverageQuestion, scope: SearchScope, pinned: string[] = []) => {
  // No fallback note: a question nothing matches must count as not found, never as the overview.
  const passages = search(index, [q.question], scope);
  const given = [
    ...passages.map((p) => p.chunk),
    ...index.chunks.filter((c) => pinned.includes(c.id) && !passages.some((p) => p.chunk.id === c.id)),
  ];
  const found = given
    .filter((c) => q.expect.some((e) => {
      const { note, section } = splitExpect(e);
      return c.note === note && (section === null || c.heading === section);
    }))
    .map((c) => `${c.note}#${c.heading}`);
  const result: QuestionResult = q.kind === "gap" ? "gap" : found.length ? q.kind : "not_found";
  return { result, found, passages };
};

/** Problems in a question list (ids, brands, expectations). The test runs it on the real list and index. */
export const checkQuestions = (questions: CoverageQuestion[], index: BrainIndex): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const notes = new Map(index.notes.map((n) => [n.id, n]));
  for (const q of questions) {
    if (ids.has(q.id)) errors.push(`${q.id}: duplicate id`);
    ids.add(q.id);
    if (!q.question.trim()) errors.push(`${q.id}: empty question`);
    if (q.kind === "gap" && (q.expect.length || !q.gap)) errors.push(`${q.id}: a gap has no expected passage and says what is missing`);
    if (q.kind !== "gap" && !q.expect.length) errors.push(`${q.id}: no expected passage`);
    for (const e of q.expect) {
      const { note, section } = splitExpect(e);
      const n = notes.get(note);
      if (!n) {
        errors.push(`${q.id}: ${note} is not a public note of the index`);
        continue;
      }
      if (n.brand !== q.brand && n.brand !== "houcine-world") errors.push(`${q.id}: ${note} belongs to ${n.brand}, not ${q.brand}`);
      if (section !== null && !index.chunks.some((c) => c.note === note && c.heading === section)) errors.push(`${q.id}: ${note} has no section "${section}"`);
    }
  }
  return errors;
};

/** Score every question against an index. Brands are reported in the order given. */
export const scoreCoverage = (index: BrainIndex, questions: CoverageQuestion[], brands: readonly Brand[]): CoverageReport => {
  const known = new Set(index.notes.map((n) => n.id));
  const concierge = conciergeAccess(index);
  const scored: ScoredQuestion[] = questions.map((q) => {
    const own = run(index, q, brandScope(q.brand));
    const pub = run(index, q, concierge.scope, concierge.pinned);
    return {
      id: q.id,
      brand: q.brand,
      question: q.question,
      kind: q.kind,
      expect: q.expect,
      gap: q.gap ?? null,
      brand_view: own.result,
      concierge_view: pub.result,
      found: own.found,
      top: own.passages.slice(0, 4).map((p) => ({ note: p.note.id, section: p.chunk.heading, via: p.via })),
      unknown: [...new Set(q.expect.map((e) => splitExpect(e).note).filter((n) => !known.has(n)))],
    };
  });
  const scores: BrandScore[] = brands.map((brand) => {
    const mine = scored.filter((s) => s.brand === brand);
    const count = (r: QuestionResult) => mine.filter((s) => s.brand_view === r).length;
    return {
      brand,
      total: mine.length,
      answered: count("answered"),
      awaiting: count("awaiting"),
      gap: count("gap"),
      not_found: count("not_found"),
      concierge: mine.filter((s) => s.concierge_view === "answered" || s.concierge_view === "awaiting").length,
    };
  });
  return { fingerprint: index.fingerprint, questions: scored, brands: scores };
};

/** The short form kept with a publication in the activity log: per brand, [answered, awaiting, gap, not found]. */
export const coverageSummary = (report: CoverageReport): Record<string, [number, number, number, number]> =>
  Object.fromEntries(report.brands.map((b) => [b.brand, [b.answered, b.awaiting, b.gap, b.not_found]]));

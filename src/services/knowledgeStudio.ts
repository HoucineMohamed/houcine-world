import { supabase } from "@/integrations/supabase/client";

// The browser side of Knowledge Studio: typed calls to the knowledge-studio Edge Function. The function checks, on the
// server, that the signed-in user is a super admin before anything is read or written (docs/knowledge-studio.md);
// nothing here is a security boundary. supabase.functions.invoke sends the user's session token.

export type Visibility = "public" | "internal" | "confidential";
export type SectionStatus = "verified" | "policy" | "incomplete" | "pending" | "outdated";

export interface NoteSummary {
  path: string;
  sha: string | null;
  id: string | null;
  title: string | null;
  brand: string | null;
  type: string | null;
  visibility: Visibility | null;
  status: SectionStatus | null;
  updated: string | null;
  tags: string[];
  aliases: string[];
  sources: string[];
  links: string[];
  archived: boolean;
  isNew: boolean;
  sections: { heading: string; status: SectionStatus }[];
  draft: { operation: "upsert" | "archive" | "restore"; version: number; updatedAt: string; by: string | null } | null;
}

export interface Publication {
  id: string;
  status: "committing" | "deploying" | "live" | "failed";
  requested_at: string;
  deploy_started_at: string | null;
  finished_at: string | null;
  paths: string[];
  commit_sha: string | null;
  expected_fingerprint: string | null;
  error_code: string | null;
  attempts: number;
}

export interface AgentAccess {
  brands: string[];
  referralBrands: string[];
  fallbackNote: string | null;
  pinned: string[];
}

export interface StudioState {
  mode: "github" | "snapshot";
  canPublish: boolean;
  repoProblem: string | null;
  head: string | null;
  notes: NoteSummary[];
  drafts: { path: string; operation: string; targetPath: string | null; version: number; updatedAt: string; by: string | null; stale: string | null }[];
  validation: { published: string[]; working: string[] };
  stats: {
    total: number; public: number; internal: number; confidential: number; archived: number;
    byBrand: Record<string, number>; byType: Record<string, number>; people: number; links: number;
    pendingSections: number; incompleteSections: number; outdatedSections: number;
  };
  index: { expected: string | null; live: string | null; sync: "in_sync" | "out_of_sync" | "unknown" | "publishing"; notes: number | null; passages: number | null; bundled: string };
  agents: Record<string, AgentAccess>;
  publication: Publication | null;
  lastLive: Publication | null;
  lastChange: KnowledgeEvent | null;
  brands: string[];
  sources: { id: string; label: string }[];
}

export interface Draft {
  path: string;
  operation: "upsert" | "archive" | "restore";
  content: string | null;
  target_path: string | null;
  base_sha: string | null;
  original_input: string | null;
  version: number;
  updated_by_email: string | null;
  updated_at: string;
}

export interface KnowledgeEvent {
  id: number;
  at: string;
  actor_email: string | null;
  kind: string;
  path: string | null;
  publication_id: string | null;
  detail: Record<string, unknown>;
}

export interface NoteDetail {
  path: string;
  content: string | null;
  sha: string | null;
  draft: Draft | null;
  stale: string | null;
  history: { sha: string; date: string; message: string; author: string }[];
  events: KnowledgeEvent[];
}

export interface Overlap {
  noteId: string;
  title: string;
  section: string;
  status: SectionStatus;
  text: string;
  matched: string[];
}

export interface InspectedPassage {
  noteId: string;
  title: string;
  brand: string;
  type: string;
  visibility: string;
  section: string;
  status: SectionStatus;
  text: string;
  sources: string[];
  updated: string;
  score: number;
  via: "match" | "link" | "fallback";
  why: { matched: string[]; named: boolean; linkedFrom?: string } | null;
}

export interface PlaygroundResult {
  source: "live" | "preview";
  indexFingerprint: string;
  liveFingerprint: string | null;
  reply: string;
  error: { code: string; message: string } | null;
  memory: { stated: { key: string; value: string }[]; inferred: { key: string; value: string }[]; summary: string } | null;
  interpretation: { language: string; topic: string; intent: string; search_queries: string[]; needs_clarification: boolean; missing_details: string[] } | null;
  queries: string[];
  access: { brands: string[]; referralBrands?: string[] };
  passages: InspectedPassage[];
}

export interface AssistResult {
  aiAvailable: boolean;
  aiError?: string;
  overlaps: Overlap[];
  suggestion: {
    title: string;
    sections: { heading: string; text: string }[];
    removedSections: { heading: string; reason: string }[];
    tags: string[];
    relatedNotes: string[];
    missingDetails: string[];
    possibleConflicts: { note_id: string; explanation: string }[];
  } | null;
}

export type CoverageResult = "answered" | "awaiting" | "gap" | "not_found";

/** The coverage score (supabase/functions/_shared/brain/coverage.ts): search only, no AI call. */
export interface CoverageReport {
  source: "live" | "preview";
  fingerprint: string;
  brands: { brand: string; total: number; answered: number; awaiting: number; gap: number; not_found: number; concierge: number }[];
  questions: {
    id: string;
    brand: string;
    question: string;
    kind: "answered" | "awaiting" | "gap";
    expect: string[];
    gap: string | null;
    brand_view: CoverageResult;
    concierge_view: CoverageResult;
    found: string[];
    top: { note: string; section: string; via: string }[];
    unknown: string[];
  }[];
  /** The score kept with each publication, newest first: per brand [answered, awaiting, gap, not found]. */
  trend: { at: string; by: string | null; fingerprint: string | null; coverage: Record<string, [number, number, number, number]> }[];
}

/** Playground feedback counted per brand and rating: numbers only (knowledge-studio core.ts, feedbackSummary). */
export interface FeedbackSummaryRow {
  brand: string;
  ratings: Record<"correct" | "incomplete" | "incorrect" | "missing" | "outdated", { open: number; total: number }>;
}

export interface ReviewItem {
  kind: string;
  title: string;
  detail: string;
  path?: string;
  id?: string;
  at?: string;
}

export interface Feedback {
  id: string;
  created_at: string;
  created_by_email: string | null;
  rating: string;
  question: string;
  answer: string | null;
  comment: string | null;
  status: string;
  resolution: string | null;
}

/** An error from the Studio, with the server's plain message and short code. */
export class StudioError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly data: Record<string, unknown>) {
    super(message);
  }
}

const call = async <T>(method: "GET" | "POST", action: string, options: { query?: Record<string, string>; body?: unknown } = {}): Promise<T> => {
  const qs = options.query ? `?${new URLSearchParams(options.query).toString()}` : "";
  const { data, error } = await supabase.functions.invoke(`knowledge-studio/${action}${qs}`, {
    method,
    ...(method === "POST" ? { body: (options.body ?? {}) as Record<string, unknown> } : {}),
  });
  if (error) {
    // A non-2xx answer: read the function's own message and code (never a stack or a provider detail).
    const ctx = (error as { context?: Response }).context;
    let payload: Record<string, unknown> = {};
    try {
      if (ctx && typeof ctx.json === "function") payload = await ctx.json();
    } catch {
      // not JSON
    }
    const status = ctx && typeof ctx.status === "number" ? ctx.status : 0;
    throw new StudioError(
      typeof payload.error === "string" ? payload.error : status === 0 ? "Knowledge Studio could not be reached. Check your connection." : "Knowledge Studio could not complete this action.",
      typeof payload.code === "string" ? payload.code : status === 0 ? "network" : "unknown",
      status,
      payload,
    );
  }
  return data as T;
};

export const studioApi = {
  state: () => call<StudioState>("GET", "state"),
  note: (path: string) => call<NoteDetail>("GET", "note", { query: { path } }),
  version: (path: string, commit: string) => call<{ content: string }>("GET", "version", { query: { path, commit } }),
  saveDraft: (body: { path: string; content: string; expectedVersion: number | null; baseSha?: string | null; originalInput?: string | null; rebaseOnto?: string }) =>
    call<{ draft: Draft; errors: string[]; allErrors: string[]; overlaps: Overlap[] }>("POST", "draft", { body }),
  validate: (path: string, content: string) => call<{ errors: string[]; allErrors: string[]; overlaps: Overlap[] }>("POST", "validate", { body: { path, content } }),
  discard: (path: string, expectedVersion: number) => call<{ discarded: string }>("POST", "discard", { body: { path, expectedVersion } }),
  archive: (path: string) => call<{ draft: Draft; errors: string[] }>("POST", "archive", { body: { path } }),
  restore: (path: string) => call<{ draft: Draft; errors: string[] }>("POST", "restore", { body: { path } }),
  publish: (paths?: string[]) => call<{ publication: Publication; expectedFingerprint: string }>("POST", "publish", { body: paths ? { paths } : {} }),
  publication: (id: string) => call<{ publication: Publication }>("GET", "publication", { query: { id } }),
  retry: (id: string) => call<{ publication: Publication }>("POST", "retry", { body: { id } }),
  playground: (body: { message: string; history: { role: "user" | "assistant"; content: string }[]; memory?: unknown; source: "live" | "preview" }) =>
    call<PlaygroundResult>("POST", "playground", { body }),
  coverage: (source: "live" | "preview") => call<CoverageReport>("GET", "coverage", { query: { source } }),
  assist: (text: string, brand: string | null) => call<AssistResult>("POST", "assist", { body: { text, brand } }),
  search: (q: string) => call<{ results: { path: string; id: string; title: string; brand: string; visibility: string; snippet: string; matchedIn: string }[] }>("GET", "search", { query: { q } }),
  feedback: (body: { rating: string; question: string; answer: string; comment: string; sources: string[] }) => call<{ feedback: Feedback }>("POST", "feedback", { body }),
  review: () => call<{ items: ReviewItem[]; feedbackSummary: FeedbackSummaryRow[] }>("GET", "review"),
  resolve: (id: string, status: "resolved" | "dismissed", resolution: string) => call<{ feedback: Feedback }>("POST", "resolve", { body: { id, status, resolution } }),
  activity: (before?: number) => call<{ events: KnowledgeEvent[]; publications: Publication[] }>("GET", "activity", { query: before ? { before: String(before) } : {} }),
};

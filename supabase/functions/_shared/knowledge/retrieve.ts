// Knowledge OS: the ONE retrieval service every AI consumer uses (docs/knowledge-os.md section 10).
//
//   public knowledge   the compiled index of published PUBLIC notes (the same search the concierge uses), limited to the
//                      brands the caller passes (the public site, the person's brands, or the agent's access note);
//   private knowledge  kos_retrieve in the database, called WITH THE PERSON'S OWN CLIENT: the database computes their
//                      identity and applies the one access rule (client / internal / management, brand, client
//                      restriction, published, not archived, not expired). Nothing private is cached here.
// The model never chooses a permission level: the server picks the consumer and the client it calls with.
import { search } from "../brain/retrieve.ts";
import type { BrainIndex, Brand } from "../brain/types.ts";

export type Consumer = "client_ai" | "internal_ai" | "autopilot_ai" | "command_ai";
export interface KnowledgeSource {
  title: string;
  section: string;
  brand: string;
  visibility: "public" | "client" | "internal" | "management";
  /** Public notes: their last-checked date; private documents: "v<n>". */
  version: string;
  status: string;
  updated: string;
  /** A public note id, or "library" for a private document (no internal path is ever shown). */
  source: string;
  score: number;
  text: string;
}

// deno-lint-ignore no-explicit-any
type Db = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: { message: string } | null }> };

export const publicSources = (index: BrainIndex, question: string, brands: Brand[], limit = 4): KnowledgeSource[] =>
  search(index, [question], { brands }, { limit, maxChars: 3200, linkedLimit: 0 })
    .filter((p) => p.chunk.status !== "outdated")
    .map((p) => ({ title: p.note.title, section: p.chunk.heading, brand: p.note.brand, visibility: "public" as const, version: p.note.updated, status: p.chunk.status,
      updated: p.note.updated, source: p.note.id, score: p.score, text: p.chunk.text.replace(/\s+/g, " ").slice(0, 650) }));

export const privateSources = async (db: Db | null, question: string, consumer: Consumer, brandIds: string[] | null, limit = 4): Promise<KnowledgeSource[]> => {
  if (!db) return [];
  const { data, error } = await db.rpc("kos_retrieve", { p_query: question.slice(0, 1000), p_consumer: consumer, p_brand_ids: brandIds, p_limit: limit });
  if (error || !Array.isArray(data)) return []; // refused or unavailable: no private knowledge, never an error to the user
  return (data as Record<string, unknown>[]).map((r) => ({
    title: String(r.title ?? ""), section: String(r.category ?? "Library"), brand: String(r.brand ?? ""),
    visibility: (["client", "internal", "management"].includes(String(r.visibility)) ? r.visibility : "internal") as KnowledgeSource["visibility"],
    version: `v${r.version}`, status: "published", updated: String(r.updated_at ?? "").slice(0, 10), source: "library", score: Number(r.score ?? 0),
    text: String(r.section ?? "").replace(/\s+/g, " ").slice(0, 650),
  }));
};

/** Public and private sources together: private (more specific) first, then public; at most `limit` in all. */
export const retrieveKnowledge = async (o: { index: BrainIndex; question: string; publicBrands: Brand[]; consumer: Consumer; db: Db | null; brandIds?: string[] | null; limit?: number }) => {
  const limit = o.limit ?? 6;
  const [priv, pub] = [await privateSources(o.db, o.question, o.consumer, o.brandIds ?? null, Math.ceil(limit / 2)), publicSources(o.index, o.question, o.publicBrands, Math.ceil(limit / 2))];
  return [...priv, ...pub].slice(0, limit);
};

/** A citation as shown to a person: title, version, section, brand, never a path or storage address. */
export const citation = (s: KnowledgeSource) => ({ title: s.title, section: s.section, brand: s.brand, visibility: s.visibility, version: s.version, updated: s.updated, source: s.source === "library" ? "Knowledge Library" : s.source });

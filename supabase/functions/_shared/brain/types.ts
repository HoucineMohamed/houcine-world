// The shape of the compiled knowledge index (index.generated.ts), written by scripts/brain/build.mjs from the
// Markdown notes in houcine-world-brain/. Only notes with `visibility: public` are ever compiled in.

export type Brand =
  | "houcine-world"
  | "la-rosa-view"
  | "houcine-tech"
  | "houcine-studio"
  | "houcine-management"
  | "houcine-education";

export type NoteType =
  | "overview" | "topic" | "service" | "person" | "policy" | "faq" | "contact" | "relationship" | "index" | "source" | "agent";

export type Status = "verified" | "policy" | "incomplete" | "pending" | "outdated";

export interface BrainNote {
  id: string;
  title: string;
  brand: Brand;
  type: NoteType;
  status: Status;
  updated: string;
  sources: string[];
  aliases: string[];
  tags: string[];
  /** Ids of the notes this note links to with [[wiki links]]. */
  links: string[];
  /** `fact_<name>` header values: single values that code also needs. */
  facts: Record<string, string>;
  /** Normalized title and aliases, for "the question names this note" checks. */
  names: string[];
}

export interface BrainChunk {
  id: string;
  note: string;
  heading: string;
  status: Status;
  /** The passage as written (wiki links turned into their text). */
  text: string;
  /** Term counts of the passage body. */
  body: Record<string, number>;
  /** Term counts of the note title, aliases, tags and the passage heading. */
  meta: Record<string, number>;
  length: number;
}

/** What one AI agent may read, from its access note in houcine-world-brain/agents/ (editable in Knowledge Studio). */
export interface AgentAccess {
  /** Brands whose public notes the agent may use in full. */
  brands: Brand[];
  /** Brands of which only the public `overview` note may be used. */
  referralBrands: Brand[];
  /** The note sent when nothing matches. */
  fallbackNote: string | null;
  /** Passages always sent (by chunk id). */
  pinned: string[];
}

export interface BrainIndex {
  /** A fingerprint of the notes the index was built from. */
  fingerprint: string;
  notes: BrainNote[];
  chunks: BrainChunk[];
  /** In how many passages each term appears (body or meta). */
  df: Record<string, number>;
  avgLength: number;
  /** Agent access, by agent id. An agent without an entry uses the defaults of its code profile. */
  agents?: Record<string, AgentAccess>;
}

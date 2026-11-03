// Notes in Knowledge Studio: the SAME header reader and writer as the brain's compiler
// (supabase/functions/_shared/brain/compile.ts), so a note edited in the browser is written exactly as the build and
// the Studio backend read it. Markdown stays the format: the form fields only edit the header lines.
import { FIELD_ORDER, parseFrontmatter, serializeNote, type Fields } from "../../../supabase/functions/_shared/brain/compile.ts";

export { FIELD_ORDER };
export type { Fields };

export const BRAND_LABELS: Record<string, string> = {
  "houcine-world": "Houcine.world (shared)",
  "la-rosa-view": "La Rosa View",
  "houcine-tech": "Houcine.tech",
  "houcine-studio": "Houcine.studio",
  "houcine-management": "Houcine.management",
  "houcine-education": "Houcine.education",
};

export const TYPE_LABELS: Record<string, string> = {
  overview: "Overview", topic: "Topic", service: "Service", person: "Person", policy: "Policy", faq: "Questions",
  contact: "Contact", relationship: "Relationship", index: "Index", source: "Sources", agent: "AI access",
};

export const VISIBILITY_INFO: Record<string, { label: string; help: string }> = {
  public: { label: "Public", help: "Approved for the public AI's answers (once published)." },
  internal: { label: "Internal", help: "Not publishable here: the website's repository is public. Write internal knowledge in the Knowledge Library (private)." },
  confidential: { label: "Restricted", help: "Not publishable here: the website's repository is public. Use the Knowledge Library (management level) instead." },
};

export const STATUS_INFO: Record<string, { label: string; help: string }> = {
  verified: { label: "Verified", help: "Confirmed facts. The AI may state them." },
  policy: { label: "Current policy", help: "A rule in force. The AI may state it." },
  incomplete: { label: "Incomplete", help: "Known gaps. The AI says the information is not published." },
  pending: { label: "Awaiting confirmation", help: "Not confirmed yet. The AI never states it as fact." },
  outdated: { label: "Outdated", help: "Kept for history. The AI never presents it as current." },
};

export interface EditableNote {
  fields: Fields;
  body: string;
  errors: string[];
}

export const readNote = (text: string, path: string): EditableNote => {
  const parsed = parseFrontmatter(text.replace(/\r\n/g, "\n"), path);
  return { fields: parsed.fields ?? {}, body: parsed.body ?? text, errors: parsed.errors };
};

export const writeNote = (fields: Fields, body: string): string => serializeNote(fields, body);

export const field = (fields: Fields, key: string): string => (typeof fields[key] === "string" ? (fields[key] as string) : "");
export const listOf = (fields: Fields, key: string): string[] => (Array.isArray(fields[key]) ? (fields[key] as string[]) : []);

/** A list typed in a text box ("a, b, c") -> clean items. Commas and brackets cannot appear inside an item. */
export const parseList = (text: string): string[] =>
  text.split(",").map((s) => s.replace(/[[\]]/g, "").trim()).filter(Boolean);

export const today = (): string => new Date().toISOString().slice(0, 10);

/** A file name from a title: lower case, dashes, .md. */
export const slugify = (title: string): string =>
  title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "note";

export const defaultPathFor = (brand: string, type: string, title: string): string =>
  type === "person" ? `people/${slugify(title)}.md` : type === "agent" ? `agents/${slugify(title)}.md` : `brands/${brand}/${slugify(title)}.md`;

export const idFor = (brand: string, title: string): string => {
  const prefix: Record<string, string> = { "la-rosa-view": "lrv", "houcine-world": "hw", "houcine-tech": "tech", "houcine-studio": "studio", "houcine-management": "management", "houcine-education": "education" };
  return `${prefix[brand] ?? "note"}-${slugify(title)}`.slice(0, 80);
};

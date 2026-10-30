// The knowledge-brain compiler, in ONE pure module used everywhere it is needed:
//   - scripts/brain/build.mjs (Node, on a computer or in CI) reads houcine-world-brain/ from disk and calls it;
//   - the knowledge-studio Edge Function (Deno) calls it on the notes it reads from GitHub plus the owner's drafts,
//     to validate before publishing and to produce the exact files a publication commits.
// Same input, same bytes out, wherever it runs (no clock, no randomness, no I/O). docs/knowledge-brain.md.

import type { AgentAccess, Brand, BrainChunk, BrainIndex, BrainNote, NoteType, Status } from "./types.ts";
import { phrase, termCounts, terms } from "./text.ts";
import { sha256Hex } from "./sha256.ts";

export const BRANDS: Brand[] = ["houcine-world", "la-rosa-view", "houcine-tech", "houcine-studio", "houcine-management", "houcine-education"];
export const TYPES: NoteType[] = ["overview", "topic", "service", "person", "policy", "faq", "contact", "relationship", "index", "source", "agent"];
export const VISIBILITY = ["public", "internal", "confidential"] as const;
export type Visibility = (typeof VISIBILITY)[number];
export const STATUSES: Status[] = ["verified", "policy", "incomplete", "pending", "outdated"];
export const REQUIRED = ["id", "title", "brand", "type", "visibility", "status", "updated"] as const;
const LIST_FIELDS = new Set(["aliases", "tags", "sources", "brands", "referral_brands", "pinned"]);
const KNOWN = new Set<string>([...REQUIRED, ...LIST_FIELDS, "agent", "fallback_note"]);
/** Header field order used when the Studio writes a note (keeps diffs small and files familiar). */
export const FIELD_ORDER = [
  "id", "title", "brand", "type", "visibility", "status", "agent", "aliases", "tags", "sources",
  "brands", "referral_brands", "fallback_note", "pinned", "updated",
];
/** Folders of the brain that hold no notes (documentation, editor settings, evaluations). */
const NOT_NOTE_DIRS = new Set(["schemas", ".obsidian", "evals"]);
/** Archived notes live here: listed by the Studio, never compiled, never linkable from active notes. */
export const ARCHIVE_DIR = "archive";

export interface SourceFile {
  /** Path inside houcine-world-brain/, with "/" separators, e.g. "brands/la-rosa-view/bookings.md". */
  path: string;
  text: string;
}

export type Fields = Record<string, string | string[]>;

export interface ParsedNote {
  file: string;
  fields: Fields;
  body: string;
  links: string[];
  archived: boolean;
}

export interface CompileResult {
  index: BrainIndex | null;
  notes: ParsedNote[];
  errors: string[];
}

/** True for a path the compiler treats as a note (not the README, not a documentation folder). */
export const isNotePath = (path: string): boolean => {
  if (!path.endsWith(".md")) return false;
  const parts = path.split("/");
  if (parts.length === 1 && parts[0] === "README.md") return false;
  return !parts.slice(0, -1).some((p) => NOT_NOTE_DIRS.has(p) || p.startsWith("."));
};

export const isArchivedPath = (path: string): boolean => path.split("/")[0] === ARCHIVE_DIR;

const unquote = (v: string): string => {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
};

/** The header between the first two `---` lines: `key: value` and `key: [a, b]` only. Errors name the line. */
export const parseFrontmatter = (text: string, file: string): { fields?: Fields; body?: string; errors: string[] } => {
  const errors: string[] = [];
  if (!text.startsWith("---\n")) return { errors: [`${file}: no header (a note starts with a line "---")`] };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { errors: [`${file}: the header is not closed by a "---" line`] };
  const fields: Fields = {};
  const lines = text.slice(4, end).split("\n");
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const m = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/);
    if (!m) return void errors.push(`${file}: header line ${i + 2} is not "key: value"`);
    const key = m[1]!;
    const raw = m[2]!;
    if (key in fields) return void errors.push(`${file}: "${key}" appears twice`);
    if (!KNOWN.has(key) && !key.startsWith("fact_")) return void errors.push(`${file}: unknown header field "${key}"`);
    if (LIST_FIELDS.has(key)) {
      const v = raw.trim();
      if (!v.startsWith("[") || !v.endsWith("]")) return void errors.push(`${file}: "${key}" must be a list like [a, b]`);
      fields[key] = v.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else {
      fields[key] = unquote(raw);
    }
  });
  return { fields, body: text.slice(end + 4).replace(/^\n/, ""), errors };
};

const listOf = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : []);
const strOf = (v: string | string[] | undefined): string => (typeof v === "string" ? v : "");

/** Writes a header + body back to Markdown, in FIELD_ORDER, then any fact_ fields. */
export const serializeNote = (fields: Fields, body: string): string => {
  const keys = [...FIELD_ORDER.filter((k) => k in fields), ...Object.keys(fields).filter((k) => !FIELD_ORDER.includes(k)).sort()];
  const line = (k: string) => {
    const v = fields[k]!;
    if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
    return `${k}: ${v}`;
  };
  const lines = keys.filter((k) => !(Array.isArray(fields[k]) && (fields[k] as string[]).length === 0 && !REQUIRED.includes(k as never))).map(line);
  return `---\n${lines.join("\n")}\n---\n\n${body.replace(/^\n+/, "").replace(/\s+$/, "")}\n`;
};

const SECTION_STATUS = /^>\s*\[!(verified|policy|incomplete|pending|outdated)\]\s*/;
export const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

export interface Section {
  heading: string;
  status: Status;
  raw: string;
}

/** Splits a note body into `##` sections, each with its own status (a callout on its first line) and text. */
export const sections = (body: string, title: string, noteStatus: Status): Section[] => {
  const cleaned = body.replace(/<!--[\s\S]*?-->/g, "").replace(/^# .*\n/m, "");
  const parts = cleaned.split(/^## /m);
  const out: Section[] = [];
  parts.forEach((part, i) => {
    let heading = title;
    let content = part;
    if (i > 0) {
      const nl = part.indexOf("\n");
      heading = (nl === -1 ? part : part.slice(0, nl)).trim();
      content = nl === -1 ? "" : part.slice(nl + 1);
    }
    content = content.trim();
    if (!content) return;
    const m = content.match(SECTION_STATUS);
    out.push({ heading, status: (m ? m[1] : noteStatus) as Status, raw: content });
  });
  return out;
};

/** Source ids declared by the source notes ("- `id`: where" lines). */
const sourceIds = (notes: ParsedNote[]): Set<string> => {
  const ids = new Set<string>();
  for (const n of notes) {
    if (n.fields.type !== "source") continue;
    for (const m of n.body.matchAll(/^- `([a-z0-9-]+)`:/gm)) ids.add(m[1]!);
    ids.add(strOf(n.fields.id));
  }
  return ids;
};

/** `/path` written as code in a note (`` `/booking` ``): a page of the site the note sends visitors to. */
const SITE_PATH = /`(\/[^`\s]*)`/g;

/** Whether `path` is one of the site's public pages; a manifest pattern segment (":slug") matches one plain segment. */
export const isSitePath = (path: string, sitePaths: readonly string[]): boolean => {
  const clean = path.replace(/[?#].*$/, "");
  const parts = clean.split("/");
  return sitePaths.some((p) => {
    if (p === clean) return true;
    const q = p.split("/");
    return q.length === parts.length && q.every((seg, i) => (seg.startsWith(":") ? /^[a-z0-9][a-z0-9-]*$/.test(parts[i]!) : seg === parts[i]));
  });
};

/**
 * Reads and checks every note, then compiles the public, active ones into the agents' index.
 * `index` is null when there is any error: a broken brain is never published.
 * `sitePaths` (the site's public pages, site-paths.generated.ts) turns on the check that every page a public note
 * names exists and is public; the Node build and Knowledge Studio always pass it.
 */
export const compileBrain = (files: SourceFile[], options: { audience?: "public" | "admin"; sitePaths?: readonly string[] } = {}): CompileResult => {
  const audience = options.audience ?? "public";
  const errors: string[] = [];
  const notes: ParsedNote[] = [];
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    if (!isNotePath(f.path)) continue;
    const parsed = parseFrontmatter(f.text.replace(/\r\n/g, "\n"), f.path);
    errors.push(...parsed.errors);
    if (!parsed.fields) continue;
    notes.push({ file: f.path, fields: parsed.fields, body: parsed.body ?? "", links: [], archived: isArchivedPath(f.path) });
  }

  const ids = new Map<string, string>();
  const names = new Map<string, string>(); // normalized title/alias -> note id
  for (const n of notes) {
    const f = n.fields;
    const id = strOf(f.id);
    for (const k of REQUIRED) if (!f[k]) errors.push(`${n.file}: missing "${k}"`);
    if (id && !/^[a-z0-9][a-z0-9-]*$/.test(id)) errors.push(`${n.file}: id "${id}" must be lower case letters, digits and dashes`);
    if (id && ids.has(id)) errors.push(`${n.file}: id "${id}" is already used by ${ids.get(id)}`);
    if (id) ids.set(id, n.file);
    if (f.brand && !BRANDS.includes(strOf(f.brand) as Brand)) errors.push(`${n.file}: unknown brand "${strOf(f.brand)}"`);
    if (f.type && !TYPES.includes(strOf(f.type) as NoteType)) errors.push(`${n.file}: unknown type "${strOf(f.type)}"`);
    if (f.visibility && !VISIBILITY.includes(strOf(f.visibility) as Visibility)) errors.push(`${n.file}: unknown visibility "${strOf(f.visibility)}"`);
    if (f.status && !STATUSES.includes(strOf(f.status) as Status)) errors.push(`${n.file}: unknown status "${strOf(f.status)}"`);
    if (f.updated && !/^\d{4}-\d{2}-\d{2}$/.test(strOf(f.updated))) errors.push(`${n.file}: "updated" must be YYYY-MM-DD`);
    const type = strOf(f.type);
    if (!n.archived && f.visibility === "public" && !["source", "index", "agent"].includes(type) && !listOf(f.sources).length)
      errors.push(`${n.file}: a public note must cite at least one source`);
    if (n.archived) continue; // archived notes keep their names out of the link namespace
    for (const name of [strOf(f.title), ...listOf(f.aliases)].filter(Boolean)) {
      const key = phrase(name);
      const other = names.get(key);
      if (other && other !== id) errors.push(`${n.file}: the name "${name}" is also used by note "${other}" (links would be ambiguous)`);
      else names.set(key, id);
    }
  }

  const archivedNames = new Map<string, string>();
  for (const n of notes.filter((x) => x.archived)) {
    for (const name of [strOf(n.fields.title), ...listOf(n.fields.aliases)].filter(Boolean)) archivedNames.set(phrase(name), strOf(n.fields.id));
  }

  const known = sourceIds(notes);
  const byId = new Map(notes.filter((n) => !n.archived).map((n) => [strOf(n.fields.id), n]));
  for (const n of notes) {
    for (const s of listOf(n.fields.sources)) if (!known.has(s)) errors.push(`${n.file}: source "${s}" is not declared in sources/`);
    if (n.archived) continue;
    for (const m of n.body.matchAll(WIKILINK)) {
      const target = names.get(phrase(m[1]!));
      if (!target) {
        const archived = archivedNames.get(phrase(m[1]!));
        errors.push(archived
          ? `${n.file}: the link [[${m[1]}]] points to the archived note "${archived}"`
          : `${n.file}: the link [[${m[1]}]] matches no note title or alias`);
        continue;
      }
      if (n.fields.visibility === "public" && byId.get(target)?.fields.visibility !== "public")
        errors.push(`${n.file}: a public note links to the non-public note "${target}"`);
      if (target !== n.fields.id && !n.links.includes(target)) n.links.push(target);
    }
    for (const sec of sections(n.body, strOf(n.fields.title), strOf(n.fields.status) as Status)) {
      if (/^>\s*\[!/.test(sec.raw) && !SECTION_STATUS.test(sec.raw)) errors.push(`${n.file}: unknown status callout in "${sec.heading}"`);
    }
    if (options.sitePaths && n.fields.visibility === "public") {
      for (const m of n.body.matchAll(SITE_PATH)) {
        if (!isSitePath(m[1]!, options.sitePaths)) errors.push(`${n.file}: "${m[1]}" is not a public page of the site (src/routes/manifest.ts)`);
      }
    }
  }

  // Agent access notes: which brands each agent may read. Checked here, enforced by the retrieval at run time.
  const agents: Record<string, AgentAccess> = {};
  for (const n of notes.filter((x) => !x.archived && x.fields.type === "agent")) {
    const agentId = strOf(n.fields.agent);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
      errors.push(`${n.file}: an agent note needs "agent: <agent id>"`);
      continue;
    }
    if (agents[agentId]) errors.push(`${n.file}: agent "${agentId}" is configured twice`);
    const brands = listOf(n.fields.brands);
    const referral = listOf(n.fields.referral_brands);
    for (const b of [...brands, ...referral]) if (!BRANDS.includes(b as Brand)) errors.push(`${n.file}: unknown brand "${b}" in the agent's access`);
    if (!brands.length) errors.push(`${n.file}: an agent needs at least one brand in "brands"`);
    const fallback = strOf(n.fields.fallback_note);
    if (fallback && byId.get(fallback)?.fields.visibility !== "public") errors.push(`${n.file}: fallback_note "${fallback}" is not a public note`);
    agents[agentId] = { brands: brands as Brand[], referralBrands: referral as Brand[], fallbackNote: fallback || null, pinned: listOf(n.fields.pinned) };
  }

  if (errors.length) return { index: null, notes, errors };

  // The agents' index holds public notes only. The "admin" audience (Knowledge Studio's own search, never written to
  // disk or sent to an agent) holds every active note.
  const publicNotes = notes
    .filter((n) => !n.archived && (audience === "admin" || n.fields.visibility === "public") && n.fields.type !== "agent")
    .sort((a, b) => (strOf(a.fields.id) < strOf(b.fields.id) ? -1 : strOf(a.fields.id) > strOf(b.fields.id) ? 1 : 0));
  const indexNotes: BrainNote[] = publicNotes.map((n) => {
    const f = n.fields;
    const facts: Record<string, string> = {};
    for (const [k, v] of Object.entries(f)) if (k.startsWith("fact_") && typeof v === "string") facts[k.slice(5)] = v;
    return {
      id: strOf(f.id), title: strOf(f.title), brand: strOf(f.brand) as Brand, type: strOf(f.type) as NoteType,
      status: strOf(f.status) as Status, updated: strOf(f.updated), sources: listOf(f.sources), aliases: listOf(f.aliases),
      tags: listOf(f.tags), links: n.links, facts, names: [strOf(f.title), ...listOf(f.aliases)].map(phrase).filter(Boolean),
    };
  });

  const chunks: BrainChunk[] = [];
  for (const n of publicNotes) {
    const f = n.fields;
    if (f.type === "index" || f.type === "source") continue;
    sections(n.body, strOf(f.title), strOf(f.status) as Status).forEach((sec, i) => {
      const text = sec.raw.replace(WIKILINK, (_m: string, target: string, shown?: string) => (shown ?? target).trim());
      const meta = [strOf(f.title), ...listOf(f.aliases), ...listOf(f.tags), sec.heading].join(" ");
      chunks.push({
        id: `${strOf(f.id)}#${i}`, note: strOf(f.id), heading: sec.heading, status: sec.status, text,
        body: termCounts(text), meta: termCounts(meta), length: terms(text).length,
      });
    });
  }

  const chunkIds = new Set(chunks.map((c) => c.id));
  for (const [agentId, access] of Object.entries(agents)) {
    for (const p of access.pinned) if (!chunkIds.has(p)) errors.push(`agent ${agentId}: pinned passage "${p}" does not exist`);
  }
  if (errors.length) return { index: null, notes, errors };

  const df: Record<string, number> = {};
  for (const c of chunks) for (const t of new Set([...Object.keys(c.body), ...Object.keys(c.meta)])) df[t] = (df[t] ?? 0) + 1;
  const sortedDf = Object.fromEntries(Object.entries(df).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const avgLength = chunks.length ? Math.round((chunks.reduce((s, c) => s + c.length, 0) / chunks.length) * 100) / 100 : 1;
  const sortedAgents = Object.fromEntries(Object.entries(agents).sort(([a], [b]) => (a < b ? -1 : 1)));
  const fingerprint = sha256Hex(JSON.stringify({ indexNotes, chunks: chunks.map((c) => [c.id, c.status, c.text]), agents: sortedAgents })).slice(0, 16);

  return { index: { fingerprint, notes: indexNotes, chunks, df: sortedDf, avgLength, agents: sortedAgents }, notes, errors };
};

/** The generated TypeScript module of an index. Deterministic: the same notes give the same bytes. */
export const renderIndexModule = (index: BrainIndex): string =>
  [
    "// GENERATED by scripts/brain/build.mjs (or a Knowledge Studio publication) from houcine-world-brain/ -- do not edit by hand.",
    "// Only notes with `visibility: public` are compiled in. Rebuild: node --experimental-strip-types scripts/brain/build.mjs",
    'import type { BrainIndex } from "./types.ts";',
    "",
    `export const BRAIN_INDEX: BrainIndex = ${JSON.stringify(index, null, 1)};`,
    "",
  ].join("\n");

/**
 * The brain's Markdown files bundled into the Knowledge Studio function (read-only mode when no GitHub token is set,
 * and a quick first view). Admin-only: the Studio serves it to super admins after the server-side check.
 */
export const renderSnapshotModule = (files: SourceFile[]): string =>
  [
    "// GENERATED by scripts/brain/build.mjs (or a Knowledge Studio publication) -- do not edit by hand.",
    "// Every Markdown file of houcine-world-brain/, for the Knowledge Studio function (admin only).",
    "",
    `export const BRAIN_SNAPSHOT: { path: string; text: string }[] = ${JSON.stringify(
      [...files].filter((f) => f.path.endsWith(".md")).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => ({ path: f.path, text: f.text })),
      null,
      1,
    )};`,
    "",
  ].join("\n");

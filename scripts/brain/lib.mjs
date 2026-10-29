// The knowledge-brain compiler: reads the Markdown notes of houcine-world-brain/, checks them strictly, and builds the
// search index the agents use (supabase/functions/_shared/brain/index.generated.ts). Only PUBLIC notes are compiled;
// internal and confidential notes never leave the repository. Run with --experimental-strip-types (it imports the
// shared text code in TypeScript, so the build and the run-time search tokenize identically). docs/knowledge-brain.md.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { phrase, termCounts, terms } from "../../supabase/functions/_shared/brain/text.ts";

export const BRANDS = ["houcine-world", "la-rosa-view", "houcine-tech", "houcine-studio", "houcine-management", "houcine-education"];
export const TYPES = ["overview", "topic", "service", "person", "policy", "faq", "contact", "relationship", "index", "source"];
export const VISIBILITY = ["public", "internal", "confidential"];
export const STATUSES = ["verified", "policy", "incomplete", "pending", "outdated"];
const REQUIRED = ["id", "title", "brand", "type", "visibility", "status", "updated"];
const KNOWN = new Set([...REQUIRED, "aliases", "tags", "sources"]);
const LIST_FIELDS = new Set(["aliases", "tags", "sources"]);
const NOT_NOTES = new Set(["README.md"]);
const NOT_NOTE_DIRS = new Set(["schemas", ".obsidian", "evals"]);

/** Every .md file under the brain folder that is a note (not the README, not the schema folder). */
export const listNoteFiles = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (!NOT_NOTE_DIRS.has(name) && !name.startsWith(".")) walk(p);
      } else if (name.endsWith(".md") && !(d === dir && NOT_NOTES.has(name))) out.push(p);
    }
  };
  walk(dir);
  return out;
};

const unquote = (v) => {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
};

/** The header between the first two `---` lines: `key: value` and `key: [a, b]` only. Errors name the line. */
export const parseFrontmatter = (text, file) => {
  const errors = [];
  if (!text.startsWith("---\n")) return { errors: [`${file}: no header (a note starts with a line "---")`] };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { errors: [`${file}: the header is not closed by a "---" line`] };
  const fields = {};
  const lines = text.slice(4, end).split("\n");
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const m = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/);
    if (!m) return errors.push(`${file}: header line ${i + 2} is not "key: value"`);
    const [, key, raw] = m;
    if (key in fields) return errors.push(`${file}: "${key}" appears twice`);
    if (!KNOWN.has(key) && !key.startsWith("fact_")) return errors.push(`${file}: unknown header field "${key}"`);
    if (LIST_FIELDS.has(key)) {
      const v = raw.trim();
      if (!v.startsWith("[") || !v.endsWith("]")) return errors.push(`${file}: "${key}" must be a list like [a, b]`);
      fields[key] = v.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else {
      fields[key] = unquote(raw);
    }
  });
  return { fields, body: text.slice(end + 4).replace(/^\n/, ""), errors };
};

const SECTION_STATUS = /^>\s*\[!(verified|policy|incomplete|pending|outdated)\]\s*/;
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

/** Split a note body into `##` sections, each with its own status (a callout on its first line) and text. */
export const sections = (body, title, noteStatus) => {
  const cleaned = body.replace(/<!--[\s\S]*?-->/g, "").replace(/^# .*\n/m, "");
  const parts = cleaned.split(/^## /m);
  const out = [];
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
    out.push({ heading, status: m ? m[1] : noteStatus, raw: content });
  });
  return out;
};

/** Source ids declared by the source notes ("- `id`: where" lines). */
const sourceIds = (notes) => {
  const ids = new Set();
  for (const n of notes) {
    if (n.fields.type !== "source") continue;
    for (const m of n.body.matchAll(/^- `([a-z0-9-]+)`:/gm)) ids.add(m[1]);
    ids.add(n.fields.id);
  }
  return ids;
};

/**
 * Reads and checks every note, then compiles the public ones.
 * Returns { index, notes, errors }: `index` is null when there is any error (a broken brain is never published).
 */
export const buildBrain = (dir) => {
  const errors = [];
  const notes = [];
  for (const file of listNoteFiles(dir)) {
    const rel = relative(dir, file).split(sep).join("/");
    const parsed = parseFrontmatter(readFileSync(file, "utf8"), rel);
    errors.push(...parsed.errors);
    if (!parsed.fields) continue;
    notes.push({ file: rel, fields: parsed.fields, body: parsed.body });
  }

  const ids = new Map();
  const names = new Map(); // normalized title/alias -> note id
  for (const n of notes) {
    const f = n.fields;
    for (const k of REQUIRED) if (!f[k]) errors.push(`${n.file}: missing "${k}"`);
    if (f.id && !/^[a-z0-9][a-z0-9-]*$/.test(f.id)) errors.push(`${n.file}: id "${f.id}" must be lower case letters, digits and dashes`);
    if (f.id && ids.has(f.id)) errors.push(`${n.file}: id "${f.id}" is already used by ${ids.get(f.id)}`);
    if (f.id) ids.set(f.id, n.file);
    if (f.brand && !BRANDS.includes(f.brand)) errors.push(`${n.file}: unknown brand "${f.brand}"`);
    if (f.type && !TYPES.includes(f.type)) errors.push(`${n.file}: unknown type "${f.type}"`);
    if (f.visibility && !VISIBILITY.includes(f.visibility)) errors.push(`${n.file}: unknown visibility "${f.visibility}"`);
    if (f.status && !STATUSES.includes(f.status)) errors.push(`${n.file}: unknown status "${f.status}"`);
    if (f.updated && !/^\d{4}-\d{2}-\d{2}$/.test(f.updated)) errors.push(`${n.file}: "updated" must be YYYY-MM-DD`);
    if (f.visibility === "public" && f.type !== "source" && f.type !== "index" && !(f.sources ?? []).length)
      errors.push(`${n.file}: a public note must cite at least one source`);
    for (const name of [f.title, ...(f.aliases ?? [])].filter(Boolean)) {
      const key = phrase(name);
      const other = names.get(key);
      if (other && other !== f.id) errors.push(`${n.file}: the name "${name}" is also used by note "${other}" (links would be ambiguous)`);
      else names.set(key, f.id);
    }
  }

  const known = sourceIds(notes);
  const byId = new Map(notes.map((n) => [n.fields.id, n]));
  for (const n of notes) {
    for (const s of n.fields.sources ?? []) if (!known.has(s)) errors.push(`${n.file}: source "${s}" is not declared in sources/`);
    n.links = [];
    for (const m of n.body.matchAll(WIKILINK)) {
      const target = names.get(phrase(m[1]));
      if (!target) {
        errors.push(`${n.file}: the link [[${m[1]}]] matches no note title or alias`);
        continue;
      }
      if (n.fields.visibility === "public" && byId.get(target)?.fields.visibility !== "public")
        errors.push(`${n.file}: a public note links to the non-public note "${target}"`);
      if (target !== n.fields.id && !n.links.includes(target)) n.links.push(target);
    }
    for (const sec of sections(n.body, n.fields.title ?? "", n.fields.status)) {
      if (/^>\s*\[!/.test(sec.raw) && !SECTION_STATUS.test(sec.raw)) errors.push(`${n.file}: unknown status callout in "${sec.heading}"`);
    }
  }

  if (errors.length) return { index: null, notes, errors };

  const publicNotes = notes.filter((n) => n.fields.visibility === "public").sort((a, b) => a.fields.id.localeCompare(b.fields.id));
  const indexNotes = publicNotes.map((n) => {
    const f = n.fields;
    const facts = {};
    for (const [k, v] of Object.entries(f)) if (k.startsWith("fact_")) facts[k.slice(5)] = v;
    return {
      id: f.id, title: f.title, brand: f.brand, type: f.type, status: f.status, updated: f.updated,
      sources: f.sources ?? [], aliases: f.aliases ?? [], tags: f.tags ?? [], links: n.links, facts,
      names: [f.title, ...(f.aliases ?? [])].map(phrase).filter(Boolean),
    };
  });

  const chunks = [];
  for (const n of publicNotes) {
    const f = n.fields;
    if (f.type === "index" || f.type === "source") continue;
    sections(n.body, f.title, f.status).forEach((sec, i) => {
      const text = sec.raw.replace(WIKILINK, (_, target, shown) => (shown ?? target).trim());
      const meta = [f.title, ...(f.aliases ?? []), ...(f.tags ?? []), sec.heading].join(" ");
      chunks.push({
        id: `${f.id}#${i}`, note: f.id, heading: sec.heading, status: sec.status, text,
        body: termCounts(text), meta: termCounts(meta), length: terms(text).length,
      });
    });
  }

  const df = {};
  for (const c of chunks) for (const t of new Set([...Object.keys(c.body), ...Object.keys(c.meta)])) df[t] = (df[t] ?? 0) + 1;
  const sortedDf = Object.fromEntries(Object.entries(df).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const avgLength = chunks.length ? Math.round((chunks.reduce((s, c) => s + c.length, 0) / chunks.length) * 100) / 100 : 1;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ indexNotes, chunks: chunks.map((c) => [c.id, c.status, c.text]) }))
    .digest("hex")
    .slice(0, 16);

  return { index: { fingerprint, notes: indexNotes, chunks, df: sortedDf, avgLength }, notes, errors };
};

/** The generated TypeScript module for an index. Deterministic: the same notes give the same bytes. */
export const renderIndexModule = (index) =>
  [
    "// GENERATED by scripts/brain/build.mjs from houcine-world-brain/ -- do not edit by hand.",
    "// Only notes with `visibility: public` are compiled in. Rebuild: node --experimental-strip-types scripts/brain/build.mjs",
    'import type { BrainIndex } from "./types.ts";',
    "",
    `export const BRAIN_INDEX: BrainIndex = ${JSON.stringify(index, null, 1)};`,
    "",
  ].join("\n");

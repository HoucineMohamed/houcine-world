// The brain's generated maps (docs/knowledge-brain.md, "Maps and charts"): a dashboard note of charts and diagrams
// and an Obsidian Canvas board of every note, written into houcine-world-brain/maps/generated/ by
// scripts/brain/build.mjs AND by every Knowledge Studio publication, from the notes themselves. Pure and deterministic
// (no clock, no random): the same notes always give the same bytes, so CI can check they are current.
//
// Everything is counted, never typed: numbers come from the compiled notes and the coverage score, titles and links
// from the notes. The folder is not a note folder (compile.ts), so these files are never compiled into any AI's index;
// they are for the owner, in Obsidian (Mermaid and Canvas are built in, no plugin) and on GitHub.

import { BRANDS, sections, type CompileResult } from "./compile.ts";
import type { CoverageReport } from "./coverage.ts";
import type { BrainIndex, Status } from "./types.ts";

export const GENERATED_DIR = "maps/generated";
export const DASHBOARD_PATH = `${GENERATED_DIR}/dashboard.md`;
export const CANVAS_PATH = `${GENERATED_DIR}/knowledge-map.canvas`;

export const BRAND_NAMES: Record<string, string> = {
  "houcine-world": "Houcine.world (shared)",
  "la-rosa-view": "La Rosa View",
  "houcine-tech": "Houcine.tech",
  "houcine-studio": "Houcine.studio",
  "houcine-management": "Houcine.management",
  "houcine-education": "Houcine.education",
};
/** Obsidian Canvas colour presets ("1" red ... "6" purple), one per brand, as in the Studio. */
const CANVAS_COLORS: Record<string, string> = {
  "houcine-world": "0", "la-rosa-view": "1", "houcine-tech": "5", "houcine-studio": "6", "houcine-management": "3", "houcine-education": "4",
};
const STATUS_NAMES: Record<Status, string> = {
  verified: "Verified", policy: "Current policy", incomplete: "Incomplete", pending: "Awaiting confirmation", outdated: "Outdated",
};
/** Note types left out of the graphs: entry points, source lists and AI access, which link to everything. */
const NOT_IN_GRAPH = new Set(["index", "source", "agent"]);

const str = (v: unknown): string => (typeof v === "string" ? v : "");
/** A Mermaid label: double quotes and anything that could end the label are replaced. */
const label = (s: string): string => s.replace(/["\\[\]{}<>|`]/g, "'").replace(/\s+/g, " ").trim();
const nodeId = (id: string): string => `n_${id.replace(/[^a-z0-9]/gi, "_")}`;
const bar = (n: number, max: number, width = 20): string => (max > 0 ? "█".repeat(Math.round((n / max) * width)) : "") || (n > 0 ? "▏" : "");

export interface GeneratedMaps {
  dashboard: string;
  canvas: string;
}

/**
 * The dashboard and the canvas. `admin` is the compile of every active note (audience "admin"), `index` the public
 * index the AI uses, `coverage` the fixed visitor questions scored on that index.
 */
export const renderMaps = (admin: CompileResult, index: BrainIndex, coverage: CoverageReport): GeneratedMaps => {
  const active = admin.notes.filter((n) => !n.archived);
  const byId = new Map(active.map((n) => [str(n.fields.id), n]));
  const graphNotes = active.filter((n) => !NOT_IN_GRAPH.has(str(n.fields.type))).sort((a, b) => (a.file < b.file ? -1 : 1));
  const brandOf = (n: (typeof active)[number]) => (BRANDS.includes(str(n.fields.brand) as never) ? str(n.fields.brand) : "houcine-world");
  const visOf = (n: (typeof active)[number]) => str(n.fields.visibility);

  // ---------- numbers ----------
  const notesByBrand = BRANDS.map((b) => ({ b, n: active.filter((x) => brandOf(x) === b).length }));
  const passagesByBrand = BRANDS.map((b) => ({ b, n: index.chunks.filter((c) => index.notes.find((x) => x.id === c.note)?.brand === b).length }));
  const passagesByStatus = (Object.keys(STATUS_NAMES) as Status[]).map((s) => ({ s, n: index.chunks.filter((c) => c.status === s).length }));
  const links = graphNotes.reduce((sum, n) => sum + n.links.filter((t) => byId.has(t) && !NOT_IN_GRAPH.has(str(byId.get(t)!.fields.type))).length, 0);
  const waiting: { title: string; heading: string; status: Status }[] = [];
  for (const n of active.filter((x) => !NOT_IN_GRAPH.has(str(x.fields.type)) && visOf(x) === "public")) {
    for (const s of sections(n.body, str(n.fields.title), (str(n.fields.status) || "verified") as Status)) {
      if (s.status === "pending" || s.status === "incomplete" || s.status === "outdated") waiting.push({ title: str(n.fields.title), heading: s.heading, status: s.status });
    }
  }
  const count = (v: string) => active.filter((n) => visOf(n) === v).length;

  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);
  add(
    "# Brain dashboard",
    "",
    "> [!info] Generated from the notes by `scripts/brain/build.mjs` and by every Knowledge Studio publication. Do not edit:",
    "> it is rewritten each time. Charts are Mermaid diagrams, which Obsidian and GitHub draw without any plugin.",
    `> AI index fingerprint \`${index.fingerprint}\`.`,
    "",
    "## At a glance",
    "",
    "| | |",
    "| --- | --- |",
    `| Active notes | ${active.length} (${count("public")} public, ${count("internal")} internal, ${count("confidential")} restricted) |`,
    `| Archived notes | ${admin.notes.length - active.length} |`,
    `| Passages the public AI can read | ${index.chunks.length} |`,
    `| Links between notes | ${links} |`,
    `| Sections waiting for the owner | ${waiting.length} |`,
    "",
    "## Notes by brand",
    "",
    "```mermaid",
    "pie showData title Active notes by brand",
    ...notesByBrand.filter((x) => x.n > 0).map((x) => `  "${label(BRAND_NAMES[x.b]!)}" : ${x.n}`),
    "```",
    "",
    "## How sure the public knowledge is",
    "",
    "Every passage the public AI can read, by its confidence. The AI never states an incomplete, unconfirmed or outdated passage as a fact.",
    "",
    "```mermaid",
    "pie showData title Public passages by confidence",
    ...passagesByStatus.filter((x) => x.n > 0).map((x) => `  "${STATUS_NAMES[x.s]}" : ${x.n}`),
    "```",
    "",
    "## Passages per brand in the AI's index",
    "",
    "| Brand | Passages | |",
    "| --- | ---: | --- |",
    ...passagesByBrand.map((x) => `| ${BRAND_NAMES[x.b]} | ${x.n} | ${bar(x.n, Math.max(...passagesByBrand.map((p) => p.n)))} |`),
    "",
    "## Visitor questions answered",
    "",
    "The fixed visitor questions of `supabase/functions/_shared/brain/coverage-questions.ts`, searched without any AI call (Knowledge Studio, AI Playground, Coverage).",
    "",
    "| Brand | Answered | Awaiting confirmation | Known gaps | Not found | Answered share |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...coverage.brands.map((c) => `| ${BRAND_NAMES[c.brand]} | ${c.answered} | ${c.awaiting} | ${c.gap} | ${c.not_found} | ${bar(c.answered, c.total, 10)}${"░".repeat(Math.max(0, 10 - Math.round((c.answered / Math.max(1, c.total)) * 10)))} ${c.answered}/${c.total} |`),
    "",
  );

  // ---------- what the public AI may read ----------
  const agentEntries = Object.entries(index.agents ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (agentEntries.length) {
    add("## What each public AI may read", "", "```mermaid", "flowchart LR");
    for (const [agentId, access] of agentEntries) {
      const a = nodeId(`agent_${agentId}`);
      add(`  ${a}(["${label(agentId)}"])`);
      for (const b of access.brands) add(`  ${a} -->|all public notes| ${nodeId(`brand_${b}`)}["${label(BRAND_NAMES[b] ?? b)}"]`);
      for (const b of access.referralBrands) add(`  ${a} -.->|overview only| ${nodeId(`brand_${b}`)}["${label(BRAND_NAMES[b] ?? b)}"]`);
    }
    add("```", "", "Internal and restricted notes, drafts and archived notes never reach any AI, whatever this shows.", "");
  }

  // ---------- the link graph ----------
  add("## Every note and its links", "", "One box per note, grouped by brand; dashed boxes are internal (never sent to an AI). The same graph is in [[knowledge-map.canvas|the Canvas board]] and in Obsidian's graph view.", "", "```mermaid", "flowchart LR");
  for (const b of BRANDS) {
    const mine = graphNotes.filter((n) => brandOf(n) === b);
    if (!mine.length) continue;
    add(`  subgraph ${nodeId(`group_${b}`)}["${label(BRAND_NAMES[b]!)}"]`);
    for (const n of mine) add(`    ${nodeId(str(n.fields.id))}["${label(str(n.fields.title))}"]${visOf(n) === "public" ? "" : ":::internal"}`);
    add("  end");
  }
  for (const n of graphNotes) {
    for (const t of [...n.links].sort()) {
      if (byId.has(t) && !NOT_IN_GRAPH.has(str(byId.get(t)!.fields.type))) add(`  ${nodeId(str(n.fields.id))} --> ${nodeId(t)}`);
    }
  }
  add("  classDef internal stroke-dasharray: 4 3", "```", "");

  // ---------- waiting for the owner ----------
  add("## Waiting for the owner", "", "Public sections the AI must not state as facts until the owner confirms them (the questions to ask: [[Open questions for the owner]]).", "");
  if (!waiting.length) add("Nothing is waiting.");
  else {
    add("| Note | Section | Status |", "| --- | --- | --- |");
    for (const w of waiting) add(`| [[${w.title}]] | ${w.heading.replace(/\|/g, "/")} | ${STATUS_NAMES[w.status]} |`);
  }
  add("");

  // ---------- the canvas ----------
  const nodes: Record<string, unknown>[] = [];
  const edges: Record<string, unknown>[] = [];
  const W = 280, H = 60, GAP = 24, PAD = 30, COL = W + PAD * 2 + 60;
  let col = 0;
  for (const b of BRANDS) {
    const mine = graphNotes.filter((n) => brandOf(n) === b);
    if (!mine.length) continue;
    const x = col * COL;
    nodes.push({ id: `group-${b}`, type: "group", x, y: 0, width: W + PAD * 2, height: PAD * 2 + 20 + mine.length * (H + GAP) - GAP, label: BRAND_NAMES[b], color: CANVAS_COLORS[b] });
    mine.forEach((n, i) => {
      nodes.push({ id: `note-${str(n.fields.id)}`, type: "file", file: n.file, x: x + PAD, y: PAD + 20 + i * (H + GAP), width: W, height: H, ...(CANVAS_COLORS[b] !== "0" ? { color: CANVAS_COLORS[b] } : {}) });
    });
    col++;
  }
  for (const n of graphNotes) {
    for (const t of [...n.links].sort()) {
      if (byId.has(t) && !NOT_IN_GRAPH.has(str(byId.get(t)!.fields.type))) edges.push({ id: `link-${str(n.fields.id)}-${t}`, fromNode: `note-${str(n.fields.id)}`, toNode: `note-${t}` });
    }
  }

  return {
    dashboard: `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`,
    canvas: `${JSON.stringify({ nodes, edges }, null, "\t")}\n`,
  };
};

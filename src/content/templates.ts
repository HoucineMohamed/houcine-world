// Templates for the two kinds of long content entry: a case study (src/content/work.ts) and a journal post
// (src/content/journal.ts). Two uses:
//   - draftSource() writes a new entry, as TypeScript ready to paste at the top of the list, with every text
//     a "TODO" line: the content test refuses it until each one is replaced, and it starts as a draft, so it
//     never reaches a page early (scripts/dev/new-entry.mjs prints it).
//   - caseStudyStructuredData() and journalPostStructuredData() are the JSON-LD the two entry pages add.
// Tested in scripts/dev/templates.test.mjs. No browser or "@" imports, so plain Node can import this file.
import type { Post, Vertical, Work } from "./schema.ts";

/** "How Houcine.world is built" → "how-houcine-world-is-built" (lower-case ascii words joined by hyphens). */
export const slugify = (title: string): string =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

const todo = (what: string) => `TODO: ${what}`;

/** A new case study: a draft, every text to write. */
export const caseStudyDraft = (title: string, vertical: Vertical, date?: string): Work => ({
  slug: slugify(title),
  title,
  vertical,
  summary: todo("one or two plain sentences shown on the Work page and in search"),
  context: todo("the situation before the work"),
  role: todo("what you did yourself"),
  approach: todo("how the work was done"),
  outcome: todo("what changed, only with facts you can show"),
  ...(date ? { date } : {}),
  tags: [],
  gallery: [],
  links: [],
  draft: true,
});

/** A new journal post: a draft, every text to write. */
export const journalPostDraft = (title: string, date: string): Post => ({
  slug: slugify(title),
  title,
  summary: todo("one or two plain sentences shown in the list and the feed"),
  date,
  tags: [],
  body: [{ type: "p", text: todo("the first paragraph") }],
  draft: true,
});

/** An entry as TypeScript source: object keys without quotes, two-space indent, a trailing comma. */
export const draftSource = (entry: Work | Post): string =>
  `${JSON.stringify(entry, null, 2).replace(/^(\s*)"([a-zA-Z]+)":/gm, "$1$2:")},\n`;

const SCHEMA = "https://schema.org";

export const caseStudyStructuredData = (entry: Work, site: { baseUrl: string; name: string }) => ({
  "@context": SCHEMA,
  "@type": "CreativeWork",
  name: entry.title,
  description: entry.summary,
  url: `${site.baseUrl}/work/${entry.slug}`,
  ...(entry.date ? { dateCreated: entry.date } : {}),
  ...(entry.tags.length > 0 ? { keywords: entry.tags.join(", ") } : {}),
  creator: { "@type": "Organization", name: site.name, url: `${site.baseUrl}/` },
});

export const journalPostStructuredData = (post: Post, site: { baseUrl: string; name: string }) => ({
  "@context": SCHEMA,
  "@type": "BlogPosting",
  headline: post.title,
  description: post.summary,
  url: `${site.baseUrl}/journal/${post.slug}`,
  datePublished: post.date,
  ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  author: { "@type": "Organization", name: site.name, url: `${site.baseUrl}/` },
  publisher: { "@type": "Organization", name: site.name, url: `${site.baseUrl}/` },
});

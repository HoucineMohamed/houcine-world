// Pure helpers over the content layer, used by the /work and /journal pages and by the feed
// (scripts/dev/seo-files.mjs writes public/rss.xml with rssXml()). Tested in
// scripts/dev/content-query.test.mjs. No browser or "@" imports, so plain Node can import this file.
import type { Post, Work } from "./schema.ts";

export const publishedWork = (list: readonly Work[]): Work[] => list.filter((w) => !w.draft);

export interface WorkFilter {
  vertical?: Work["vertical"] | null;
  /** Every tag listed must be on the entry. */
  tags?: readonly string[];
  /** Free text, matched without case against the title, summary and tags. */
  query?: string;
}

export const filterWork = (list: readonly Work[], { vertical, tags = [], query = "" }: WorkFilter): Work[] => {
  const needle = query.trim().toLowerCase();
  return list.filter((w) => {
    if (vertical && w.vertical !== vertical) return false;
    if (!tags.every((t) => w.tags.includes(t))) return false;
    if (needle === "") return true;
    return [w.title, w.summary, ...w.tags].some((s) => s.toLowerCase().includes(needle));
  });
};

/** The tags used in a list, once each, sorted. */
export const tagsOf = (list: readonly { tags: readonly string[] }[]): string[] =>
  [...new Set(list.flatMap((x) => x.tags))].sort((a, b) => a.localeCompare(b));

const wordsOf = (post: Post): number =>
  post.body
    .flatMap((b) => (b.type === "ul" ? b.items : [b.text]))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

/** Minutes to read, at 200 words a minute, rounded up, never less than one. */
export const readingMinutes = (post: Post): number => Math.max(1, Math.ceil(wordsOf(post) / 200));

/** Published posts, newest first. */
export const publishedPosts = (list: readonly Post[]): Post[] =>
  list.filter((p) => !p.draft).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/** Up to three other published posts that share a tag, the most shared tags first, then the newest. */
export const relatedPosts = (post: Post, list: readonly Post[], max = 3): Post[] =>
  publishedPosts(list)
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, shared: p.tags.filter((t) => post.tags.includes(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, max)
    .map((x) => x.p);

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** public/rss.xml: an RSS 2.0 feed of the published journal posts. */
export const rssXml = (list: readonly Post[], baseUrl: string): string => {
  const items = publishedPosts(list).map((p) => {
    const url = `${baseUrl}/journal/${p.slug}`;
    return [
      "    <item>",
      `      <title>${xmlEscape(p.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      `      <description>${xmlEscape(p.summary)}</description>`,
      ...p.tags.map((t) => `      <category>${xmlEscape(t)}</category>`),
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    "    <title>Houcine.world journal</title>",
    `    <link>${baseUrl}/journal</link>`,
    "    <description>Notes from the Houcine.world ecosystem.</description>",
    "    <language>en</language>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
};

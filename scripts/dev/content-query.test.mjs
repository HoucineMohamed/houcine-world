// Tests for the pure helpers the /work and /journal pages use (src/content/query.ts).
//
//   node --experimental-strip-types --test scripts/dev/content-query.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const q = await import(join(root, "src/content/query.ts"));

const w = (slug, vertical, tags, extra = {}) => ({
  slug, title: `Title ${slug}`, vertical, summary: `Summary of ${slug}`, context: "c", role: "r", approach: "a", outcome: "o",
  tags, gallery: [], links: [], draft: false, ...extra,
});
const work = [
  w("alpha", "studio", ["Branding"]),
  w("beta", "tech", ["React", "API"], { title: "Shop platform" }),
  w("gamma", "studio", ["UI/UX", "Branding"], { draft: true }),
  w("delta", "management", ["Events"], { date: "2026-01-02" }),
];

test("published work leaves drafts out", () => {
  assert.deepEqual(q.publishedWork(work).map((x) => x.slug), ["alpha", "beta", "delta"]);
});

test("filter by vertical, by tags (all must match) and by text, together", () => {
  const pub = q.publishedWork(work);
  assert.deepEqual(q.filterWork(pub, { vertical: "studio" }).map((x) => x.slug), ["alpha"]);
  assert.deepEqual(q.filterWork(pub, { tags: ["React", "API"] }).map((x) => x.slug), ["beta"]);
  assert.deepEqual(q.filterWork(pub, { tags: ["React", "Events"] }), []);
  assert.deepEqual(q.filterWork(pub, { query: "  SHOP " }).map((x) => x.slug), ["beta"]);
  assert.deepEqual(q.filterWork(pub, { query: "events" }).map((x) => x.slug), ["delta"], "tags are searched too");
  assert.deepEqual(q.filterWork(pub, {}).length, 3);
});

test("tags of a list: unique and sorted", () => {
  assert.deepEqual(q.tagsOf(q.publishedWork(work)), ["API", "Branding", "Events", "React"]);
});

const post = (slug, date, tags, words, draft = false) => ({
  slug, title: `Post ${slug}`, summary: "s", date, tags, draft,
  body: [{ type: "p", text: Array(words).fill("word").join(" ") }],
});

test("reading time: 200 words a minute, rounded up, at least one minute", () => {
  assert.equal(q.readingMinutes(post("a", "2026-01-01", [], 1)), 1);
  assert.equal(q.readingMinutes(post("a", "2026-01-01", [], 200)), 1);
  assert.equal(q.readingMinutes(post("a", "2026-01-01", [], 201)), 2);
  const withList = { ...post("a", "2026-01-01", [], 150), body: [{ type: "p", text: Array(150).fill("w").join(" ") }, { type: "ul", items: [Array(100).fill("w").join(" ")] }] };
  assert.equal(q.readingMinutes(withList), 2, "list items count");
});

test("published posts: newest first, drafts left out", () => {
  const posts = [post("old", "2025-01-01", [], 10), post("new", "2026-05-01", [], 10), post("draft", "2026-06-01", [], 10, true)];
  assert.deepEqual(q.publishedPosts(posts).map((p) => p.slug), ["new", "old"]);
});

test("related posts share a tag, exclude the post itself and drafts, at most three, most shared tags first", () => {
  const posts = [
    post("me", "2026-01-01", ["A", "B"], 10),
    post("two", "2026-01-02", ["A", "B"], 10),
    post("one", "2026-01-03", ["A"], 10),
    post("none", "2026-01-04", ["C"], 10),
    post("draft", "2026-01-05", ["A", "B"], 10, true),
    post("x", "2026-01-06", ["B"], 10),
    post("y", "2026-01-07", ["A"], 10),
  ];
  const related = q.relatedPosts(posts[0], posts).map((p) => p.slug);
  assert.equal(related.length, 3);
  assert.equal(related[0], "two");
  assert.ok(!related.includes("me") && !related.includes("draft") && !related.includes("none"));
});

test("the feed is valid RSS 2.0 with escaped text and only published posts", () => {
  const posts = [{ ...post("a-b", "2026-02-03", ["T"], 5), title: "Fish & <chips>", summary: 'A "quote"' }, post("hidden", "2026-02-04", [], 5, true)];
  const xml = q.rssXml(posts, "https://houcine.world");
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
  assert.match(xml, /<title>Fish &amp; &lt;chips&gt;<\/title>/);
  assert.match(xml, /<description>A &quot;quote&quot;<\/description>/);
  assert.match(xml, /<link>https:\/\/houcine.world\/journal\/a-b<\/link>/);
  assert.match(xml, /<pubDate>Tue, 03 Feb 2026 00:00:00 GMT<\/pubDate>/);
  assert.ok(!xml.includes("hidden"));
});

test("public/rss.xml is exactly the feed of the real journal", async () => {
  const { readFileSync } = await import("node:fs");
  const { journal } = await import(join(root, "src/content/journal.ts"));
  const { BASE_URL } = await import(join(root, "src/config/site.ts"));
  assert.equal(readFileSync(join(root, "public/rss.xml"), "utf8"), q.rssXml(journal, BASE_URL));
});

test("an empty feed is still a valid channel", () => {
  const xml = q.rssXml([], "https://houcine.world");
  assert.match(xml, /<channel>[\s\S]*<\/channel>/);
  assert.ok(!xml.includes("<item>"));
});

// The site search index: built in the browser from the route manifest and the content layer only (no
// third-party service, nothing sent anywhere). Tested in scripts/dev/search.test.mjs. Keep imports relative
// with ".ts" extensions so that plain Node can import this file.
import { CONTENT_PAGES, INDEXABLE } from "../routes/manifest.ts";
import { services } from "./services.ts";
import { faq } from "./faq.ts";

export interface SearchItem {
  kind: "Page" | "Service" | "Work" | "Post" | "Question";
  title: string;
  description: string;
  href: string;
}

const stripSite = (title: string) => title.replace(/\s*\|\s*[^|]+$/, "").trim() || title;

/** Every searchable item: indexable pages, published work and posts, services, questions. */
export const buildSearchIndex = (): SearchItem[] => [
  ...INDEXABLE.map((r) => ({ kind: "Page" as const, title: stripSite(r.title), description: r.description, href: r.path })),
  ...CONTENT_PAGES.map((p) => ({
    kind: p.path.startsWith("/work/") ? ("Work" as const) : ("Post" as const),
    title: stripSite(p.title),
    description: p.description,
    href: p.path,
  })),
  ...services.map((s) => ({ kind: "Service" as const, title: s.name, description: `${s.purpose} For: ${s.audience}`, href: s.path })),
  ...faq.map((f) => ({ kind: "Question" as const, title: f.question, description: f.answer, href: `/ecosystem#faq-${f.slug}` })),
];

/** Lower case, without accents, for matching. */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAX_RESULTS = 12;

/** Items where every word of the query appears; title matches first, then the original order. */
export const searchItems = (items: readonly SearchItem[], query: string): SearchItem[] => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return items
    .map((item, order) => {
      const title = fold(item.title);
      const all = `${title} ${fold(item.description)}`;
      if (!words.every((w) => all.includes(w))) return null;
      const score = words.filter((w) => title.includes(w)).length * 10 + (title.startsWith(words[0]) ? 5 : 0);
      return { item, score, order };
    })
    .filter((x): x is { item: SearchItem; score: number; order: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_RESULTS)
    .map((x) => x.item);
};

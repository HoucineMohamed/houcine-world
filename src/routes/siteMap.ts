// The groups of the human-readable sitemap (/sitemap, src/pages/SiteMap.tsx). Every indexable page and every
// published content entry appears exactly once (scripts/dev/sitemap-page.test.mjs); a new page with no group
// lands under "More" until it is given one. Never lists a private or owner-only page.
//
// Plain Node imports this file: keep its imports relative, with ".ts".
import { CONTENT_PAGES, INDEXABLE, shortTitle as label } from "./manifest.ts";

export interface SiteMapLink {
  path: string;
  label: string;
  description: string;
  /** Content entries sit under their list page. */
  children: SiteMapLink[];
}

export interface SiteMapGroup {
  title: string;
  links: SiteMapLink[];
}

const GROUPS: { title: string; paths: string[] }[] = [
  { title: "Houcine.world", paths: ["/", "/about", "/ecosystem", "/services", "/team", "/work", "/journal", "/contact"] },
  { title: "The four verticals", paths: ["/dev", "/designs", "/reads", "/manages"] },
  { title: "La Rosa View", paths: ["/larosaview", "/about-dj", "/booking", "/review"] },
  { title: "About this site", paths: ["/brand", "/brand-kit", "/status", "/changelog", "/sitemap"] },
  { title: "Legal", paths: ["/terms", "/privacy", "/data-deletion"] },
];

export const siteMapGroups = (): SiteMapGroup[] => {
  const pages = new Map(INDEXABLE.map((r) => [r.path, r]));
  const entries = (parent: string): SiteMapLink[] =>
    CONTENT_PAGES.filter((c) => c.path.startsWith(`${parent}/`)).map((c) => ({ path: c.path, label: label(c.title), description: c.description, children: [] }));
  const link = (path: string): SiteMapLink | null => {
    const r = pages.get(path);
    return r ? { path, label: path === "/" ? "Home" : label(r.title), description: r.description, children: entries(path) } : null;
  };
  const placed = new Set(GROUPS.flatMap((g) => g.paths));
  const groups = GROUPS.map((g) => ({ title: g.title, links: g.paths.map(link).filter((l): l is SiteMapLink => l !== null) }));
  const more = INDEXABLE.filter((r) => !placed.has(r.path)).map((r) => link(r.path)).filter((l): l is SiteMapLink => l !== null);
  if (more.length > 0) groups.push({ title: "More", links: more });
  return groups.filter((g) => g.links.length > 0);
};

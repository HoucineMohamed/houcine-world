// The breadcrumb trail of a public page (src/components/Breadcrumbs.tsx): Home, then each known page on the
// way down, labelled with the first part of its manifest or content title. Private, owner-only and unknown
// addresses get no trail, and neither does the home page.
//
// Plain Node imports this file in scripts/dev/breadcrumbs.test.mjs: keep its imports relative, with ".ts".
import { CONTENT_PAGES, INDEXABLE, shortTitle as label } from "./manifest.ts";

export interface Crumb {
  path: string;
  label: string;
}

const PAGES = new Map<string, string>([...INDEXABLE, ...CONTENT_PAGES].map((p) => [p.path, label(p.title)]));

export const breadcrumbTrail = (pathname: string): Crumb[] | null => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/" || !PAGES.has(path)) return null;
  const parts = path.split("/").slice(1);
  const trail: Crumb[] = [{ path: "/", label: "Home" }];
  parts.forEach((_, i) => {
    const prefix = `/${parts.slice(0, i + 1).join("/")}`;
    const name = PAGES.get(prefix);
    if (name) trail.push({ path: prefix, label: name });
  });
  return trail;
};

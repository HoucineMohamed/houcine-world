// Page metadata for RouteMeta (titles, descriptions, canonical links), derived from the route manifest
// (src/routes/manifest.ts), which is the one list of routes. Keep imports relative with ".ts" extensions
// so that the scripts in scripts/dev can import this file with plain Node.
import { BASE_URL } from "./site.ts";
import { CONTENT_PAGES, DEFAULT_DESCRIPTION, INDEXABLE, PRIVATE_PREFIXES } from "../routes/manifest.ts";

export { DEFAULT_DESCRIPTION, PRIVATE_PREFIXES };

export interface PageMeta {
  title: string;
  description: string;
}

/** Public, indexable pages by path, including each published work entry and journal post. */
export const PUBLIC_PAGES: Record<string, PageMeta> = Object.fromEntries(
  [...INDEXABLE, ...CONTENT_PAGES].map((r) => [r.path, { title: r.title, description: r.description }]),
);

/** The canonical address of a known public page, from BASE_URL; null for app routes and unknown paths. */
export const canonicalUrl = (pathname: string): string | null =>
  Object.prototype.hasOwnProperty.call(PUBLIC_PAGES, pathname) ? `${BASE_URL}${pathname}` : null;

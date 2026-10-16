// Which page code a link may load early (src/lib/prefetch.ts): public pages only. Workspace, admin and sign-in
// pages, owner-only pages, outside links and the not-found page are never fetched ahead of a click.
//
// Plain Node imports this file in scripts/dev/prefetch.test.mjs: keep its imports relative, with ".ts".
import { MANIFEST, PRIVATE_PREFIXES } from "./manifest.ts";

/** The manifest paths whose code may be fetched early. */
export const PREFETCHABLE: readonly string[] = MANIFEST.filter(
  (r) => !r.ownerOnly && r.path !== "*" && !PRIVATE_PREFIXES.some((p) => r.path === p || r.path.startsWith(`${p}/`)),
).map((r) => r.path);

const matches = (pattern: string, path: string): boolean => {
  const a = pattern.split("/");
  const b = path.split("/");
  return a.length === b.length && a.every((part, i) => (part.startsWith(":") ? b[i] !== "" : part === b[i]));
};

/**
 * The manifest path a link leads to, when its code may be fetched early; null otherwise. `href` is the
 * link's resolved address and `origin` the site's own (an address on another origin is never matched).
 */
export const prefetchTarget = (href: string, origin: string): string | null => {
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return PREFETCHABLE.find((p) => matches(p, path)) ?? null;
};

/** Fetched once the browser is idle: the pages the header and the home page link to most. */
export const IDLE_PREFETCH = ["/about", "/ecosystem", "/work", "/contact"] as const;

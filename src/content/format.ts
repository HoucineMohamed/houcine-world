// Small, pure helpers shared by the content pages. Tested in scripts/dev/format.test.mjs. No browser or "@"
// imports, so plain Node can import this file.

/** "16 October 2026" from "2026-10-16", in UTC so the day never shifts with the visitor's time zone. */
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** A link inside the site ("/about", "/work#top"), opened with the router; anything else opens as a normal link. */
export const isInternalHref = (href: string): boolean => href.startsWith("/") && !href.startsWith("//");

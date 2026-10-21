import type { WorkItem } from "./types";
import { work } from "./work.ts";
import { assetUrl } from "./assets.ts";

/**
 * "Selected work" on the Houcine.management page (/manages), read from the content layer (work.ts).
 * EMPTY until real entries exist there: the page then shows "Coming soon".
 */
export const managementWork: WorkItem[] = work
  .filter((w) => w.vertical === "management" && !w.draft)
  .map((w) => ({
    title: w.title,
    summary: w.summary,
    tags: w.tags,
    image: w.gallery[0] ? assetUrl(w.gallery[0].src) : undefined,
    imageAlt: w.gallery[0]?.alt,
    href: w.links[0]?.href,
  }));

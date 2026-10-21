import type { Work } from "./schema.ts";

/**
 * Case studies. EMPTY on purpose: only real, published work the owner has the right to show goes here
 * (no invented clients, numbers or results). While a vertical has no entry, its "Selected work" shows
 * "Coming soon". Set `draft: true` to keep an entry off every page. How to add one: docs/content-guide.md.
 */
export const work: Work[] = [];

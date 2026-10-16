import type { Post } from "./schema.ts";

/**
 * Journal posts. A post with `draft: true` is kept off every page (and the feed) until the owner sets it to
 * false. How to add one: docs/content-guide.md.
 */
export const journal: Post[] = [];

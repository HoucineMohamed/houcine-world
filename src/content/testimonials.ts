import type { Testimonial } from "./schema.ts";

/**
 * Testimonials. EMPTY on purpose: a quote is added only when it is real and the person agreed to its
 * publication, and the owner confirms it with `confirmedByOwner: true` (the validator refuses anything
 * else). How to add one: docs/content-guide.md.
 */
export const testimonials: Testimonial[] = [];

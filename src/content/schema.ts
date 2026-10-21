// Schemas and the validator of the content layer (src/content/*.ts). The pages read the content files;
// scripts/dev/content.test.mjs runs validateContent() over all of them. How to add an entry, in plain
// words: docs/content-guide.md.
//
// Rules: every text is real (no empty or placeholder text: an empty list shows "Coming soon" instead),
// slugs are unique per list, internal links point at a page of the route manifest, outside links use
// https, and images are files under src/assets that exist. Keep this file free of the "@" alias and of
// browser-only code, so that the test can import it with plain Node.
import { z } from "zod";

const PLACEHOLDER = /lorem ipsum|\btodo\b|\btbd\b|\[[A-Z][A-Z0-9 /_.,'-]+\]|coming soon|placeholder/i;

/** A real, non-empty, single piece of text. */
const text = (max = 2000) =>
  z.string().trim().min(1, "must not be empty").max(max).refine((s) => !PLACEHOLDER.test(s), "looks like placeholder text");

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lower-case words joined by hyphens");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const vertical = z.enum(["tech", "studio", "education", "management", "world"]);

/** An internal path ("/about") or an https address. Checked against the manifest by validateContent. */
const href = z.string().refine((h) => (h.startsWith("/") && !h.startsWith("//")) || h.startsWith("https://"), "use a path starting with / or an https address");
const link = z.object({ label: text(80), href });

/** An image file under src/assets, by its repository path, with a description for screen readers. */
const image = z.object({
  src: z.string().regex(/^src\/assets\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|svg)$/, "use a file under src/assets"),
  alt: text(200),
});

export const serviceSchema = z.object({
  slug,
  vertical,
  name: text(80),
  /** The page of the service, a path of the route manifest. */
  path: href,
  purpose: text(300),
  audience: text(300),
});

export const workSchema = z.object({
  slug,
  title: text(120),
  vertical,
  summary: text(300),
  context: text(),
  role: text(),
  approach: text(),
  outcome: text(),
  date: isoDate.optional(),
  tags: z.array(text(40)).max(8),
  gallery: z.array(image).max(12),
  links: z.array(link).max(6),
  /** true: kept out of every page until the owner changes it to false. */
  draft: z.boolean(),
});

const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: text(4000) }),
  z.object({ type: z.literal("h2"), text: text(120) }),
  z.object({ type: z.literal("ul"), items: z.array(text(500)).min(1) }),
]);

export const postSchema = z.object({
  slug,
  title: text(120),
  summary: text(300),
  date: isoDate,
  tags: z.array(text(40)).max(8),
  body: z.array(block).min(1),
  draft: z.boolean(),
});

export const teamSchema = z.object({
  slug,
  name: text(80),
  role: text(80),
  summary: text(400),
  links: z.array(link).max(6),
});

export const testimonialSchema = z.object({
  slug,
  quote: text(600),
  author: text(80),
  context: text(120),
  /** Must be true: the owner confirms the quote is real and may be published. */
  confirmedByOwner: z.literal(true, { errorMap: () => ({ message: "the owner must confirm the quote is real" }) }),
});

export const faqSchema = z.object({
  slug,
  question: text(200),
  answer: text(1500),
  links: z.array(link).max(4).optional(),
});

// The types of the content files. Written out by hand (not z.infer) because the app's TypeScript settings
// are not strict, which would make every inferred field optional. The schemas above stay the runtime check.
export type Vertical = "tech" | "studio" | "education" | "management" | "world";
export interface Link {
  label: string;
  href: string;
}
export interface Image {
  src: string;
  alt: string;
}
export interface Service {
  slug: string;
  vertical: Vertical;
  name: string;
  path: string;
  purpose: string;
  audience: string;
}
export interface Work {
  slug: string;
  title: string;
  vertical: Vertical;
  summary: string;
  context: string;
  role: string;
  approach: string;
  outcome: string;
  date?: string;
  tags: string[];
  gallery: Image[];
  links: Link[];
  draft: boolean;
}
export type Block = { type: "p"; text: string } | { type: "h2"; text: string } | { type: "ul"; items: string[] };
export interface Post {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  body: Block[];
  draft: boolean;
}
export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  summary: string;
  links: Link[];
}
export interface Testimonial {
  slug: string;
  quote: string;
  author: string;
  context: string;
  confirmedByOwner: true;
}
export interface Faq {
  slug: string;
  question: string;
  answer: string;
  links?: Link[];
}

export interface ContentLists {
  services: unknown[];
  work: unknown[];
  journal: unknown[];
  team: unknown[];
  testimonials: unknown[];
  faq: unknown[];
}

const SCHEMAS = {
  services: serviceSchema,
  work: workSchema,
  journal: postSchema,
  team: teamSchema,
  testimonials: testimonialSchema,
  faq: faqSchema,
} as const;

/** Every href and image src inside one parsed entry. */
const linksOf = (entry: Record<string, unknown>): string[] => {
  const out: string[] = [];
  if (typeof entry.path === "string") out.push(entry.path);
  for (const l of (entry.links as { href: string }[] | undefined) ?? []) out.push(l.href);
  return out;
};
const imagesOf = (entry: Record<string, unknown>): string[] =>
  ((entry.gallery as { src: string }[] | undefined) ?? []).map((g) => g.src);

/**
 * All problems in the content, as readable lines (an empty list means valid). `routes` are the paths of
 * the route manifest; `fileExists` answers for a repository path.
 */
export const validateContent = (
  content: ContentLists,
  { routes, fileExists }: { routes: readonly string[]; fileExists: (path: string) => boolean },
): string[] => {
  const problems: string[] = [];
  const known = new Set(routes);
  for (const [list, schema] of Object.entries(SCHEMAS) as [keyof ContentLists, z.ZodTypeAny][]) {
    const seen = new Set<string>();
    content[list].forEach((raw, i) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) problems.push(`${list}[${i}].${issue.path.join(".")}: ${issue.message}`);
        return;
      }
      const entry = parsed.data as Record<string, unknown> & { slug: string };
      if (seen.has(entry.slug)) problems.push(`${list}: duplicate slug "${entry.slug}"`);
      seen.add(entry.slug);
      for (const h of linksOf(entry)) {
        if (h.startsWith("/")) {
          const path = h.split("#")[0].split("?")[0] || "/";
          if (!known.has(path)) problems.push(`${list}[${i}]: "${h}" is not a page of the route manifest`);
        }
      }
      for (const src of imagesOf(entry)) if (!fileExists(src)) problems.push(`${list}[${i}]: image "${src}" does not exist`);
    });
  }
  return problems;
};

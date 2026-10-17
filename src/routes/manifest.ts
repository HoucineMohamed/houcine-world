// The route manifest: every route of the app, in one typed list.
//
// Read by src/config/routes.ts (titles, descriptions and canonical links for RouteMeta), by
// scripts/dev/seo-files.mjs (which writes public/sitemap.xml and public/robots.txt with sitemapXml() and
// robotsTxt() below) and by src/App.tsx, whose top-level paths go through route(): a path that is not in
// this list is a type error, so the build fails. scripts/dev/manifest.test.mjs checks the rest (nested
// routes, the two public files, consistency). How to add a page: docs/content-guide.md.
//
// The ".ts" import extension lets those scripts import this file with plain Node; keep every import here
// relative and free of the "@" alias. Never list a private app or its address here.
import { BASE_URL, SITE_NAME } from "../config/site.ts";
import { work } from "../content/work.ts";
import { journal } from "../content/journal.ts";
import { publishedPosts, publishedWork } from "../content/query.ts";

export const DEFAULT_DESCRIPTION = "The creative ecosystem of Mohamed Houcine";

export interface RouteEntry {
  /** The path as written in src/App.tsx ("/about", "/workspace/:brandId/dashboard", "*"). */
  path: string;
  title: string;
  description: string;
  /** Listed in the sitemap, allowed in robots.txt, canonical link, no "noindex". */
  indexable: boolean;
  /** 0 to 1 for indexable pages; null for every other route. */
  sitemapPriority: number | null;
  /** Shown only to the super admin. Never indexable. */
  ownerOnly: boolean;
}

const SITE = SITE_NAME;
const APP = { title: `Workspace | ${SITE}`, description: DEFAULT_DESCRIPTION, indexable: false, sitemapPriority: null } as const;

export const MANIFEST = [
  // Public pages
  { path: "/", title: SITE, description: DEFAULT_DESCRIPTION, indexable: true, sitemapPriority: 1, ownerOnly: false },
  { path: "/about", title: `About Mohamed Houcine | ${SITE}`, description: "About Mohamed Houcine and the Houcine.world ecosystem.", indexable: true, sitemapPriority: 0.8, ownerOnly: false },
  { path: "/dev", title: `Houcine.tech | ${SITE}`, description: "Building scalable, modern applications with React, TypeScript, and cutting-edge web technologies.", indexable: true, sitemapPriority: 0.8, ownerOnly: false },
  { path: "/designs", title: `Houcine.studio | ${SITE}`, description: "Crafting bold visual experiences through branding, UI/UX, and creative direction.", indexable: true, sitemapPriority: 0.8, ownerOnly: false },
  { path: "/reads", title: `Houcine.education | ${SITE}`, description: "A curated digital bookstore for learners exploring tech, design, and innovation.", indexable: true, sitemapPriority: 0.8, ownerOnly: false },
  { path: "/manages", title: `Houcine.management | ${SITE}`, description: "Building and managing creative brands, artists, and strategic projects.", indexable: true, sitemapPriority: 0.8, ownerOnly: false },
  { path: "/larosaview", title: `La Rosa View | ${SITE}`, description: "La Rosa View: where sound meets vision.", indexable: true, sitemapPriority: 0.7, ownerOnly: false },
  { path: "/booking", title: `Book La Rosa View | ${SITE}`, description: "Send a booking request to La Rosa View.", indexable: true, sitemapPriority: 0.6, ownerOnly: false },
  { path: "/about-dj", title: "About the DJ | La Rosa View", description: "About the DJ and music producer behind La Rosa View.", indexable: true, sitemapPriority: 0.6, ownerOnly: false },
  { path: "/review", title: "Leave a review | La Rosa View", description: "Leave a review for La Rosa View.", indexable: true, sitemapPriority: 0.4, ownerOnly: false },
  { path: "/terms", title: `Terms of Service | ${SITE}`, description: "The terms for using Houcine.world and its services.", indexable: true, sitemapPriority: 0.3, ownerOnly: false },
  { path: "/privacy", title: `Privacy Policy | ${SITE}`, description: "What Houcine.world collects, why, and your choices.", indexable: true, sitemapPriority: 0.3, ownerOnly: false },
  { path: "/data-deletion", title: `Data Deletion | ${SITE}`, description: "How to ask Houcine.world to delete your data.", indexable: true, sitemapPriority: 0.3, ownerOnly: false },
  { path: "/contact", title: `Contact | ${SITE}`, description: "How to get in touch with Houcine.world.", indexable: true, sitemapPriority: 0.6, ownerOnly: false },
  { path: "/ecosystem", title: `About the ecosystem | ${SITE}`, description: "Houcine.world is a modular digital ecosystem with four verticals: tech, studio, education and management.", indexable: true, sitemapPriority: 0.7, ownerOnly: false },
  { path: "/work", title: `Work | ${SITE}`, description: "Case studies from the four verticals of the Houcine.world ecosystem.", indexable: true, sitemapPriority: 0.7, ownerOnly: false },
  { path: "/work/:slug", title: `Work | ${SITE}`, description: "A case study from the Houcine.world ecosystem.", indexable: false, sitemapPriority: null, ownerOnly: false },
  { path: "/journal", title: `Journal | ${SITE}`, description: "Notes from the Houcine.world ecosystem.", indexable: true, sitemapPriority: 0.6, ownerOnly: false },
  { path: "/journal/:slug", title: `Journal | ${SITE}`, description: "A post from the Houcine.world journal.", indexable: false, sitemapPriority: null, ownerOnly: false },
  { path: "/services", title: `Services | ${SITE}`, description: "The four verticals of Houcine.world: what each does and who it is for.", indexable: true, sitemapPriority: 0.7, ownerOnly: false },
  { path: "/team", title: `Team | ${SITE}`, description: "The people behind the Houcine.world ecosystem.", indexable: true, sitemapPriority: 0.5, ownerOnly: false },
  { path: "/brand", title: `Brand | ${SITE}`, description: "The Houcine.world design language: logo, colours, type, spacing and components, with copy-ready values.", indexable: true, sitemapPriority: 0.5, ownerOnly: false },

  // Sign-in and admin
  { path: "/admin", ...APP, ownerOnly: false },
  { path: "/admin/login", ...APP, ownerOnly: false },
  { path: "/auth/callback", ...APP, ownerOnly: false },
  { path: "/workspace/login", ...APP, ownerOnly: false },

  // Workspace (signed in; brand pages also need a brand membership)
  { path: "/workspace", ...APP, ownerOnly: false },
  { path: "/workspace/select", ...APP, ownerOnly: false },
  { path: "/workspace/ecosystem", ...APP, ownerOnly: true },
  { path: "/workspace/platform-credentials", ...APP, ownerOnly: true },
  { path: "/workspace/denied", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/dashboard", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/bookings", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/notifications", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/analytics", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/messages", ...APP, ownerOnly: false },
  { path: "/workspace/:brandId/settings", ...APP, ownerOnly: false },
  { path: "/workspace/*", ...APP, ownerOnly: false },

  // Anything else: the designed 404 page
  { path: "*", title: `Page not found | ${SITE}`, description: DEFAULT_DESCRIPTION, indexable: false, sitemapPriority: null, ownerOnly: false },
] as const satisfies readonly RouteEntry[];

export type RoutePath = (typeof MANIFEST)[number]["path"];

/** Used by src/App.tsx for every top-level path: only a path listed above type-checks. */
export const route = <P extends RoutePath>(path: P): P => path;

/** Path prefixes of the app's private areas: never in the sitemap, disallowed in robots.txt, noindex. */
export const PRIVATE_PREFIXES = ["/workspace", "/admin", "/auth"];

/**
 * Templates whose real pages come from the content layer: each published entry is its own page, with its
 * own title, description, canonical link and sitemap line (CONTENT_PAGES). The pattern itself is not
 * indexable; an unknown slug shows the not-found message.
 */
export const CONTENT_TEMPLATES = ["/work/:slug", "/journal/:slug"];

export interface ContentPage {
  path: string;
  title: string;
  description: string;
  sitemapPriority: number;
}

export const CONTENT_PAGES: readonly ContentPage[] = [
  ...publishedWork(work).map((w) => ({ path: `/work/${w.slug}`, title: `${w.title} | ${SITE}`, description: w.summary, sitemapPriority: 0.6 })),
  ...publishedPosts(journal).map((p) => ({ path: `/journal/${p.slug}`, title: `${p.title} | ${SITE}`, description: p.summary, sitemapPriority: 0.5 })),
];

export const INDEXABLE: readonly RouteEntry[] = MANIFEST.filter((r) => r.indexable);

/** public/sitemap.xml, exactly. */
export const sitemapXml = (): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...INDEXABLE, ...CONTENT_PAGES].map((r) => `  <url><loc>${BASE_URL}${r.path}</loc><priority>${(r.sitemapPriority ?? 0).toFixed(1)}</priority></url>`),
    "</urlset>",
    "",
  ].join("\n");

/** public/robots.txt, exactly. A request to crawlers, not a security control. */
export const robotsTxt = (): string => {
  const agents = ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit", "*"];
  const disallow = PRIVATE_PREFIXES.map((p) => `Disallow: ${p === "/auth" ? "/auth/" : p}`);
  return [...agents.flatMap((a) => [`User-agent: ${a}`, "Allow: /", ...disallow, ""]), `Sitemap: ${BASE_URL}/sitemap.xml`, ""].join("\n");
};

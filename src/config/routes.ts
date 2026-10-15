// The public pages of the site, in one place. Read by src/components/RouteMeta.tsx (titles,
// descriptions, canonical links) and by scripts/dev/seo-files.mjs, which writes public/sitemap.xml and
// public/robots.txt from this list and BASE_URL. The ".ts" extensions let that script import this
// file with plain Node; keep every import here relative and free of the "@" alias.
import { BASE_URL, SITE_NAME } from "./site.ts";

const SITE = SITE_NAME;
export const DEFAULT_DESCRIPTION = "The creative ecosystem of Mohamed Houcine";

export interface PageMeta {
  title: string;
  description: string;
}

/** Public pages: the titles and descriptions, the sitemap (scripts/dev/seo-files.mjs) and the canonical links. */
export const PUBLIC_PAGES: Record<string, PageMeta> = {
  "/": { title: SITE, description: DEFAULT_DESCRIPTION },
  "/about": { title: `About Mohamed Houcine | ${SITE}`, description: "About Mohamed Houcine and the Houcine.world ecosystem." },
  "/dev": {
    title: `Houcine.tech | ${SITE}`,
    description: "Building scalable, modern applications with React, TypeScript, and cutting-edge web technologies.",
  },
  "/designs": {
    title: `Houcine.studio | ${SITE}`,
    description: "Crafting bold visual experiences through branding, UI/UX, and creative direction.",
  },
  "/reads": {
    title: `Houcine.education | ${SITE}`,
    description: "A curated digital bookstore for learners exploring tech, design, and innovation.",
  },
  "/manages": {
    title: `Houcine.management | ${SITE}`,
    description: "Building and managing creative brands, artists, and strategic projects.",
  },
  "/larosaview": { title: `La Rosa View | ${SITE}`, description: "La Rosa View: where sound meets vision." },
  "/about-dj": { title: `About the DJ | La Rosa View`, description: "About the DJ and music producer behind La Rosa View." },
  "/booking": { title: `Book La Rosa View | ${SITE}`, description: "Send a booking request to La Rosa View." },
  "/review": { title: `Leave a review | La Rosa View`, description: "Leave a review for La Rosa View." },
  "/terms": { title: `Terms of Service | ${SITE}`, description: "The terms for using Houcine.world and its services." },
  "/privacy": { title: `Privacy Policy | ${SITE}`, description: "What Houcine.world collects, why, and your choices." },
  "/data-deletion": { title: `Data Deletion | ${SITE}`, description: "How to ask Houcine.world to delete your data." },
  "/contact": { title: `Contact | ${SITE}`, description: "How to get in touch with Houcine.world." },
  "/ecosystem": {
    title: `About the ecosystem | ${SITE}`,
    description: "Houcine.world is a modular digital ecosystem with four verticals: tech, studio, education and management.",
  },
};

/** Path prefixes of the app's private areas: never in the sitemap, disallowed in robots.txt, noindex. */
export const PRIVATE_PREFIXES = ["/workspace", "/admin", "/auth"];

/** The canonical address of a known public page, from BASE_URL; null for app routes and unknown paths. */
export const canonicalUrl = (pathname: string): string | null =>
  Object.prototype.hasOwnProperty.call(PUBLIC_PAGES, pathname) ? `${BASE_URL}${pathname}` : null;

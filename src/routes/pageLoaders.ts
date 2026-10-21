// The code of each public page, loaded on demand: src/App.tsx turns each into a React.lazy page, and
// src/lib/prefetch.ts calls the same function early (on hover, focus or when the browser is idle). One
// function per page means one chunk: fetching it early and rendering it later download the file once.
// Public pages only (scripts/dev/prefetch.test.mjs): private and owner pages stay in src/App.tsx.
export const PAGE_LOADERS = {
  "/": () => import("../pages/Index"),
  "/about": () => import("../pages/AboutMe"),
  "/dev": () => import("../pages/Dev"),
  "/designs": () => import("../pages/Designs"),
  "/reads": () => import("../pages/Reads"),
  "/manages": () => import("../pages/Manages"),
  "/larosaview": () => import("../pages/LaRosaView"),
  "/booking": () => import("../pages/BookingForm"),
  "/about-dj": () => import("../pages/AboutDJ"),
  "/review": () => import("../pages/Review"),
  "/terms": () => import("../pages/Terms"),
  "/privacy": () => import("../pages/Privacy"),
  "/data-deletion": () => import("../pages/DataDeletion"),
  "/contact": () => import("../pages/Contact"),
  "/ecosystem": () => import("../pages/Ecosystem"),
  "/work": () => import("../pages/Work"),
  "/work/:slug": () => import("../pages/WorkEntry"),
  "/journal": () => import("../pages/Journal"),
  "/journal/:slug": () => import("../pages/JournalPost"),
  "/brand": () => import("../pages/Brand"),
  "/team": () => import("../pages/Team"),
  "/changelog": () => import("../pages/Changelog"),
  "/status": () => import("../pages/Status"),
  "/brand-kit": () => import("../pages/BrandKit"),
  "/services": () => import("../pages/Services"),
  "/sitemap": () => import("../pages/SiteMap"),
} as const;

export type PageLoaderPath = keyof typeof PAGE_LOADERS;

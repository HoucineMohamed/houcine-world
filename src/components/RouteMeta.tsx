import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Per-page <title> and description without a new dependency. index.html keeps the defaults
// that link-preview crawlers (which do not run JavaScript) will see; this updates the tab title
// and the description tags once the app has loaded.

const SITE = "Houcine.world";
const DEFAULT_DESCRIPTION = "The creative ecosystem of Mohamed Houcine";

interface PageMeta {
  title: string;
  description: string;
}

/** Public pages. Keep in sync with public/sitemap.xml. */
const PUBLIC_PAGES: Record<string, PageMeta> = {
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
};

const PRIVATE_PREFIXES = ["/workspace", "/admin", "/auth"];

const setMeta = (selector: string, content: string) => {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
};

const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const meta: PageMeta = isPrivate
      ? { title: `Workspace | ${SITE}`, description: DEFAULT_DESCRIPTION }
      : PUBLIC_PAGES[pathname] ?? { title: `Page not found | ${SITE}`, description: DEFAULT_DESCRIPTION };

    document.title = meta.title;
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[name="twitter:description"]', meta.description);

    // Ask search engines not to index app routes. (Not a security control: those routes are guarded.)
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (isPrivate) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex, nofollow");
    } else {
      robots?.remove();
    }
  }, [pathname]);

  return null;
};

export default RouteMeta;

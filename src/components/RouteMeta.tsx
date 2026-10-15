import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_ALT, SITE_NAME, structuredData } from "@/config/site";
import { DEFAULT_DESCRIPTION, PRIVATE_PREFIXES, PUBLIC_PAGES, canonicalUrl, type PageMeta } from "@/config/routes";

// Per-page <title> and description without a new dependency. index.html keeps the defaults
// that link-preview crawlers (which do not run JavaScript) will see; this updates the tab title
// and the description tags once the app has loaded.

const setMeta = (selector: string, content: string) => {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
};

/** Like setMeta, but creates the tag when index.html does not have it. */
const ensureMeta = (attribute: "name" | "property", key: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

/** One <link rel="canonical"> on known public pages, none elsewhere. */
const setCanonical = (href: string | null) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

/** Structured data (JSON-LD) for search engines: public pages only, from src/config/site.ts. */
const JSON_LD_ID = "site-structured-data";
const setStructuredData = (enabled: boolean) => {
  let script = document.getElementById(JSON_LD_ID);
  if (!enabled) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(structuredData());
};

const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const meta: PageMeta = isPrivate
      ? { title: `Workspace | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION }
      : PUBLIC_PAGES[pathname] ?? { title: `Page not found | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION };

    document.title = meta.title;
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[name="twitter:description"]', meta.description);
    ensureMeta("property", "og:image", DEFAULT_SHARE_IMAGE);
    ensureMeta("name", "twitter:image", DEFAULT_SHARE_IMAGE);
    ensureMeta("property", "og:image:alt", DEFAULT_SHARE_IMAGE_ALT);
    ensureMeta("name", "twitter:image:alt", DEFAULT_SHARE_IMAGE_ALT);

    setStructuredData(!isPrivate);
    setCanonical(isPrivate ? null : canonicalUrl(pathname));

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

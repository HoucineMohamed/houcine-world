// Site-wide facts used for structured data, canonical links and share tags (src/components/RouteMeta.tsx).
// Only facts that already exist on the site: the name, the public address, and the social profiles
// already linked in the footer. No address, phone number or rating.

export const SITE_NAME = "Houcine.world";

/** The public base address of the site (no trailing slash). */
export const BASE_URL = "https://houcine.world";

/** Default share image (public/og-default.png, 1200x630, an original text wordmark), as an absolute address. */
export const DEFAULT_SHARE_IMAGE = `${BASE_URL}/og-default.png`;
export const DEFAULT_SHARE_IMAGE_ALT = "Houcine.world: the creative ecosystem of Mohamed Houcine";

/** Profiles already linked in src/components/Footer.tsx. */
export const SOCIAL_PROFILES: readonly string[] = [
  "https://www.linkedin.com/in/mohamed-houcine-4142b12b4/",
  "https://www.behance.net/HoucineDesigns",
  "https://github.com/HoucineMohamed",
];

/** JSON-LD for the Organization and the WebSite, built only from the constants above. */
export const structuredData = () => [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${BASE_URL}/`,
    sameAs: [...SOCIAL_PROFILES],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${BASE_URL}/`,
  },
];

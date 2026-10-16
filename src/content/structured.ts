// Structured data (JSON-LD) for the services of the ecosystem, built from the content layer and checked
// against the route manifest: a service whose page is not an indexable manifest route is left out.
// Pure, so scripts/dev/content-query.test.mjs can test it with plain Node.
import type { Service } from "./schema.ts";

export const servicesStructuredData = (
  services: readonly Service[],
  { baseUrl, siteName, indexablePaths }: { baseUrl: string; siteName: string; indexablePaths: readonly string[] },
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${siteName} services`,
  itemListElement: services
    .filter((s) => indexablePaths.includes(s.path))
    .map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.name,
        description: s.purpose,
        audience: { "@type": "Audience", audienceType: s.audience },
        url: `${baseUrl}${s.path}`,
        provider: { "@type": "Organization", name: siteName, url: `${baseUrl}/` },
      },
    })),
});

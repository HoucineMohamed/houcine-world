import { Link } from "react-router-dom";
import { Map as MapIcon } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { cn } from "@/lib/utils";
import { siteMapGroups, type SiteMapLink } from "@/routes/siteMap";

// /sitemap: every public page, grouped, with its one-line description. Built from the route manifest and the
// content layer (src/routes/siteMap.ts), so it never needs editing by hand. The file for search engines is
// /sitemap.xml.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const Item = ({ link }: { link: SiteMapLink }) => (
  <li>
    <Link to={link.path} className={cn("inline-flex items-center [@media(pointer:coarse)]:min-h-11 font-medium text-accent underline hover:text-accent/80 rounded", focusRing)}>
      {link.label}
    </Link>
    <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
    {link.children.length > 0 && (
      <ul className="mt-3 ml-4 space-y-3 border-l border-border/50 pl-4">
        {link.children.map((c) => (
          <Item key={c.path} link={c} />
        ))}
      </ul>
    )}
  </li>
);

const SiteMap = () => (
  <ServicePageLayout>
    <ServiceHero icon={MapIcon} name="Sitemap" promise="Every page of Houcine.world." intro="Grouped, with one line on each." />
    {siteMapGroups().map((g) => (
      <ServiceSection key={g.title} id={slug(g.title)} title={g.title}>
        <ul className="grid gap-6 sm:grid-cols-2">
          {g.links.map((l) => (
            <Item key={l.path} link={l} />
          ))}
        </ul>
      </ServiceSection>
    ))}
  </ServicePageLayout>
);

export default SiteMap;

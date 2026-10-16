import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layers, Code2, Brush, TrendingUp } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection, OfferingGrid } from "@/components/service/ServicePage";
import { EcosystemList, EcosystemMap } from "@/components/ecosystem/EcosystemMap";
import OwnerServiceSlot from "@/components/owner/OwnerServiceSlot";
import { cn } from "@/lib/utils";
import { services } from "@/content/services";
import { faq } from "@/content/faq";
import { servicesStructuredData } from "@/content/structured";
import { INDEXABLE } from "@/routes/manifest";
import { BASE_URL, SITE_NAME } from "@/config/site";

// The ecosystem page (/ecosystem). Built ONLY from the owner's brief and the content layer
// (src/content/services.ts): the map, the plain list of the four verticals (purpose, who it is for, link),
// how the ecosystem works, and Services structured data. No dates, numbers or other claims. The owner-only
// slot is the existing one (src/components/owner/OwnerServiceSlot.tsx): it renders and downloads nothing
// for anyone but the super admin. The founder's own page stays at /about.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SHARED = [
  { icon: Code2, title: "A shared technical base", description: "The verticals run independently on one shared technical base." },
  { icon: Brush, title: "A shared design language", description: "They share one design language, shown on the brand page." },
  { icon: TrendingUp, title: "A shared growth infrastructure", description: "They share one growth infrastructure, and new brands can be added without rebuilding the core." },
] as const;

const JSON_LD_ID = "services-structured-data";

/** Scroll to the question named in the address (#faq-…) once the page has rendered. */
const useScrollToHash = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ block: "start" });
  }, [hash]);
};

const useServicesStructuredData = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(
      servicesStructuredData(services, { baseUrl: BASE_URL, siteName: SITE_NAME, indexablePaths: INDEXABLE.map((r) => r.path) }),
    );
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
};

const Ecosystem = () => {
  useServicesStructuredData();
  useScrollToHash();
  return (
  <ServicePageLayout>
    <ServiceHero
      icon={Layers}
      name="About the ecosystem"
      promise="A modular digital ecosystem."
      intro="Houcine.world brings together four verticals: tech, studio, education and management."
    />

    <ServiceSection id="map" title="The map">
      <p className="text-muted-foreground mb-10 max-w-2xl">
        Four verticals around one core. Each operates independently, while sharing a technical base, a design language
        and a growth infrastructure.
      </p>
      <EcosystemMap services={services} />
      <div className="mt-12">
        <EcosystemList services={services} />
        <div className="grid gap-6 md:grid-cols-2 mt-6 empty:hidden">
          <OwnerServiceSlot />
        </div>
      </div>
    </ServiceSection>

    <ServiceSection id="how-it-works" title="How the ecosystem works">
      <OfferingGrid items={SHARED} />
    </ServiceSection>

    <ServiceSection id="faq" title="Questions and answers">
      <dl className="space-y-8 max-w-3xl">
        {faq.map((f) => (
          <div key={f.slug} id={`faq-${f.slug}`} className="scroll-mt-28">
            <dt className="text-lg font-semibold text-foreground mb-2">{f.question}</dt>
            <dd className="text-muted-foreground">
              {f.answer}
              {f.links && f.links.length > 0 && (
                <span className="block mt-2">
                  {f.links.map((l) => (
                    <Link key={l.href} to={l.href} className={cn("mr-4 inline-flex items-center min-h-11 text-accent underline hover:text-accent/80 rounded", focusRing)}>
                      {l.label}
                    </Link>
                  ))}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </ServiceSection>

    <ServiceSection id="built-to-grow" title="Built to grow">
      <p className="text-muted-foreground max-w-2xl">
        Houcine.world is founder-built, and designed so that new brands can be added without rebuilding the core.
      </p>
      <p className="text-muted-foreground max-w-2xl mt-4">
        More about the founder:{" "}
        <Link to="/about" className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>
          About me
        </Link>
        .
      </p>
    </ServiceSection>
  </ServicePageLayout>
  );
};

export default Ecosystem;

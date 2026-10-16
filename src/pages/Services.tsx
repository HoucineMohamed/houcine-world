import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { cn } from "@/lib/utils";
import { services } from "@/content/services";
import { servicesStructuredData } from "@/content/structured";
import { INDEXABLE } from "@/routes/manifest";
import { BASE_URL, SITE_NAME } from "@/config/site";

// /services: one section per vertical (anchor #<slug>), with the same data as the Services structured
// data (src/content/services.ts through src/content/structured.ts).

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const JSON_LD_ID = "services-page-structured-data";

const Services = () => {
  const { hash } = useLocation();

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

  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <ServicePageLayout>
      <ServiceHero icon={Layers} name="Services" promise="Four verticals, one ecosystem." intro="What each vertical of Houcine.world does, and who it is for." />

      <nav aria-label="The verticals on this page">
        <ul className="flex flex-wrap gap-2">
          {services.map((s) => (
            <li key={s.slug}>
              <a href={`#${s.slug}`} className={cn("inline-flex items-center min-h-11 rounded-full border border-border/60 px-4 text-sm text-muted-foreground hover:text-foreground hover:border-accent/50", focusRing)}>
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {services.map((s) => (
        <ServiceSection key={s.slug} id={s.slug} title={s.name}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">What it does</h3>
              <p className="text-foreground">{s.purpose}</p>
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Who it is for</h3>
              <p className="text-foreground">{s.audience}</p>
            </div>
          </div>
          <Link to={s.path} className={cn("mt-6 inline-flex items-center gap-2 min-h-11 text-accent underline hover:text-accent/80 rounded", focusRing)}>
            Visit {s.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </ServiceSection>
      ))}
    </ServicePageLayout>
  );
};

export default Services;

import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Briefcase } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isInternalHref } from "@/content/format";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { assetUrl } from "@/content/assets";
import { publishedWork } from "@/content/query";
import { caseStudyStructuredData } from "@/content/templates";
import { BASE_URL, SITE_NAME } from "@/config/site";

// /work/:slug: one case study (context, role, approach, outcome, gallery, links) from src/content/work.ts.
// An unknown or draft slug shows a calm not-found message. Structured data (JSON-LD) is added only for a
// real, published entry.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const JSON_LD_ID = "work-structured-data";

const WorkEntry = () => {
  const { slug } = useParams();
  const entry = publishedWork(work).find((w) => w.slug === slug);

  useEffect(() => {
    if (!entry) return;
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(caseStudyStructuredData(entry, { baseUrl: BASE_URL, name: SITE_NAME }));
    document.head.appendChild(script);
    return () => script.remove();
  }, [entry]);

  if (!entry) {
    return (
      <ServicePageLayout>
        <section aria-labelledby="work-missing-title" className="pt-6">
          <h1 id="work-missing-title" className="text-4xl md:text-5xl font-bold font-display text-foreground mb-6">
            This case study is not here.
          </h1>
          <p className="text-muted-foreground mb-8">It may have moved, or it is not published yet.</p>
          <Link to="/work" className={cn("inline-flex items-center gap-2 text-accent underline rounded", focusRing)}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All work
          </Link>
        </section>
      </ServicePageLayout>
    );
  }

  const vertical = services.find((s) => s.vertical === entry.vertical);
  const sections = [
    { id: "context", title: "Context", text: entry.context },
    { id: "role", title: "Role", text: entry.role },
    { id: "approach", title: "Approach", text: entry.approach },
    { id: "outcome", title: "Outcome", text: entry.outcome },
  ];
  const gallery = entry.gallery.map((g) => ({ ...g, url: assetUrl(g.src) })).filter((g) => g.url);

  return (
    <ServicePageLayout>
      <ServiceHero icon={Briefcase} name={vertical?.name ?? SITE_NAME} promise={entry.title} intro={entry.summary} />
      {entry.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2 -mt-12" aria-label="Tags">
          {entry.tags.map((t) => (
            <li key={t}><Badge variant="secondary">{t}</Badge></li>
          ))}
        </ul>
      )}

      <div className="grid gap-12 md:grid-cols-2">
        {sections.map((s) => (
          <section key={s.id} aria-labelledby={`${s.id}-title`}>
            <h2 id={`${s.id}-title`} className="text-2xl font-bold font-display text-foreground mb-4">{s.title}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{s.text}</p>
          </section>
        ))}
      </div>

      {gallery.length > 0 && (
        <ServiceSection id="gallery" title="Gallery">
          <ul className="grid gap-6 md:grid-cols-2">
            {gallery.map((g) => (
              <li key={g.src} className="overflow-hidden rounded-lg border border-border/50">
                <img src={g.url} alt={g.alt} loading="lazy" decoding="async" className="w-full h-auto" />
              </li>
            ))}
          </ul>
        </ServiceSection>
      )}

      {entry.links.length > 0 && (
        <ServiceSection id="links" title="Links">
          <ul className="space-y-3">
            {entry.links.map((l) =>
              isInternalHref(l.href) ? (
                <li key={l.href}>
                  <Link to={l.href} className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>{l.label}</Link>
                </li>
              ) : (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1 text-accent underline hover:text-accent/80 rounded", focusRing)}>
                    {l.label} <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ),
            )}
          </ul>
        </ServiceSection>
      )}
    </ServicePageLayout>
  );
};

export default WorkEntry;

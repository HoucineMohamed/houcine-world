import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Search, X } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { assetUrl } from "@/content/assets";
import { filterWork, publishedWork, tagsOf } from "@/content/query";
import type { Work as WorkEntry } from "@/content/schema";

// /work: every published case study of src/content/work.ts, with vertical filters, search as you type
// and tag chips. Shows no invented entries: while the list is empty, it says "Coming soon".

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const chip = (active: boolean) =>
  cn(
    "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors",
    active ? "border-accent bg-accent text-accent-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/50",
    focusRing,
  );

const verticalName = (v: WorkEntry["vertical"]) => services.find((s) => s.vertical === v)?.name ?? "Houcine.world";

const WorkCard = ({ entry }: { entry: WorkEntry }) => {
  const cover = entry.gallery[0];
  const src = cover ? assetUrl(cover.src) : undefined;
  return (
    <li>
      <Link to={`/work/${entry.slug}`} className={cn("group block h-full rounded-lg", focusRing)}>
        <Card className="h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-300 group-hover:border-accent/50 group-hover:-translate-y-1">
          {src && (
            <img src={src} alt={cover.alt} loading="lazy" decoding="async" className="aspect-video w-full object-cover border-b border-border/50" />
          )}
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{verticalName(entry.vertical)}</p>
            <h3 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">{entry.title}</h3>
            <CardDescription>{entry.summary}</CardDescription>
            <span className="inline-flex items-center gap-1 pt-2 text-sm text-foreground">
              Read the case study <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </CardHeader>
        </Card>
      </Link>
    </li>
  );
};

const Work = () => {
  const all = useMemo(() => publishedWork(work), []);
  const tags = useMemo(() => tagsOf(all), [all]);
  const [vertical, setVertical] = useState<WorkEntry["vertical"] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const results = filterWork(all, { vertical, tags: selected, query });
  const filtering = vertical !== null || selected.length > 0 || query.trim() !== "";
  const toggleTag = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const clear = () => {
    setVertical(null);
    setSelected([]);
    setQuery("");
  };

  return (
    <ServicePageLayout>
      <ServiceHero
        icon={Briefcase}
        name="Work"
        promise="Selected work from the ecosystem."
        intro="Case studies from Houcine.tech, Houcine.studio, Houcine.education and Houcine.management."
      />

      {all.length === 0 ? (
        <section aria-labelledby="work-empty-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
          <h2 id="work-empty-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">Coming soon</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Case studies will appear here. Meanwhile, each vertical describes what it does.
          </p>
          <ul className="flex flex-wrap gap-3">
            {services.map((s) => (
              <li key={s.slug}>
                <Link to={s.path} className={chip(false)}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ServiceSection id="projects" title="Projects">
          <div className="space-y-5 mb-10">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search the case studies"
                placeholder="Search by title, summary or tag"
                className="pl-9"
              />
            </div>
            <div role="group" aria-label="Filter by vertical" className="flex flex-wrap gap-2">
              <button type="button" className={chip(vertical === null)} aria-pressed={vertical === null} onClick={() => setVertical(null)}>
                All
              </button>
              {services.map((s) => (
                <button key={s.slug} type="button" className={chip(vertical === s.vertical)} aria-pressed={vertical === s.vertical} onClick={() => setVertical(s.vertical)}>
                  {s.name}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t} type="button" className={chip(selected.includes(t))} aria-pressed={selected.includes(t)} onClick={() => toggleTag(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="sr-only" aria-live="polite">
            {results.length} {results.length === 1 ? "case study" : "case studies"} shown
          </p>
          {results.length > 0 ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((entry) => <WorkCard key={entry.slug} entry={entry} />)}
            </ul>
          ) : (
            <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
              <p className="text-foreground mb-4">No case study matches these filters.</p>
              {filtering && (
                <button type="button" onClick={clear} className={cn(chip(false), "gap-1.5")}>
                  <X className="w-4 h-4" aria-hidden="true" /> Clear the filters
                </button>
              )}
            </div>
          )}
        </ServiceSection>
      )}
    </ServicePageLayout>
  );
};

export default Work;

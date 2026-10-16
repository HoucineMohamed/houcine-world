import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, NotebookPen, Rss } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { journal } from "@/content/journal";
import { publishedPosts, readingMinutes, tagsOf } from "@/content/query";
import { formatDate, useFeedLink } from "./journalShared";

// /journal: the published posts of src/content/journal.ts, newest first, with tag filters, the reading
// time of each post and the RSS feed (public/rss.xml). Drafts never appear.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const chip = (active: boolean) =>
  cn(
    "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors [@media(pointer:coarse)]:min-h-11",
    active ? "border-accent bg-accent text-accent-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/50",
    focusRing,
  );

const Journal = () => {
  useFeedLink();
  const posts = useMemo(() => publishedPosts(journal), []);
  const tags = useMemo(() => tagsOf(posts), [posts]);
  const [tag, setTag] = useState<string | null>(null);
  const shown = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  useEffect(() => {
    if (tag && !tags.includes(tag)) setTag(null);
  }, [tag, tags]);

  return (
    <ServicePageLayout>
      <ServiceHero icon={NotebookPen} name="Journal" promise="Notes from the ecosystem." intro="How the work is done, written down as it happens." />

      {posts.length === 0 ? (
        <section aria-labelledby="journal-empty-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
          <h2 id="journal-empty-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">Coming soon</h2>
          <p className="text-muted-foreground">Posts will appear here. The feed below lists them too, once they are published.</p>
        </section>
      ) : (
        <ServiceSection id="posts" title="Posts">
          {tags.length > 0 && (
            <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2 mb-8">
              <button type="button" className={chip(tag === null)} aria-pressed={tag === null} onClick={() => setTag(null)}>All</button>
              {tags.map((t) => (
                <button key={t} type="button" className={chip(tag === t)} aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>
              ))}
            </div>
          )}
          <ul className="grid gap-6 md:grid-cols-2">
            {shown.map((p) => (
              <li key={p.slug}>
                <Link to={`/journal/${p.slug}`} className={cn("group block h-full rounded-lg", focusRing)}>
                  <Card className="h-full border-border/50 bg-card/50 backdrop-blur transition-all duration-300 group-hover:border-accent/50 group-hover:-translate-y-1">
                    <CardHeader>
                      <p className="text-xs text-muted-foreground">
                        <time dateTime={p.date}>{formatDate(p.date)}</time> · {readingMinutes(p)} min read
                      </p>
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">{p.title}</h3>
                      <CardDescription>{p.summary}</CardDescription>
                      <span className="inline-flex items-center gap-1 pt-2 text-sm text-foreground">
                        Read <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </ServiceSection>
      )}

      <p>
        <a href="/rss.xml" className={cn("inline-flex items-center gap-2 min-h-11 text-sm text-muted-foreground hover:text-foreground rounded", focusRing)}>
          <Rss className="w-4 h-4" aria-hidden="true" /> Follow the journal with RSS
        </a>
      </p>
    </ServicePageLayout>
  );
};

export default Journal;

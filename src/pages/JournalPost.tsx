import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ServicePageLayout } from "@/components/service/ServicePage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { journal } from "@/content/journal";
import { publishedPosts, readingMinutes, relatedPosts } from "@/content/query";
import { journalPostStructuredData } from "@/content/templates";
import { BASE_URL, SITE_NAME } from "@/config/site";
import { formatDate, useFeedLink } from "./journalShared";

// /journal/:slug: one published post, its tags, reading time and up to three related posts.
// A draft or unknown slug shows a calm not-found message. Structured data (JSON-LD) is added only for a
// published post.

const JSON_LD_ID = "post-structured-data";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const JournalPost = () => {
  useFeedLink();
  const { slug } = useParams();
  const post = publishedPosts(journal).find((p) => p.slug === slug);

  useEffect(() => {
    if (!post) return;
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(journalPostStructuredData(post, { baseUrl: BASE_URL, name: SITE_NAME }));
    document.head.appendChild(script);
    return () => script.remove();
  }, [post]);

  const back = (
    <Link to="/journal" className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground rounded", focusRing)}>
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All posts
    </Link>
  );

  if (!post) {
    return (
      <ServicePageLayout>
        <section aria-labelledby="post-missing-title" className="pt-6">
          <h1 id="post-missing-title" className="text-4xl md:text-5xl font-bold font-display text-foreground mb-6">This post is not here.</h1>
          <p className="text-muted-foreground mb-8">It may have moved, or it is not published yet.</p>
          {back}
        </section>
      </ServicePageLayout>
    );
  }

  const related = relatedPosts(post, journal);

  return (
    <ServicePageLayout>
      <article aria-labelledby="post-title" className="max-w-3xl">
        <p className="text-sm text-muted-foreground mb-4">
          <time dateTime={post.date}>{formatDate(post.date)}</time> · {readingMinutes(post)} min read
        </p>
        <h1 id="post-title" className="text-4xl md:text-5xl font-bold font-display text-foreground mb-6">{post.title}</h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-6">{post.summary}</p>
        {post.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-12" aria-label="Tags">
            {post.tags.map((t) => <li key={t}><Badge variant="secondary">{t}</Badge></li>)}
          </ul>
        )}
        <div className="space-y-6 text-foreground/90 leading-relaxed">
          {post.body.map((b, i) =>
            b.type === "h2" ? (
              <h2 key={i} className="text-2xl md:text-3xl font-bold font-display text-foreground pt-6">{b.text}</h2>
            ) : b.type === "ul" ? (
              <ul key={i} className="list-disc pl-6 space-y-2 text-muted-foreground">
                {b.items.map((it, j) => <li key={`${j}-${it}`}>{it}</li>)}
              </ul>
            ) : (
              <p key={i} className="text-muted-foreground">{b.text}</p>
            ),
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title">
          <h2 id="related-title" className="text-2xl font-bold font-display text-foreground mb-6">Related posts</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/journal/${r.slug}`} className={cn("block h-full rounded-lg border border-border/50 bg-card/50 p-5 hover:border-accent/50 transition-colors", focusRing)}>
                  <p className="text-xs text-muted-foreground mb-2"><time dateTime={r.date}>{formatDate(r.date)}</time></p>
                  <p className="font-semibold text-foreground">{r.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ServicePageLayout>
  );
};

export default JournalPost;

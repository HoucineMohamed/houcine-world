import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import { SearchButton } from "@/components/search/SiteSearch";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { contactMailto } from "@/config/contact";
import type { WorkItem } from "@/content/types";

// Shared building blocks for the public service pages. Same header, footer and tokens as the
// rest of the site; one h1 per page, h2 per section, h3 per card.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const ServicePageLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <ScrollProgressBar />
    <CustomCursor />

    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          to="/"
          className={cn("inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-my-1.5 [@media(pointer:coarse)]:-mx-1.5 rounded-md opacity-80 hover:opacity-100 transition-opacity", focusRing)}
        >
          <img src={logoH} alt="Houcine.world home" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <SearchButton />
          <Link
            to="/#services"
            className={cn(
              "inline-flex items-center gap-2 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:-my-3 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors",
              focusRing,
            )}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back<span className="sr-only sm:not-sr-only">&nbsp;to the ecosystem</span>
          </Link>
        </div>
      </div>
    </header>

    <main id="main" className="pt-28 pb-20 px-6">
      <div className="container mx-auto max-w-5xl space-y-20">{children}</div>
    </main>

    <Footer />
  </div>
);

export const ServiceHero = ({
  icon: Icon, name, promise, intro,
}: {
  icon: LucideIcon;
  name: string;
  promise: string;
  intro?: string;
}) => (
  <section aria-labelledby="service-title" className="pt-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 rounded-lg bg-accent/10">
        <Icon className="w-8 h-8 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{name}</p>
    </div>
    <h1 id="service-title" className="text-4xl md:text-6xl font-bold font-display text-foreground mb-6 max-w-3xl">
      {promise}
    </h1>
    {intro && <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">{intro}</p>}
  </section>
);

export const ServiceSection = ({
  id, title, children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
    <h2 id={`${id}-title`} className="text-3xl md:text-4xl font-bold font-display text-foreground mb-8">
      {title}
    </h2>
    {children}
  </section>
);

export const OfferingGrid = ({
  items,
}: {
  items: readonly { title: string; description: string; icon: LucideIcon }[];
}) => (
  <ul className="grid gap-6 md:grid-cols-3">
    {items.map(({ title, description, icon: Icon }) => (
      <li key={title}>
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <Icon className="w-6 h-6 text-accent mb-2" aria-hidden="true" />
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
        </Card>
      </li>
    ))}
  </ul>
);

export const ProcessSteps = ({
  steps,
}: {
  steps: readonly { title: string; description: string }[];
}) => (
  <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    {steps.map((step, index) => (
      <li key={step.title} className="rounded-lg border border-border/50 bg-card/50 p-6">
        <p className="text-sm text-muted-foreground mb-2">Step {index + 1}</p>
        <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
        <p className="text-muted-foreground">{step.description}</p>
      </li>
    ))}
  </ol>
);

const isInternal = (href: string) => href.startsWith("/") && !href.startsWith("//");

const WorkCard = ({ item }: { item: WorkItem }) => {
  const body = (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      {item.image && (
        <img
          src={item.image}
          alt={item.imageAlt ?? ""}
          loading="lazy"
          className="w-full aspect-video object-cover"
        />
      )}
      <CardHeader>
        <CardTitle className="text-xl">{item.title}</CardTitle>
        <CardDescription className="text-base">{item.summary}</CardDescription>
        {item.tags && item.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2" aria-label="Tags">
            {item.tags.map((tag) => (
              <li key={tag} className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
    </Card>
  );
  if (!item.href) return body;
  return isInternal(item.href) ? (
    <Link to={item.href} className={cn("block h-full rounded-lg", focusRing)}>{body}</Link>
  ) : (
    <a href={item.href} rel="noopener noreferrer" className={cn("block h-full rounded-lg", focusRing)}>{body}</a>
  );
};

const AllWorkLink = () => (
  <Link
    to="/work"
    className={cn("inline-flex items-center gap-2 [@media(pointer:coarse)]:min-h-11 text-sm text-muted-foreground hover:text-foreground rounded mt-3", focusRing)}
  >
    See all work across the ecosystem <ArrowRight className="w-4 h-4" aria-hidden="true" />
  </Link>
);

/** The "Selected work" gallery: real entries from src/content, or a calm "Coming soon" state. */
export const SelectedWork = ({ items }: { items: readonly WorkItem[] }) =>
  items.length === 0 ? (
    <>
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-lg font-semibold text-foreground mb-1">Coming soon</p>
        <p className="text-muted-foreground">Selected work will be shown here.</p>
      </div>
      <AllWorkLink />
    </>
  ) : (
    <>
      <ul className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.title}>
            <WorkCard item={item} />
          </li>
        ))}
      </ul>
      <AllWorkLink />
    </>
  );

/** Call to action: a plain mailto from src/config/contact.ts, or a disabled note while it is not set. */
export const ContactCta = ({ title, text, subject }: { title: string; text: string; subject: string }) => {
  const href = contactMailto(subject);
  return (
    <section aria-labelledby="contact-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12 text-center">
      <h2 id="contact-title" className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
        {title}
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-8">{text}</p>
      {href ? (
        <a href={href} className={cn(buttonVariants({ size: "lg" }), focusRing)}>
          <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
          Get in touch
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">
          Contact details coming soon. See the{" "}
          <Link to="/contact" className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>
            contact page
          </Link>
          .
        </p>
      )}
    </section>
  );
};

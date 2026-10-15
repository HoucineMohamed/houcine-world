import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Home } from "lucide-react";
import { ServicePageLayout } from "@/components/service/ServicePage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown for any address that does not exist. Same header and footer as the service pages.
const HELPFUL_LINKS = [
  { to: "/#services", label: "The Ecosystem", description: "All four Houcine.world domains" },
  { to: "/dev", label: "Houcine.tech", description: "Web applications and development" },
  { to: "/designs", label: "Houcine.studio", description: "Branding, UI/UX and visual design" },
  { to: "/reads", label: "Houcine.education", description: "Digital books and learning resources" },
  { to: "/manages", label: "Houcine.management", description: "Creative brands, artists and projects" },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const NotFound = () => {
  const { pathname } = useLocation();

  return (
    <ServicePageLayout>
      <section aria-labelledby="not-found-title" className="pt-6 text-center">
        <p className="text-7xl md:text-9xl font-bold font-display text-accent/80 mb-4" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4">
          Page not found
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
          There is no page at this address. It may have moved, or the link may be mistyped.
        </p>
        <p className="text-sm text-muted-foreground mb-8 break-all">
          <span className="sr-only">Requested address: </span>
          <code className="rounded bg-muted px-2 py-1">{pathname}</code>
        </p>
        <Link to="/" className={cn(buttonVariants({ size: "lg" }), "gap-2", focusRing)}>
          <Home className="w-4 h-4" aria-hidden="true" />
          Go to the home page
        </Link>
      </section>

      <section aria-labelledby="helpful-links-title">
        <h2 id="helpful-links-title" className="text-2xl font-bold font-display text-foreground mb-6 text-center">
          You might be looking for
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELPFUL_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={cn(
                  "group flex h-full items-center justify-between gap-4 rounded-lg border border-border/50 bg-card/50 p-5 transition-colors hover:border-accent/50",
                  focusRing,
                )}
              >
                <span>
                  <span className="block font-semibold text-foreground group-hover:text-accent transition-colors">
                    {link.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">{link.description}</span>
                </span>
                <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ServicePageLayout>
  );
};

export default NotFound;

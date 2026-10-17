import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { cn } from "@/lib/utils";
import { team } from "@/content/team";

// /team: the people behind the ecosystem, from src/content/team.ts. Only real people with their agreement.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const isInternal = (href: string) => href.startsWith("/") && !href.startsWith("//");

const Team = () => (
  <ServicePageLayout>
    <ServiceHero icon={Users} name="Team" promise="The people behind Houcine.world." intro="Houcine.world is founder-built." />

    <ServiceSection id="people" title="People">
      <ul className="grid gap-6 md:grid-cols-2">
        {team.map((m) => (
          <li key={m.slug} className="rounded-lg border border-border/50 bg-card/50 p-6">
            <h3 className="text-xl font-semibold text-foreground">{m.name}</h3>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mt-1 mb-4">{m.role}</p>
            <p className="text-muted-foreground mb-4">{m.summary}</p>
            {m.links.length > 0 && (
              <ul className="flex flex-wrap gap-x-4">
                {m.links.map((l) => (
                  <li key={l.href}>
                    {isInternal(l.href) ? (
                      <Link to={l.href} className={cn("inline-flex items-center min-h-11 text-sm text-accent underline hover:text-accent/80 rounded", focusRing)}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center min-h-11 text-sm text-accent underline hover:text-accent/80 rounded", focusRing)}>
                        {l.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </ServiceSection>
  </ServicePageLayout>
);

export default Team;

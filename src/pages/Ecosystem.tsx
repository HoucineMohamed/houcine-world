import { Link } from "react-router-dom";
import { Terminal, Palette, BookOpen, Briefcase, Layers, Code2, Brush, TrendingUp } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection, OfferingGrid } from "@/components/service/ServicePage";
import { cn } from "@/lib/utils";

// The ecosystem "about" page (/ecosystem). Built ONLY from the owner's brief; the vertical
// one-liners are the descriptions already on the home page's Services cards. No dates, numbers or
// other claims. The founder's own page stays at /about.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const VERTICALS = [
  { to: "/dev", name: "Houcine.tech", label: "Tech", icon: Terminal,
    description: "Building scalable, modern applications with React, TypeScript, and cutting-edge web technologies." },
  { to: "/designs", name: "Houcine.studio", label: "Studio", icon: Palette,
    description: "Crafting bold visual experiences through branding, UI/UX, and creative direction." },
  { to: "/reads", name: "Houcine.education", label: "Education", icon: BookOpen,
    description: "A curated digital bookstore for learners exploring tech, design, and innovation." },
  { to: "/manages", name: "Houcine.management", label: "Management", icon: Briefcase,
    description: "Building and managing creative brands, artists, and strategic projects." },
] as const;

const SHARED = [
  { icon: Code2, title: "A technical base", description: "The verticals share one technical foundation." },
  { icon: Brush, title: "A design language", description: "They share one way of looking and feeling." },
  { icon: TrendingUp, title: "A growth infrastructure", description: "They share the means to grow." },
] as const;

const Ecosystem = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Layers}
      name="About the ecosystem"
      promise="A modular digital ecosystem."
      intro="Houcine.world brings together four verticals: tech, studio, education and management."
    />

    <ServiceSection id="verticals" title="Four verticals">
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Each vertical operates independently, while sharing a technical base, a design language and a growth
        infrastructure.
      </p>
      <ul className="grid gap-6 md:grid-cols-2">
        {VERTICALS.map(({ to, name, label, icon: Icon, description }) => (
          <li key={to}>
            <Link
              to={to}
              className={cn(
                "group block h-full rounded-lg border border-border/50 bg-card/50 p-6 transition-colors hover:border-accent/50",
                focusRing,
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-6 h-6 text-accent" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">{name}</h3>
                <span className="sr-only">({label})</span>
              </div>
              <p className="text-muted-foreground">{description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </ServiceSection>

    <ServiceSection id="shared" title="What they share">
      <OfferingGrid items={SHARED} />
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

export default Ecosystem;

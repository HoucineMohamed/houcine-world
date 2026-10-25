import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import laRosaLogo from "@/assets/images/larosaview-logo.png";
import {
  ServicePageLayout, ServiceHero, ServiceSection, ProcessSteps, SelectedWork, ContactCta,
} from "@/components/service/ServicePage";
import { managementWork } from "@/content/management";
import { SERVICE_EMAILS } from "@/config/contact";

// Houcine.management: the flagship positioning (program: master redesign, section 12). Not an
// AI-agent service -- management, development and coordination of brands, artists, creative
// ventures, venues and businesses. Service areas render as a typographic index (lettered, two
// columns) rather than the shared OfferingGrid cards, so the page reads distinctly from the other
// three services, matching its flagship status.

const SERVICE_AREAS = [
  {
    letter: "A",
    title: "Brand and project management",
    description: "Strategic positioning, brand development, project coordination and operational planning.",
  },
  {
    letter: "B",
    title: "Artist and talent development",
    description: "Artist positioning, DJ and music-project development, digital presence and promotional coordination.",
  },
  {
    letter: "C",
    title: "Business and venue development",
    description: "Business identity coordination, venue and cultural-project positioning, and operational systems.",
  },
  {
    letter: "D",
    title: "Digital ecosystem management",
    description: "Website and platform coordination, digital workflows, AI-assisted operations and digital asset organization.",
  },
  {
    letter: "E",
    title: "Creative and cultural projects",
    description: "Curator and creator support, project identity, communication strategy and cross-platform consistency.",
  },
] as const;

const AUDIENCES = [
  "Artists and DJs", "Curators and creators", "Creative and cultural projects", "Venues and buildings",
  "Businesses and brands", "Digital projects", "Independent ventures",
] as const;

const STEPS = [
  { title: "Get in touch", description: "Tell us about the brand, the artist, the venue or the project." },
  { title: "Shape the scope", description: "Agree together on the goals and exactly which areas apply." },
  { title: "Put it in motion", description: "Run the work and keep you informed along the way." },
  { title: "Review and adjust", description: "Look at what worked and adjust the plan." },
] as const;

const Manages = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Briefcase}
      name="Houcine.management"
      promise="Ideas, people, and projects — brought into alignment."
      intro="Houcine.management develops and coordinates brands, artists, creative ventures and businesses through strategic direction, digital infrastructure and operational support. Each project receives the scope its actual needs call for."
    />

    <ServiceSection id="who-we-work-with" title="Who we work with">
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {AUDIENCES.map((a) => (
          <li
            key={a}
            className="text-sm sm:text-base text-muted-foreground border border-border/50 rounded-full px-4 py-1.5"
          >
            {a}
          </li>
        ))}
      </ul>
    </ServiceSection>

    <ServiceSection id="service-areas" title="Service areas">
      <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {SERVICE_AREAS.map(({ letter, title, description }) => (
          <li key={letter} className="flex gap-5">
            <span className="text-4xl md:text-5xl font-display font-bold text-accent/50 leading-none shrink-0" aria-hidden="true">
              {letter}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground mt-10">
        These are the directions Houcine.management works in; not every engagement includes every
        area, and scope is agreed before work begins.
      </p>
    </ServiceSection>

    <ServiceSection id="brands" title="Brands we work with">
      <ul className="grid gap-6 sm:grid-cols-2">
        <li>
          <Link
            to="/larosaview"
            className="group flex h-full items-center gap-5 rounded-lg border border-border/50 bg-card/50 p-6 transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <img src={laRosaLogo} alt="" loading="lazy" className="h-16 w-16 object-contain" />
            <div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                DJ La Rosa View
              </h3>
              <p className="text-muted-foreground">DJ project. Visit its page.</p>
            </div>
          </Link>
        </li>
        <li className="flex h-full items-center rounded-lg border border-border/50 bg-card/50 p-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">The Shape Shifters</h3>
            <p className="text-muted-foreground">Creative collective.</p>
          </div>
        </li>
      </ul>
    </ServiceSection>

    <ServiceSection id="how-it-works" title="How it works">
      <ProcessSteps steps={STEPS} />
    </ServiceSection>

    <ServiceSection id="selected-work" title="Selected work">
      <SelectedWork items={managementWork} />
    </ServiceSection>

    <ContactCta
      title="Working on a brand, artist or project?"
      text="Get in touch to talk about strategy, creative direction, or operational support."
    />
  </ServicePageLayout>
);

export default Manages;

import { Link } from "react-router-dom";
import { Briefcase, Compass, Mic2, Target } from "lucide-react";
import laRosaLogo from "@/assets/images/larosaview-logo.png";
import {
  ServicePageLayout, ServiceHero, ServiceSection, OfferingGrid, ProcessSteps, SelectedWork, ContactCta,
} from "@/components/service/ServicePage";
import { managementWork } from "@/content/management";

const OFFERINGS = [
  {
    icon: Compass,
    title: "Brand strategy",
    description: "Shaping how a creative brand presents itself and where it is heading.",
  },
  {
    icon: Mic2,
    title: "Artist and event support",
    description: "Support for artists and their events, from planning to the day itself.",
  },
  {
    icon: Target,
    title: "Strategic projects",
    description: "Building and running creative projects with a clear direction.",
  },
] as const;

const STEPS = [
  { title: "Get in touch", description: "Tell us about the brand, the artist or the project." },
  { title: "Shape the plan", description: "Agree together on goals, priorities and next steps." },
  { title: "Put it in motion", description: "Run the work and keep you informed along the way." },
  { title: "Review and adjust", description: "Look at what worked and adjust the plan." },
] as const;

const Manages = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Briefcase}
      name="Houcine.management"
      promise="Building and managing creative brands, artists and strategic projects."
      intro="Brand strategy, artist and event support, and strategic projects for creative work."
    />

    <ServiceSection id="what-we-do" title="What we do">
      <OfferingGrid items={OFFERINGS} />
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
      title="Working on a creative brand or project?"
      text="Get in touch to talk about brand strategy, artist and event support, or a strategic project."
      subject="Houcine.management enquiry"
    />
  </ServicePageLayout>
);

export default Manages;

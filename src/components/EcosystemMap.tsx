import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

// Replaces the old four-card services grid (program: homepage redesign). A connected typographic
// list rather than a card grid or an orbital diagram: a single vertical line threads through all
// four destinations with a node at each one, so the "connected ecosystem" idea reads from the
// layout itself. Each row is one full-width tap target -- no information is hover-only, so touch
// and keyboard users get the same access as a mouse. No decorative icons; the name and one-line
// purpose carry the hierarchy.

const DESTINATIONS = [
  {
    name: "Houcine.tech",
    path: "/dev",
    purpose: "Technology, engineering, digital systems and AI integration.",
  },
  {
    name: "Houcine.studio",
    path: "/designs",
    purpose: "Branding, graphic design and digital experiences.",
  },
  {
    name: "Houcine.management",
    path: "/manages",
    purpose: "Management and coordination of brands, artists and creative ventures.",
  },
  {
    name: "Houcine.education",
    path: "/reads",
    purpose: "An educational service currently under construction.",
  },
] as const;

const EcosystemMap = () => (
  <div className="relative max-w-3xl mx-auto">
    {/* The connecting line: one thread running through every destination */}
    <div
      className="absolute left-[7px] top-3 bottom-3 w-px bg-border/60 sm:left-[9px]"
      aria-hidden="true"
    />

    <ul className="relative">
      {DESTINATIONS.map(({ name, path, purpose }) => (
        <li key={path} className="relative">
          <Link
            to={path}
            className="group flex items-start gap-5 sm:gap-7 py-6 sm:py-7 pl-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* Node on the connecting line */}
            <span
              className="relative z-10 mt-2 shrink-0 w-[15px] h-[15px] sm:w-[19px] sm:h-[19px] rounded-full border-2 border-border bg-background transition-colors duration-300 group-hover:border-accent group-focus-visible:border-accent"
              aria-hidden="true"
            />

            <span className="flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6">
              <span className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground transition-colors duration-300 group-hover:text-accent">
                  {name}
                </span>
                <ArrowUpRight
                  className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-300"
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm sm:text-base text-muted-foreground sm:max-w-xs sm:text-right">
                {purpose}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default EcosystemMap;

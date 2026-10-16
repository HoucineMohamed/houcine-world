import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Service } from "@/content/schema";

// The ecosystem map: Houcine.world in the centre, the four verticals around it, drawn with inline SVG.
// The lines are decoration (aria-hidden); every node is an ordinary link, so the map works with a keyboard
// and a screen reader, and the plain list under it (EcosystemList) carries the full text. Hovering or
// focusing a node highlights its line and shows its purpose (visually; the plain list below says it in full
// for screen readers, so it is not repeated here). The slow pulse of the lines uses
// motion-safe, so it stops when the visitor asks for reduced motion.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Positions in percent of the map box: top, right, bottom, left of the centre. */
const POSITIONS = [
  { x: 50, y: 13 },
  { x: 88, y: 50 },
  { x: 50, y: 87 },
  { x: 12, y: 50 },
];

export const EcosystemMap = ({ services }: { services: readonly Service[] }) => {
  const [active, setActive] = useState<string | null>(null);
  const nodes = services.slice(0, 4).map((s, i) => ({ ...s, ...POSITIONS[i] }));
  const current = nodes.find((n) => n.slug === active);

  return (
    <div className="hidden sm:block">
      <div
        className="relative mx-auto aspect-square w-full max-w-xl"
        onMouseLeave={(e) => {
          if (!e.currentTarget.contains(document.activeElement)) setActive(null);
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="37" className="fill-none stroke-border" strokeWidth="0.3" strokeDasharray="1 1.5" />
          {nodes.map((n) => (
            <line
              key={n.slug}
              x1="50"
              y1="50"
              x2={n.x}
              y2={n.y}
              strokeWidth={active === n.slug ? 0.6 : 0.3}
              className={cn(
                "transition-all duration-300",
                active === n.slug ? "stroke-accent" : "stroke-border motion-safe:animate-pulse",
              )}
            />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="rounded-full border border-border/60 bg-card/80 backdrop-blur px-5 py-4 shadow-sm">
            <p className="font-display text-lg font-semibold text-foreground">Houcine.world</p>
            <p className="text-xs text-muted-foreground">the core</p>
          </div>
        </div>

        <ul aria-label="The four verticals">
          {nodes.map((n) => (
            <li key={n.slug} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <Link
                to={n.path}
                onMouseEnter={() => setActive(n.slug)}
                onFocus={() => setActive(n.slug)}
                onBlur={() => setActive(null)}
                className={cn(
                  "block whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition-colors [@media(pointer:coarse)]:py-3",
                  active === n.slug ? "border-accent bg-accent text-accent-foreground" : "border-border/60 bg-card/70 text-foreground hover:border-accent/50",
                  focusRing,
                )}
              >
                {n.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto mt-4 min-h-[3rem] max-w-xl text-center text-sm text-muted-foreground" aria-hidden="true">
        {current ? current.purpose : "Point at a vertical, or move to it with the Tab key."}
      </p>
    </div>
  );
};

/** The plain list: every vertical with its purpose, who it is for, and its link. Always shown. */
export const EcosystemList = ({ services }: { services: readonly Service[] }) => (
  <ul className="grid gap-6 md:grid-cols-2">
    {services.map((s) => (
      <li key={s.slug} className="rounded-lg border border-border/50 bg-card/50 p-6">
        <h3 className="text-xl font-semibold text-foreground mb-3">{s.name}</h3>
        <p className="text-muted-foreground mb-3">{s.purpose}</p>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="text-foreground">For: </span>
          {s.audience}
        </p>
        <Link to={s.path} className={cn("text-sm text-accent underline hover:text-accent/80 rounded", focusRing)}>
          Visit {s.name}
        </Link>
      </li>
    ))}
  </ul>
);

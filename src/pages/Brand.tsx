import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Palette } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import logoH from "@/assets/logo-h.png";
import tokens from "@/design/tokens.json";

// /brand: the design language of Houcine.world as a living style guide. Every value on this page comes
// from src/design/tokens.json (checked against src/index.css by scripts/dev/tokens.test.mjs), and every
// swatch and specimen is drawn with the live CSS variables, so the page shows what the site really uses.
// Explained in docs/ecosystem-design-tokens.md.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** "H S% L%" to a #rrggbb string, for display only. */
const hslToHex = (value: string) => {
  const [h, s, l] = value.split(" ").map((p) => parseFloat(p));
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/** A small button that copies one value and says so to screen readers. */
const CopyValue = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}: ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-accent/50",
        focusRing,
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{value}</span>
      <span className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</span>
    </button>
  );
};

/** The colours worth showing as swatches, grouped; every other token is listed in the table below them. */
const SWATCH_GROUPS: { title: string; names: string[] }[] = [
  { title: "Surfaces", names: ["background", "card", "popover", "secondary", "muted"] },
  { title: "Text", names: ["foreground", "muted-foreground", "primary-foreground", "accent-foreground"] },
  { title: "Accents and states", names: ["primary", "accent", "metallic", "ring", "destructive"] },
  { title: "Lines", names: ["border", "input"] },
];

const colors = tokens.colors.root as Record<string, string>;

const Swatch = ({ name }: { name: string }) => {
  const value = colors[name];
  return (
    <li className="rounded-lg border border-border/60 bg-card/50 overflow-hidden">
      {/* The swatch is drawn with the live CSS variable, so it always matches the site. */}
      <div className="h-20 border-b border-border/60" style={{ backgroundColor: `hsl(var(--${name}))` }} aria-hidden="true" />
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground">--{name}</p>
        <div className="flex flex-wrap gap-2">
          <CopyValue value={`hsl(${value})`} label={`--${name} as HSL`} />
          <CopyValue value={hslToHex(value)} label={`--${name} as hex`} />
        </div>
      </div>
    </li>
  );
};

const typeSamples: { cls: string; label: string }[] = [
  { cls: "text-5xl", label: "Display" },
  { cls: "text-3xl", label: "Section" },
  { cls: "text-xl", label: "Lead" },
  { cls: "text-base", label: "Body" },
  { cls: "text-sm", label: "Small" },
  { cls: "text-xs", label: "Caption" },
];

const spacingSteps = ["1", "2", "3", "4", "6", "8", "12", "16"] as const;
const spacingWidth: Record<(typeof spacingSteps)[number], string> = {
  "1": "w-1", "2": "w-2", "3": "w-3", "4": "w-4", "6": "w-6", "8": "w-8", "12": "w-12", "16": "w-16",
};

const RULES = [
  "Black and greys with white text; one accent, a light grey. No other brand colour on the main site.",
  "Text and its background reach at least 4.5 to 1 contrast; the focus ring is always visible on keyboard focus.",
  "Large headings in Space Grotesk, text in Poppins; small labels in capitals with wide letter spacing.",
  "Soft glass cards: a thin border, a translucent card colour and a background blur, with a gentle lift on hover.",
  "Motion is subtle and short (0.2 to 0.6 seconds); with reduced motion switched on, it stops.",
  "The H mark sits on black, at 80 percent opacity rising to full on hover; it is never stretched or recoloured.",
];

const Brand = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Palette}
      name="Brand"
      promise="The Houcine.world design language"
      intro="One technical base, one design language, shared by every vertical of the ecosystem. These are the live tokens of this site: copy any value below."
    />

    <ServiceSection id="logo" title="Logo">
      <div className="grid gap-6 md:grid-cols-2 items-center">
        <div className="rounded-lg border border-border/60 bg-background flex items-center justify-center p-10">
          <img src={logoH} alt="The Houcine.world H mark" width={160} height={160} className="w-40 h-40 opacity-80 hover:opacity-100 transition-opacity" />
        </div>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-muted-foreground">File</dt><dd className="font-mono text-foreground">src/assets/logo-h.png</dd></div>
          <div><dt className="text-muted-foreground">Size</dt><dd className="text-foreground">500 × 500 px, PNG</dd></div>
          <div><dt className="text-muted-foreground">In the header</dt><dd className="text-foreground">32 to 40 px high</dd></div>
          <div><dt className="text-muted-foreground">Share image</dt><dd className="font-mono text-foreground">public/og-default.png, 1200 × 630 px</dd></div>
          <div>
            <dt className="text-muted-foreground">Download</dt>
            <dd><Link to="/brand-kit" className={cn("inline-flex items-center min-h-11 text-accent underline hover:text-accent/80 rounded", focusRing)}>The brand kit</Link></dd>
          </div>
        </dl>
      </div>
    </ServiceSection>

    <ServiceSection id="colours" title="Colours">
      <p className="text-muted-foreground max-w-2xl mb-8">
        Every colour is an HSL value used as <code className="font-mono text-foreground">hsl(var(--name))</code>. The palette
        is dark by default.
      </p>
      <div className="space-y-10">
        {SWATCH_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{group.title}</h3>
            <ul className="grid gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {group.names.filter((n) => n in colors).map((n) => <Swatch key={n} name={n} />)}
            </ul>
          </div>
        ))}
      </div>
    </ServiceSection>

    <ServiceSection id="type" title="Type">
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <p className="font-display text-3xl text-foreground">Space Grotesk</p>
            <CardDescription>Display: large headings. Weights {tokens.fonts.display.weights.join(", ")}.</CardDescription>
          </CardHeader>
          <CardContent><CopyValue value="font-display" label="the display font class" /></CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <p className="font-sans text-3xl text-foreground">Poppins</p>
            <CardDescription>Text. Weights {tokens.fonts.sans.weights.join(", ")}.</CardDescription>
          </CardHeader>
          <CardContent><CopyValue value="font-sans" label="the text font class" /></CardContent>
        </Card>
      </div>
      <ul className="space-y-4">
        {typeSamples.map(({ cls, label }) => (
          <li key={cls} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 border-b border-border/40 pb-4">
            <span className="w-36 shrink-0"><CopyValue value={cls} label={`the ${label} size class`} /></span>
            <span className={cn("font-display text-foreground leading-tight break-words min-w-0", cls)}>{label}</span>
          </li>
        ))}
      </ul>
    </ServiceSection>

    <ServiceSection id="space" title="Spacing and radius">
      <div className="grid gap-10 md:grid-cols-2">
        <ul className="space-y-3" aria-label="Spacing steps">
          {spacingSteps.map((step) => (
            <li key={step} className="flex items-center gap-4">
              <span className={cn("h-4 bg-accent rounded-sm", spacingWidth[step])} aria-hidden="true" />
              <span className="text-sm text-muted-foreground">
                <span className="font-mono text-foreground">{step}</span> = {tokens.spacing[step]}
              </span>
            </li>
          ))}
        </ul>
        <ul className="grid grid-cols-3 gap-4" aria-label="Radius steps">
          {[["rounded-sm", "8px"], ["rounded-md", "10px"], ["rounded-lg", tokens.radius.base]].map(([cls, size]) => (
            <li key={cls} className="space-y-2 text-center">
              <div className={cn("h-16 border border-border bg-card", cls)} aria-hidden="true" />
              <p className="font-mono text-xs text-foreground">{cls}</p>
              <p className="text-xs text-muted-foreground">{size}</p>
            </li>
          ))}
        </ul>
      </div>
    </ServiceSection>

    <ServiceSection id="components" title="Components">
      <div className="space-y-10">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Card</h3>
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-colors">
              <CardHeader>
                <p className="text-xl font-semibold text-foreground">Card title</p>
                <CardDescription>A thin border, a translucent card colour and a blur.</CardDescription>
              </CardHeader>
              <CardContent><Badge variant="secondary">Badge</Badge></CardContent>
            </Card>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Form controls</h3>
            <div className="space-y-2">
              <Label htmlFor="brand-sample-input">Label</Label>
              <Input id="brand-sample-input" placeholder="Placeholder text" />
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>
        </div>
      </div>
    </ServiceSection>

    <ServiceSection id="rules" title="Rules">
      <ul className="space-y-3 max-w-3xl">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-3 text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </ServiceSection>
  </ServicePageLayout>
);

export default Brand;

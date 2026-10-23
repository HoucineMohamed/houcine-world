import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FEATURED_SERVICES,
  SERVICE_FAMILIES,
  formatPrice,
  priceLabel,
  serviceByName,
  servicesInFamily,
} from "@/content/techCatalogue";

interface Props {
  /** Called with a catalogue service name when a visitor asks for a quote. */
  onQuote: (serviceName: string) => void;
}

/** The five original project types, then all twelve families as an accordion (no wall of cards). */
const TechCatalogue = ({ onQuote }: Props) => (
  <div className="max-w-4xl mx-auto">
    <h3 className="text-xl font-display font-semibold mb-2 text-center">Popular starting points</h3>
    <p className="text-muted-foreground text-center mb-6">Typical timelines are for an agreed entry-level scope.</p>
    <ul className="mb-16">
      {FEATURED_SERVICES.map((f) => {
        const service = serviceByName(f.service)!;
        return (
          <li key={f.label} className="border-t border-border/50 py-6 first:border-t-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                  <h4 className="text-lg font-display font-semibold text-foreground">{f.label}</h4>
                  <Badge variant="secondary" className="w-fit">{f.timeline}</Badge>
                </div>
                <p className="text-muted-foreground">{f.description}</p>
                <p className="text-sm text-accent mt-2">{priceLabel(service)}</p>
              </div>
              <Button variant="outline" size="sm" className="w-fit shrink-0" onClick={() => onQuote(service.name)} aria-label={`Request a quote for ${f.label}`}>
                Request a quote
              </Button>
            </div>
          </li>
        );
      })}
    </ul>

    <h3 className="text-xl font-display font-semibold mb-2 text-center">Full service catalogue</h3>
    <p className="text-muted-foreground text-center mb-6 max-w-2xl mx-auto">
      Twelve service areas. Open one to see every service and its starting price.
    </p>
    <Accordion type="multiple" className="border-t border-border/50">
      {SERVICE_FAMILIES.map((family) => {
        const services = servicesInFamily(family.slug);
        const lowest = Math.min(...services.filter((s) => s.billing === "one-time").map((s) => s.from));
        return (
          <AccordionItem key={family.slug} value={family.slug} id={`family-${family.slug}`} className="border-border/50">
            <AccordionTrigger className="text-left hover:no-underline py-5">
              <span className="flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6 pr-4">
                <span>
                  <span className="block text-lg font-display font-semibold text-foreground">{family.name}</span>
                  <span className="block text-sm text-muted-foreground font-normal">{family.summary}</span>
                </span>
                <span className="text-sm text-muted-foreground font-normal whitespace-nowrap">
                  {services.length} services · from {formatPrice(lowest)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {family.note && <p className="text-sm text-muted-foreground mb-4 border-l-2 border-accent/40 pl-3">{family.note}</p>}
              <ul>
                {services.map((s) => (
                  <li key={s.slug} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-t border-border/30 first:border-t-0">
                    <span className="flex-1">
                      <span className="text-foreground">{s.name}</span>
                      {s.description && <span className="block text-sm text-muted-foreground">{s.description}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                      {s.billing === "monthly" && <Badge variant="outline">Monthly</Badge>}
                      {priceLabel(s)}
                    </span>
                    <Button variant="ghost" size="sm" className="w-fit sm:shrink-0" onClick={() => onQuote(s.name)} aria-label={`Request a quote for ${s.name}`}>
                      Quote
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  </div>
);

export default TechCatalogue;

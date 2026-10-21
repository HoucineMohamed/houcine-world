import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ServicePackage {
  name: string;
  description: string;
  basePrice: number;
  features: string[];
  fullDescription: string;
}

interface ServicePackageCardProps {
  package: ServicePackage;
  onBookClick: (packageName: string) => void;
}

// Prices are fixed starting prices, the same number in EUR and USD -- never a live conversion
// (program: master redesign, section 7).
export const ServicePackageCard = ({ package: pkg, onBookClick }: ServicePackageCardProps) => {
  return (
    <div className="border-t border-border/50 py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
        <h3 className="text-xl font-display font-bold text-foreground">{pkg.name}</h3>
        <span className="text-lg font-semibold text-accent whitespace-nowrap">
          Starting at €{pkg.basePrice} / ${pkg.basePrice}
        </span>
      </div>
      <p className="text-muted-foreground mb-4">{pkg.description}</p>
      <ul className="space-y-2 mb-6">
        {pkg.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Learn more</Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{pkg.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">{pkg.fullDescription}</p>
              <p className="text-xl font-bold text-accent">Starting at €{pkg.basePrice} / ${pkg.basePrice}</p>
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={() => onBookClick(pkg.name)}>Request quote</Button>
      </div>
    </div>
  );
};

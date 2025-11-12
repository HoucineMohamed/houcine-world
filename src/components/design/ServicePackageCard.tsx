import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrency } from "@/contexts/CurrencyContext";
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

export const ServicePackageCard = ({ package: pkg, onBookClick }: ServicePackageCardProps) => {
  const { currency, convertPrice } = useCurrency();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-display">{pkg.name}</CardTitle>
        <CardDescription>{pkg.description}</CardDescription>
        <div className="text-3xl font-bold text-accent mt-4">
          {convertPrice(pkg.basePrice)} {currency}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <ul className="space-y-2 mb-6">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Learn More
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">{pkg.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground">{pkg.fullDescription}</p>
                <div className="text-2xl font-bold text-accent">
                  {convertPrice(pkg.basePrice)} {currency}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button className="w-full" onClick={() => onBookClick(pkg.name)}>
            Request Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

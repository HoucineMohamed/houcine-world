import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DevServicePackage } from "@/data/devServicePackages";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface DevServiceCardProps {
  service: DevServicePackage;
  onRequestQuote: (service: DevServicePackage) => void;
}

const DevServiceCard = ({ service, onRequestQuote }: DevServiceCardProps) => {
  const { currency, convertPrice } = useCurrency();
  const IconComponent = (Icons[service.icon as keyof typeof Icons] as LucideIcon) || Icons.Package;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/50 hover:shadow-lg hover:shadow-tech-blue/20 transition-all duration-300 group hover:scale-[1.02] h-full flex flex-col">
      <CardHeader>
        <div className="w-16 h-16 bg-tech-blue/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-tech-blue/20 transition-colors">
          <IconComponent className="w-8 h-8 text-tech-blue" />
        </div>
        <CardTitle className="text-2xl mb-2">{service.name}</CardTitle>
        <CardDescription className="text-base">{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-tech-blue">
              {currency === "EUR" ? "€" : currency === "USD" ? "$" : "TND "}
              {convertPrice(service.basePrice)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {service.deliveryTime}
            </Badge>
          </div>
          
          <ul className="space-y-2 text-sm text-muted-foreground">
            {service.features.slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-tech-blue mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button 
          className="w-full mt-6 bg-tech-blue hover:bg-tech-blue/90"
          onClick={() => onRequestQuote(service)}
        >
          Request Quote
        </Button>
      </CardContent>
    </Card>
  );
};

export default DevServiceCard;

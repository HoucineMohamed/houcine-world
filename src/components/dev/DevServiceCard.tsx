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
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 group hover:scale-[1.02] h-full flex flex-col">
      <CardHeader className="p-2.5 sm:p-4 md:p-6">
        <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-accent/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-accent/20 transition-colors">
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-accent" />
        </div>
        <CardTitle className="text-sm sm:text-xl md:text-2xl mb-1 sm:mb-2">{service.name}</CardTitle>
        <CardDescription className="text-xs sm:text-sm md:text-base line-clamp-2">{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 pt-0">
        <div className="space-y-2 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-bold text-accent">
              {currency === "EUR" ? "€" : currency === "USD" ? "$" : ""}
              {convertPrice(service.basePrice)}
              {currency === "TND" && <span className="text-xs sm:text-sm ml-0.5">TND</span>}
            </span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs w-fit">
              {service.deliveryTime}
            </Badge>
          </div>
          
          <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground hidden sm:block">
            {service.features.slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-start gap-1 sm:gap-2">
                <span className="text-accent mt-0.5">✓</span>
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button 
          className="w-full mt-3 sm:mt-6 text-xs sm:text-sm py-1.5 sm:py-2"
          onClick={() => onRequestQuote(service)}
        >
          Request Quote
        </Button>
      </CardContent>
    </Card>
  );
};

export default DevServiceCard;
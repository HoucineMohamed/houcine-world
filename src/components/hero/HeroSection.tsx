import { useState, useCallback } from "react";
import WebGLHero, { ServiceData } from "./WebGLHero";
import HeroOverlay from "./HeroOverlay";

export default function HeroSection() {
  const [activeService, setActiveService] = useState<ServiceData | null>(null);

  const handleActiveServiceChange = useCallback((service: ServiceData | null) => {
    setActiveService(service);
  }, []);

  return (
    <section 
      id="home" 
      className="relative min-h-screen w-full overflow-hidden bg-background"
      aria-label="Hero section showcasing Houcine.world ecosystem"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-secondary/20 pointer-events-none" />
      
      {/* WebGL Canvas */}
      <WebGLHero onActiveServiceChange={handleActiveServiceChange} />
      
      {/* HTML Overlay */}
      <HeroOverlay activeService={activeService} />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_70%,hsl(var(--background))_100%)]" />
    </section>
  );
}

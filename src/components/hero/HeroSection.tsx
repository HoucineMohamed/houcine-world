import { useState, useCallback } from "react";
import WebGLHero, { ServiceData } from "./WebGLHero";
import HeroOverlay from "./HeroOverlay";
import HeroLoader from "./HeroLoader";

export default function HeroSection() {
  const [activeService, setActiveService] = useState<ServiceData | null>(null);
  const [isSceneLoading, setIsSceneLoading] = useState(true);

  const handleActiveServiceChange = useCallback((service: ServiceData | null) => {
    setActiveService(service);
  }, []);

  const handleSceneReady = useCallback((ready: boolean) => {
    if (ready) {
      setIsSceneLoading(false);
    }
  }, []);

  return (
    <section 
      id="home" 
      className="relative w-full overflow-hidden bg-background min-h-screen"
      style={{
        // iOS Safari fix for address bar
        minHeight: 'calc(var(--vh, 1vh) * 100)',
      }}
      aria-label="Hero section showcasing Houcine.world ecosystem"
    >
      {/* Set CSS variable for true viewport height on mobile */}
      <style>{`
        :root {
          --vh: 1vh;
        }
        @supports (-webkit-touch-callout: none) {
          :root {
            --vh: 1svh;
          }
        }
      `}</style>
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-secondary/20 pointer-events-none" />
      
      {/* Loading shimmer */}
      <HeroLoader isLoading={isSceneLoading} />
      
      {/* WebGL Canvas - always visible, no conditional rendering */}
      <WebGLHero 
        onActiveServiceChange={handleActiveServiceChange} 
        onSceneReady={handleSceneReady}
      />
      
      {/* HTML Overlay */}
      <HeroOverlay activeService={activeService} />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_70%,hsl(var(--background))_100%)]" />
    </section>
  );
}

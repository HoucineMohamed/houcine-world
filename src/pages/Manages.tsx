import { Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import laRosaLogo from "@/assets/images/larosaview-logo.png";

import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Manages = () => {
  const contentAnimation = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0))"}
            />
          </Link>
        </div>
      </header>

      <main 
        ref={contentAnimation.ref}
        className={`pt-24 pb-16 px-6 transition-all duration-700 ${
          contentAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <Briefcase className="w-12 h-12 text-accent" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Houcine.management</h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-12">
            Building creative brands and projects — coming soon.
          </p>

          <div className="flex flex-wrap justify-center gap-12 sm:gap-16 md:gap-24 py-8 sm:py-12">
            <Link
              to="/larosaview"
              className="group relative flex flex-col items-center gap-5 outline-none"
              aria-label="DJ La Rosa View — music brand management"
            >
              <div className="absolute -inset-8 rounded-full bg-accent/0 blur-2xl transition-all duration-500 group-hover:bg-accent/10" />
              <img
                src={laRosaLogo}
                alt="DJ La Rosa View logo"
                loading="lazy"
                className="relative h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 object-contain opacity-75 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:-translate-y-1.5 group-hover:scale-[1.04]"
              />
              <div className="relative text-center">
                <p className="font-display text-sm sm:text-base tracking-[0.2em] uppercase text-foreground/80 transition-colors duration-300 group-hover:text-foreground">
                  La Rosa View
                </p>
                <p className="mt-1 text-xs text-muted-foreground opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Music brand management
                </p>
              </div>
            </Link>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Manages;

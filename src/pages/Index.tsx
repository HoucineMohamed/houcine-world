import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import { SearchButton } from "@/components/search/SiteSearch";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import HeroSection from "@/components/hero/HeroSection";
import EcosystemMap from "@/components/EcosystemMap";
import OwnerServiceSlot from "@/components/owner/OwnerServiceSlot";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Index = () => {
  const servicesAnimation = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/about" className="flex items-center gap-3 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:-my-0.5 group">
            <img 
              src={logoH} 
              alt="Houcine Logo" 
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 drop-shadow-lg" 
            />
            <span className="text-xl font-bold text-foreground group-hover:text-accent transition-colors">
              Houcine.world
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dev" className="inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-my-2.5 hover:text-accent transition-all hover:scale-105 duration-200">Tech</Link>
            <Link to="/designs" className="inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-my-2.5 hover:text-accent transition-all hover:scale-105 duration-200">Studio</Link>
            <Link to="/reads" className="inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-my-2.5 hover:text-accent transition-all hover:scale-105 duration-200">Education</Link>
            <Link to="/manages" className="inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-my-2.5 hover:text-accent transition-all hover:scale-105 duration-200">Management</Link>
          </nav>

          <div className="flex items-center gap-3">
          <SearchButton />
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/dev" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Tech</Link>
                <Link to="/designs" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Studio</Link>
                <Link to="/reads" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Education</Link>
                <Link to="/manages" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Management</Link>
              </nav>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Living-logo hero: see src/components/hero/HeroSection.tsx */}
        <HeroSection />

        {/* Ecosystem map: replaces the old four-card grid with a connected typographic list */}
        <section
          id="services"
          ref={servicesAnimation.ref}
          className={`py-20 px-6 bg-secondary/30 transition-all duration-700 ${
            servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 font-display">
              The Ecosystem
            </h2>
            <p className="text-muted-foreground text-center mb-4 max-w-2xl mx-auto">
              Four connected disciplines, each with its own route and its own character.
            </p>
            <p className="text-center mb-12">
              <Link to="/ecosystem" className="inline-flex items-center [@media(pointer:coarse)]:min-h-11 text-sm text-accent underline hover:text-accent/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                About the ecosystem
              </Link>
            </p>

            <EcosystemMap />

            {/* Private card: renders only for the super admin (see docs/trades-integration.md) */}
            <OwnerServiceSlot />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

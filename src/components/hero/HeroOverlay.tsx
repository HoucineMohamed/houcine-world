import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Mail, Linkedin, Github, Palette, ExternalLink, ArrowRight } from "lucide-react";
import { ServiceData } from "./WebGLHero";
import CharacterPortrait from "./CharacterPortrait";

interface HeroOverlayProps {
  activeService: ServiceData | null;
}

export default function HeroOverlay({ activeService }: HeroOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
      {/* Main content */}
      <div className="text-center px-6 max-w-4xl mx-auto">
        {/* Character Portrait - positioned above brand name */}
        <div className="mb-6 md:mb-8 pointer-events-auto flex justify-center">
          <CharacterPortrait />
        </div>
        
        {/* Brand name */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground mb-4 md:mb-6 tracking-tight font-display drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
          Houcine<span className="text-accent drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">.</span>world
        </h1>
        
        {/* Description */}
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed">
          The creative ecosystem of Mohamed Houcine — exploring technology, design, management, and innovation.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pointer-events-auto">
          <a 
            href="#services" 
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 md:px-8 md:py-4 rounded-lg font-semibold text-base md:text-lg hover:bg-accent/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/20"
          >
            <ExternalLink className="w-5 h-5" />
            Explore Services
          </a>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="lg"
                className="border-metallic/30 text-foreground hover:bg-metallic/10 px-6 py-3 md:px-8 md:py-4 text-base md:text-lg h-auto"
              >
                Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Contact Information</DialogTitle>
                <DialogDescription>
                  Feel free to reach out through any of these channels
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <a href="tel:+21629541180" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Phone className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                  <span>+216 29 541 180</span>
                </a>
                <a href="mailto:mohamedhoucine2024@gmail.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Mail className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                  <span>mohamedhoucine2024@gmail.com</span>
                </a>
                <a href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Linkedin className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                  <span>LinkedIn Profile</span>
                </a>
                <a href="https://github.com/HoucineMohamed" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Github className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                  <span>GitHub Profile</span>
                </a>
                <a href="https://www.behance.net/HoucineDesigns" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                  <Palette className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                  <span>Behance Portfolio</span>
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Service HUD - appears on right side when service is highlighted (hidden on mobile) */}
      <div 
        className={`
          fixed right-4 md:right-8 top-1/2 -translate-y-1/2 
          max-w-xs md:max-w-sm
          pointer-events-auto
          transition-all duration-500 ease-out
          hidden md:block
          ${activeService ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}
        `}
      >
        {activeService && (
          <Link 
            to={activeService.path}
            className="block p-4 md:p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 hover:border-accent/50 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: activeService.color + "20" }}
              >
                {activeService.icon === "terminal" && "⌨"}
                {activeService.icon === "palette" && "🎨"}
                {activeService.icon === "book" && "📚"}
                {activeService.icon === "briefcase" && "💼"}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground group-hover:text-accent transition-colors">
                {activeService.name}
              </h3>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
              {activeService.description}
            </p>
            <span className="inline-flex items-center gap-2 text-accent text-sm font-medium group-hover:gap-3 transition-all">
              Explore <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
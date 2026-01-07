import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Mail, Github, Linkedin, ExternalLink } from "lucide-react";
import houcineCharacter from "@/assets/houcine-character.jpg";

interface CharacterPortraitProps {
  className?: string;
}

export default function CharacterPortrait({ className }: CharacterPortraitProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [idleTime, setIdleTime] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Fade-in entrance: 0.5s delay, 2s float
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      setTimeout(() => setIsVisible(true), 100);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Mouse parallax effect (desktop only, ±6 degrees)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastInteractionRef.current = Date.now();
      setIdleTime(0);
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // ±6 degrees rotation based on cursor position
      const rotateY = ((e.clientX - centerX) / centerX) * 6;
      const rotateX = ((centerY - e.clientY) / centerY) * 6;
      
      setRotation({ x: rotateX, y: rotateY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

  // Idle sway animation after 5 seconds of no interaction
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    idleTimerRef.current = window.setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction > 5000) {
        setIdleTime((prev) => prev + 0.05);
      }
    }, 50);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [prefersReducedMotion]);

  // Idle sway calculation - synced with hero timing
  const idleSwayX = prefersReducedMotion ? 0 : Math.sin(idleTime * 0.8) * 2;
  const idleSwayY = prefersReducedMotion ? 0 : Math.cos(idleTime * 0.6) * 1.5;

  return (
    <>
      <div
        ref={containerRef}
        className={`
          relative cursor-pointer select-none group
          transition-all ease-out
          ${isLoaded ? "opacity-100" : "opacity-0"}
          ${isVisible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}
          ${className}
        `}
        style={{
          transitionDuration: isVisible ? "2000ms" : "700ms",
        }}
        onClick={() => setShowBio(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setShowBio(true)}
        aria-label="Click to view Mohamed Houcine's bio and contact information"
      >
        {/* Rim glow effect - upper-right light source matching WebGL hero */}
        <div 
          className="absolute -inset-4 -z-10 opacity-70 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 60% at 70% 20%, 
                hsl(var(--accent) / 0.5) 0%, 
                hsl(var(--accent) / 0.2) 30%, 
                transparent 70%
              )
            `,
            filter: "blur(20px)",
            transform: `translateX(${idleSwayX * 0.3}px) translateY(${idleSwayY * 0.3}px)`,
          }}
        />

        {/* Soft ambient glow beneath */}
        <div 
          className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 80%, hsl(var(--accent) / 0.4) 0%, transparent 60%)",
            filter: "blur(40px)",
            transform: "scale(1.5) translateY(20%)",
          }}
        />

        {/* Character image with parallax transform */}
        <div
          className="relative"
          style={{
            transform: prefersReducedMotion
              ? "none"
              : `
                perspective(1000px) 
                rotateX(${rotation.x + idleSwayY}deg) 
                rotateY(${rotation.y + idleSwayX}deg)
                translateZ(15px)
              `,
            transition: "transform 0.15s cubic-bezier(0.33, 1, 0.68, 1)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Soft drop shadow for depth - no circular frame */}
          <div 
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, hsl(var(--background) / 0.8) 0%, transparent 70%)",
              filter: "blur(15px)",
              transform: `translateY(${2 + idleSwayY * 0.5}px)`,
            }}
          />
          
          {/* Image - seamless integration, no border/frame */}
          <div className="relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 overflow-hidden">
            <img
              src={houcineCharacter}
              alt="Mohamed Houcine - Founder of Houcine.world"
              className="w-full h-full object-cover object-top"
              style={{
                maskImage: "radial-gradient(ellipse 95% 95% at 50% 45%, black 60%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 95% 95% at 50% 45%, black 60%, transparent 100%)",
              }}
              loading="eager"
              onLoad={() => setIsLoaded(true)}
            />
            
            {/* Rim highlight overlay - matches hero lighting */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(135deg, 
                    transparent 50%, 
                    hsl(var(--accent) / 0.15) 70%, 
                    hsl(var(--accent) / 0.25) 85%, 
                    transparent 100%
                  )
                `,
              }}
            />
            
            {/* Bottom fade for scene blending */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, hsl(var(--background) / 0.6) 0%, transparent 40%)",
              }}
            />
          </div>

          {/* Interactive hover glow pulse */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.2) 0%, transparent 60%)",
              filter: "blur(20px)",
            }}
          />
        </div>

        {/* Subtle click hint on hover */}
        <div 
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        >
          <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
            Click for bio
          </span>
        </div>
      </div>

      {/* Bio Modal */}
      <Dialog open={showBio} onOpenChange={setShowBio}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">
              <img
                src={houcineCharacter}
                alt="Mohamed Houcine"
                className="w-16 h-16 rounded-lg object-cover object-top shadow-lg"
              />
              <div>
                <h3 className="text-xl font-bold">Mohamed Houcine</h3>
                <p className="text-sm font-normal text-muted-foreground">
                  Founder & Creative Director
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Biography and contact information for Mohamed Houcine
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground leading-relaxed">
              A passionate technologist and creative visionary building at the intersection of 
              development, design, and innovation. Through <span className="text-accent font-medium">Houcine.world</span>, 
              I create digital experiences that inspire and empower.
            </p>
            
            <p className="text-muted-foreground leading-relaxed">
              With expertise spanning full-stack development, UI/UX design, and creative direction, 
              I help brands and individuals bring their digital visions to life.
            </p>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 text-foreground">Quick Links</h4>
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href="mailto:mohamedhoucine2024@gmail.com"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 text-accent" />
                  <span>Email Me</span>
                </a>
                <a 
                  href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 transition-colors text-sm"
                >
                  <Linkedin className="w-4 h-4 text-accent" />
                  <span>LinkedIn</span>
                </a>
                <a 
                  href="https://github.com/HoucineMohamed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 transition-colors text-sm"
                >
                  <Github className="w-4 h-4 text-accent" />
                  <span>GitHub</span>
                </a>
                <a 
                  href="#services"
                  onClick={() => setShowBio(false)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 transition-colors text-sm"
                >
                  <Briefcase className="w-4 h-4 text-accent" />
                  <span>View Services</span>
                </a>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1" 
                onClick={() => setShowBio(false)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Explore Portfolio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

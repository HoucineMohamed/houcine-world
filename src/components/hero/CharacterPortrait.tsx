import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Briefcase, Mail, Github, Linkedin, ExternalLink } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Fade-in on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      // Delayed visibility for smoother entrance
      setTimeout(() => setIsVisible(true), 100);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Mouse parallax effect (desktop only)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastInteractionRef.current = Date.now();
      setIdleTime(0);
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Calculate rotation based on mouse position (±6 degrees)
      const rotateY = ((e.clientX - centerX) / centerX) * 6;
      const rotateX = ((centerY - e.clientY) / centerY) * 6;
      
      setRotation({ x: rotateX, y: rotateY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Idle animation timer
  useEffect(() => {
    idleTimerRef.current = window.setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction > 5000) {
        setIdleTime((prev) => prev + 0.05);
      }
    }, 50);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

  // Idle sway calculation
  const idleSwayX = Math.sin(idleTime * 0.8) * 2;
  const idleSwayY = Math.cos(idleTime * 0.6) * 1.5;

  return (
    <>
      <div
        ref={containerRef}
        className={`
          relative cursor-pointer select-none
          transition-all duration-700 ease-out
          ${isLoaded ? "opacity-100" : "opacity-0"}
          ${isVisible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}
          ${className}
        `}
        onClick={() => setShowBio(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setShowBio(true)}
        aria-label="Click to view Mohamed Houcine's bio"
      >
        {/* Glow effect behind character */}
        <div 
          className="absolute inset-0 -z-10 blur-3xl opacity-40"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--accent) / 0.4) 0%, transparent 70%)",
            transform: `scale(1.5)`,
          }}
        />

        {/* Rim light effect */}
        <div 
          className="absolute inset-0 -z-5 rounded-full opacity-60"
          style={{
            background: "linear-gradient(135deg, transparent 40%, hsl(var(--accent) / 0.3) 60%, hsl(var(--accent) / 0.5) 80%, transparent 100%)",
            transform: `scale(1.1) translateX(10px) translateY(-10px)`,
            filter: "blur(20px)",
          }}
        />

        {/* Character image container */}
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            transform: `
              perspective(1000px) 
              rotateX(${rotation.x + idleSwayY}deg) 
              rotateY(${rotation.y + idleSwayX}deg)
              translateZ(10px)
            `,
            transition: "transform 0.15s ease-out",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Soft shadow */}
          <div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/30 blur-xl rounded-full"
            style={{
              transform: `translateY(${2 + idleSwayY * 0.5}px)`,
            }}
          />
          
          {/* Image with gradient overlay for blending */}
          <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64">
            <img
              src={houcineCharacter}
              alt="Mohamed Houcine - Founder of Houcine.world"
              className="w-full h-full object-cover object-top rounded-full border-2 border-accent/20 shadow-2xl shadow-accent/10"
              loading="eager"
              onLoad={() => setIsLoaded(true)}
            />
            
            {/* Subtle gradient overlay for scene blending */}
            <div 
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(180deg, transparent 50%, hsl(var(--background) / 0.3) 100%)",
              }}
            />
            
            {/* Click indicator ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-accent/0 hover:border-accent/40 transition-all duration-300"
              style={{
                animation: isVisible ? "pulse-ring 3s ease-in-out infinite" : "none",
              }}
            />
          </div>
        </div>

        {/* Floating label */}
        <div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-card/80 backdrop-blur-sm rounded-full border border-border/50 shadow-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-300"
          style={{
            transform: `translateX(-50%) translateY(${8 + idleSwayY}px)`,
          }}
        >
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Click to learn more
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
                className="w-16 h-16 rounded-full object-cover object-top border-2 border-accent/30"
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

      {/* Keyframes for pulse ring animation */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 0 hsl(var(--accent) / 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px hsl(var(--accent) / 0);
          }
        }
      `}</style>
    </>
  );
}

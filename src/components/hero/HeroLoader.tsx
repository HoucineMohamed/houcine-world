import { useEffect, useState } from "react";
import logoH from "@/assets/houcine-logo-h.png";

interface HeroLoaderProps {
  isLoading: boolean;
}

export default function HeroLoader({ isLoading }: HeroLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleChange);
    return () => motionQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Delay hiding for smooth transition
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-secondary/20 transition-all duration-700 ease-out ${
        isLoading ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      aria-label="Loading experience"
      role="progressbar"
      aria-valuetext="Loading"
    >
      {/* Shimmer background effect */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(
                105deg,
                transparent 40%,
                hsl(var(--primary) / 0.1) 45%,
                hsl(var(--primary) / 0.2) 50%,
                hsl(var(--primary) / 0.1) 55%,
                transparent 60%
              )`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 2.5s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Logo container with glow */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Ambient glow behind logo */}
        <div 
          className={`absolute w-40 h-40 sm:w-56 sm:h-56 rounded-full blur-3xl ${
            prefersReducedMotion ? 'opacity-20' : 'opacity-30'
          }`}
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'pulse-glow 3s ease-in-out infinite',
          }}
        />

        {/* H Logo */}
        <div 
          className={`relative z-10 ${
            prefersReducedMotion ? '' : 'animate-logo-float'
          }`}
        >
          <img
            src={logoH}
            alt="Houcine.world"
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl"
            style={{
              filter: `drop-shadow(0 0 20px hsl(var(--primary) / 0.5)) 
                       drop-shadow(0 0 40px hsl(var(--primary) / 0.3))`,
            }}
          />
        </div>

        {/* Loading text */}
        <p 
          className={`text-sm text-muted-foreground/60 tracking-widest uppercase ${
            prefersReducedMotion ? 'opacity-60' : 'animate-fade-text'
          }`}
        >
          Loading experience
        </p>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.35; 
            transform: scale(1.05);
          }
        }
        
        @keyframes logo-float {
          0%, 100% { 
            transform: translateY(0); 
          }
          50% { 
            transform: translateY(-6px); 
          }
        }
        
        @keyframes fade-text {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        .animate-logo-float {
          animation: logo-float 3s ease-in-out infinite;
        }
        
        .animate-fade-text {
          animation: fade-text 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

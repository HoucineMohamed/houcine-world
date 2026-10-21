import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Linkedin, Github, Palette, ExternalLink } from "lucide-react";
import LogoHero from "./LogoHero";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, contactMailto } from "@/config/contact";

// The homepage hero: a spatial, editorial composition built around the living logo (LogoHero.tsx),
// not the old WebGL particle scene or a photograph. Asymmetric on desktop -- logo and text sit side
// by side, neither centered under the other -- and stacks on mobile. Both original CTAs ("Explore
// Services", "Contact") keep their destinations: the services anchor below, and a quick-contact
// dialog with the current phone/email.

export default function HeroSection() {
  const [showContact, setShowContact] = useState(false);
  const emailHref = contactMailto(CONTACT_EMAIL, "Hello from Houcine.world");

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden bg-background"
      style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}
      aria-label="Hero section showcasing Houcine.world ecosystem"
    >
      <style>{`
        :root { --vh: 1vh; }
        @supports (-webkit-touch-callout: none) { :root { --vh: 1svh; } }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-secondary/20 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.3)_75%,hsl(var(--background))_100%)]" />

      <div className="relative z-10 container mx-auto px-6 pt-28 pb-16 md:pt-0 md:pb-0 min-h-[inherit] flex flex-col md:flex-row items-center md:gap-8 lg:gap-16">
        {/* Logo: dominant, off-center on desktop */}
        <div className="w-full md:w-3/5 flex items-center justify-center order-1 md:order-2">
          <LogoHero />
        </div>

        {/* Copy: left-aligned, asymmetric against the logo -- not stacked centered beneath it */}
        <div className="w-full md:w-2/5 order-2 md:order-1 text-center md:text-left mt-4 md:mt-0">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">Houcine.world</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-foreground mb-6 max-w-xl mx-auto md:mx-0">
            Technology, design and strategy — brought together as one practice.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto md:mx-0 mb-10">
            Four disciplines working from a shared foundation: Houcine.tech, Houcine.studio,
            Houcine.management and Houcine.education.
          </p>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <a
              href="#services"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 md:px-8 md:py-4 rounded-lg font-semibold text-base hover:bg-accent/90 transition-all duration-300 hover:scale-[1.03]"
            >
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
              Explore Services
            </a>

            <Dialog open={showContact} onOpenChange={setShowContact}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-metallic/30 text-foreground hover:bg-metallic/10 px-6 py-3 md:px-8 md:py-4 text-base h-auto">
                  Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Contact Information</DialogTitle>
                  <DialogDescription>Feel free to reach out through any of these channels</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                    <Phone className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span>{CONTACT_PHONE_DISPLAY}</span>
                  </a>
                  {emailHref && (
                    <a href={emailHref} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                      <Mail className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
                      <span>{CONTACT_EMAIL}</span>
                    </a>
                  )}
                  <a href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                    <Linkedin className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span>LinkedIn Profile</span>
                  </a>
                  <a href="https://github.com/HoucineMohamed" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                    <Github className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span>GitHub Profile</span>
                  </a>
                  <a href="https://www.behance.net/HoucineDesigns" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                    <Palette className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span>Behance Portfolio</span>
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

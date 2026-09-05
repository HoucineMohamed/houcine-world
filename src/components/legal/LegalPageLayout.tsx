import React from "react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { LEGAL_LAST_UPDATED } from "@/data/legal";

/**
 * Shared shell for /terms and /privacy: same fixed header pattern used
 * across the rest of the public site, a plain readable content column
 * (no marketing animation), and the site's shared Footer. Two pages share
 * this instead of each re-implementing it.
 */
const LegalPageLayout = ({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
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
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0))" }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0))"; }}
          />
        </Link>
      </div>
    </header>

    <main className="pt-32 pb-20 px-6">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="space-y-10 text-muted-foreground leading-relaxed [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent/80">
          {children}
        </div>
      </div>
    </main>

    <Footer />
  </div>
);

export default LegalPageLayout;

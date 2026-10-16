import { Link } from "react-router-dom";
import { Download, Package } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoH from "@/assets/logo-h.png";

// /brand-kit: the brand files that already exist in the repository, to download. No new image files.
// The colours, type and rules are on /brand.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const FILES = [
  { name: "The H mark", file: "houcine-world-h-mark.png", href: logoH, size: "500 × 500 px, PNG", preview: logoH, alt: "The Houcine.world H mark" },
  { name: "Default share image", file: "houcine-world-share.png", href: "/og-default.png", size: "1200 × 630 px, PNG", preview: "/og-default.png", alt: "The Houcine.world share image: the wordmark on black" },
] as const;

const BrandKit = () => (
  <ServicePageLayout>
    <ServiceHero icon={Package} name="Brand kit" promise="The Houcine.world brand files." intro="Download the logo and the share image. The colours, type and rules are on the brand page." />

    <ServiceSection id="files" title="Files">
      <ul className="grid gap-6 md:grid-cols-2">
        {FILES.map((f) => (
          <li key={f.file} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
            <div className="flex items-center justify-center bg-background p-8 border-b border-border/50">
              <img src={f.preview} alt={f.alt} loading="lazy" decoding="async" className="max-h-40 w-auto" />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground">{f.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{f.size}</p>
              <a href={f.href} download={f.file} className={cn(buttonVariants({ variant: "outline" }), "gap-2", focusRing)}>
                <Download className="w-4 h-4" aria-hidden="true" />
                Download {f.name.toLowerCase()}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground mt-8 max-w-2xl">
        Use the files on black or very dark backgrounds, without stretching or recolouring them. The full rules are on the{" "}
        <Link to="/brand" className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>brand page</Link>.
      </p>
    </ServiceSection>
  </ServicePageLayout>
);

export default BrandKit;

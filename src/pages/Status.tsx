import { Activity } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";

// /status: which build of the site is being served, and when it was published. Nothing else (no health
// checks, no third-party status service). The build is named after the fingerprint of its main script
// (Vite gives that file a new name on every change); the date is the publication time the server reports
// for the page (its Last-Modified header, through document.lastModified).

const buildName = () => {
  const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute("src") ?? "";
  return src.match(/\/assets\/([^/]+)\.js$/)?.[1] ?? "development";
};

const published = () => {
  const d = new Date(document.lastModified);
  return Number.isNaN(d.getTime())
    ? "unknown"
    : d.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC";
};

const Status = () => (
  <ServicePageLayout>
    <ServiceHero icon={Activity} name="Status" promise="This version of the site." />
    <ServiceSection id="build" title="Build">
      <dl className="grid gap-6 sm:grid-cols-2 max-w-2xl">
        <div className="rounded-lg border border-border/50 bg-card/50 p-6">
          <dt className="text-sm text-muted-foreground mb-2">Version</dt>
          <dd className="font-mono text-foreground break-all">{buildName()}</dd>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-6">
          <dt className="text-sm text-muted-foreground mb-2">Published</dt>
          <dd className="text-foreground">{published()}</dd>
        </div>
      </dl>
    </ServiceSection>
  </ServicePageLayout>
);

export default Status;

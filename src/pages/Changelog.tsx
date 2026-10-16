import { History } from "lucide-react";
import { ServicePageLayout, ServiceHero, ServiceSection } from "@/components/service/ServicePage";
import { changelog } from "@/content/changelog";
import { formatDate } from "@/content/format";

// /changelog: what changed on the public site, newest first. Generated from the merged items of the
// program (scripts/dev/changelog.mjs), with public wording only.

const Changelog = () => {
  const byDate = new Map<string, string[]>();
  for (const e of changelog) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e.text]);

  return (
    <ServicePageLayout>
      <ServiceHero icon={History} name="Changelog" promise="What changed on the site." />
      <ServiceSection id="changes" title="Changes">
        {byDate.size === 0 ? (
          <p className="text-muted-foreground">Coming soon</p>
        ) : (
          <ol className="space-y-10 border-l border-border/60 pl-6">
            {[...byDate].map(([date, items]) => (
              <li key={date}>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  <time dateTime={date}>{formatDate(date)}</time>
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {items.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </ServiceSection>
    </ServicePageLayout>
  );
};

export default Changelog;

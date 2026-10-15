import { Lock } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TRADES_URL, validateTradesUrl } from "@/config/trades";

// The Houcine.Trades entries inside the workspace (sidebar and /workspace/ecosystem).
// They live in this chunk (re-exported from ./index.tsx) so they are loaded only after the
// super-admin check, together with the private card, and never in the main bundle.
// Same rules as the card: the validated TRADES_URL or nothing; a plain same-tab link with
// rel="noopener noreferrer"; no iframe, no embed, no token, user data or query string,
// and no analytics event on click.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Sidebar row: matches the neighbouring NavLinks (Ecosystem, Platform Credentials). */
export const WorkspaceNavEntry = () => {
  const href = validateTradesUrl(TRADES_URL);
  const body = (
    <>
      <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span>Houcine.Trades</span>
        <span className="text-xs text-muted-foreground">
          {href === null ? "Not deployed yet" : "Private financial workspace"}
        </span>
      </span>
    </>
  );

  if (href === null) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
      >
        {body}
      </div>
    );
  }

  return (
    <a
      href={href}
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50",
        focusRing,
      )}
    >
      {body}
    </a>
  );
};

/** Section with one card on the ecosystem page: the card matches the brand cards above it. */
export const WorkspaceEcosystemEntry = () => {
  const href = validateTradesUrl(TRADES_URL);
  const card = (
    <Card className={cn("h-full transition-colors", href === null ? "opacity-60" : "hover:border-accent")}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" aria-hidden="true" />
          <CardTitle className="text-base">Houcine.Trades</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Private financial workspace{href === null ? " · Not deployed yet" : ""}
        </CardDescription>
      </CardHeader>
    </Card>
  );

  const entry =
    href === null ? (
      <div aria-disabled="true" className="block h-full">
        {card}
      </div>
    ) : (
      <a href={href} rel="noopener noreferrer" className={cn("block h-full rounded-lg", focusRing)}>
        {card}
      </a>
    );

  // The section heading lives here, not in the ecosystem page, so the main bundle holds no text about it.
  return (
    <section aria-labelledby="private-apps-title" className="mt-10">
      <h2 id="private-apps-title" className="text-lg font-semibold text-foreground mb-4">Private apps</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{entry}</div>
    </section>
  );
};

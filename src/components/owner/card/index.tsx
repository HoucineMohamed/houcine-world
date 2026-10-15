import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRADES_URL, validateTradesUrl } from "@/config/trades";

// The private Houcine.Trades card. Loaded only after the super-admin check
// (see ../OwnerServiceSlot.tsx and docs/trades-integration.md).
// Not a bookable service: no price, no booking button, no form.
// The link is a plain same-tab link: no iframe, no embed, no script, and it
// carries no token, session, user data or query parameters. rel="noreferrer"
// also keeps the Referer header from telling Houcine.Trades where you came from.

const cardClass =
  "h-full border-border/50 bg-card/50 backdrop-blur transition-all duration-300";

const CardBody = ({ disabled }: { disabled: boolean }) => (
  <>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
          <Lock className="w-6 h-6 text-accent" aria-hidden="true" />
        </div>
        <CardTitle className={cn(!disabled && "group-hover:text-accent transition-colors")}>
          Houcine.Trades
        </CardTitle>
      </div>
      <CardDescription className="text-base">Private financial workspace, owner only</CardDescription>
    </CardHeader>
    <CardContent>
      {disabled ? (
        <p className="text-sm text-muted-foreground">Not deployed yet</p>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-accent/30 hover:bg-accent/10 group-hover:border-accent/50",
          )}
        >
          Open
        </span>
      )}
    </CardContent>
  </>
);

const PrivateWorkspaceCard = () => {
  const href = validateTradesUrl(TRADES_URL);

  if (href === null) {
    return (
      <div className="block h-full" aria-disabled="true">
        <Card className={cn(cardClass, "opacity-60")}>
          <CardBody disabled />
        </Card>
      </div>
    );
  }

  return (
    <a href={href} rel="noopener noreferrer" className="block h-full group">
      <Card
        className={cn(
          cardClass,
          "hover:border-accent/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5",
        )}
      >
        <CardBody disabled={false} />
      </Card>
    </a>
  );
};

export default PrivateWorkspaceCard;

// Workspace entries share this chunk so they load only after the super-admin check.
// Exported under one-letter names because the main bundle keeps export names in its
// lazy-import code; descriptive names would hint at what this chunk holds.
export { WorkspaceNavEntry as N, WorkspaceEcosystemEntry as E } from "./WorkspaceEntries";

import { Lock } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Optional public teaser, shown only when SHOW_PUBLIC_TEASER is true
// (src/config/publicTeaser.ts). Neutral text, NO link, no button, no address.
const InvitationTeaserCard = () => (
  <div className="block h-full">
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-accent/10">
            <Lock className="w-6 h-6 text-accent" aria-hidden="true" />
          </div>
          <CardTitle>Houcine.Trades</CardTitle>
        </div>
        <CardDescription className="text-base">Private financial workspace, by invitation</CardDescription>
      </CardHeader>
    </Card>
  </div>
);

export default InvitationTeaserCard;

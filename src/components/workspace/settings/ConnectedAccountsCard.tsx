import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertTriangle, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  disconnectPlatformAccount, fetchConnectedAccounts, startInstagramConnect, type ConnectedAccount,
} from "@/services/connectedAccounts";

const REASON_MESSAGES: Record<string, string> = {
  invalid_state: "That connection attempt expired or was already used. Try connecting again.",
  no_instagram_business_account:
    "No Instagram professional account is linked to a Facebook Page you manage. Convert the account to a Business or Creator account, link it to a Facebook Page, then reconnect.",
  no_ig_account: "The linked Instagram account could not be found. Reconnect to relink it.",
  invalid_token: "Instagram rejected the connection. Reconnect to try again.",
  config_error: "Instagram isn't configured on this workspace yet. Contact an admin.",
  missing_code: "Instagram didn't return an authorization code. Try connecting again.",
};

const ConnectedAccountsCard = ({ brandId, canManage }: { brandId: string; canManage: boolean }) => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(() => {
    fetchConnectedAccounts(brandId).then(setAccounts).catch(() => setAccounts([])).finally(() => setLoading(false));
  }, [brandId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("connected_accounts", brandId, load);

  // Land back here from the Instagram OAuth redirect: surface the result, then clean the URL.
  useEffect(() => {
    const instagram = params.get("instagram");
    if (!instagram) return;
    if (instagram === "connected") toast.success("Instagram connected");
    else if (instagram === "denied") toast.info("Instagram connection was cancelled");
    else if (instagram === "error") {
      const reason = params.get("reason") ?? "";
      toast.error(REASON_MESSAGES[reason] ?? "Couldn't connect Instagram. Please try again.");
    }
    const next = new URLSearchParams(params);
    next.delete("instagram");
    next.delete("reason");
    setParams(next, { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only Instagram has a working OAuth flow in this phase (see PLATFORMS[].connectable);
  // this switch is where a future TikTok/Spotify/etc. "Connect" handler plugs in.
  const connect = async (platformId: string) => {
    if (platformId !== "instagram") return;
    setConnecting(true);
    try {
      await startInstagramConnect(brandId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start the Instagram connection");
      setConnecting(false);
    }
  };

  const disconnect = async (platform: string) => {
    setDisconnecting(platform);
    try {
      await disconnectPlatformAccount(brandId, platform);
      toast.success("Disconnected");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connected Accounts</CardTitle>
        <CardDescription>
          Link this brand's external platforms so their metrics can feed into the analytics dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
        ) : (
          PLATFORMS.map((platform) => {
            const account = accounts.find((a) => a.platform === platform.id);
            const isConnected = account?.status === "connected";
            const isExpired = account?.status === "expired";
            const isError = account?.status === "error";
            const Icon = platform.icon;

            return (
              <div
                key={platform.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3"
              >
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{platform.label}</p>
                  {isConnected && <p className="text-xs text-muted-foreground truncate">{account?.account_name}</p>}
                  {(isExpired || isError) && (
                    <p className="text-xs text-destructive truncate">
                      {account?.error_message ?? "Connection needs attention"}
                    </p>
                  )}
                </div>

                {isConnected && (
                  <Badge variant="secondary" className="gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                )}
                {(isExpired || isError) && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> {isExpired ? "Reconnect needed" : "Error"}
                  </Badge>
                )}
                {!account && <Badge variant="outline">Not Connected</Badge>}

                {platform.connectable && canManage && (
                  isConnected ? (
                    <Button
                      variant="ghost" size="sm"
                      disabled={disconnecting === platform.id}
                      onClick={() => disconnect(platform.id)}
                    >
                      {disconnecting === platform.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Unlink className="w-4 h-4 mr-1" /> Disconnect</>}
                    </Button>
                  ) : (
                    <Button size="sm" disabled={connecting} onClick={() => connect(platform.id)}>
                      {connecting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {isExpired || isError ? "Reconnect" : "Connect"}
                    </Button>
                  )
                )}
                {!platform.connectable && (
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectedAccountsCard;

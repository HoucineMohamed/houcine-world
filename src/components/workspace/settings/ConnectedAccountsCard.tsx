import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertTriangle, Unlink, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  disconnectPlatformAccount, fetchConnectedAccounts, startInstagramConnect, startPlatformConnect,
  type ConnectedAccount, type OAuthPlatform,
} from "@/services/connectedAccounts";
import { fetchCredentialsStatus } from "@/services/platformCredentials";

const reasonMessage = (platformLabel: string, reason: string): string => {
  switch (reason) {
    case "invalid_state":
      return "That connection attempt expired or was already used. Try connecting again.";
    case "invalid_token":
      return `${platformLabel} rejected the connection. Reconnect to try again.`;
    case "config_error":
      return `${platformLabel} isn't configured on this workspace yet. Ask a super admin to set it up under Platform Credentials.`;
    case "missing_code":
      return `${platformLabel} didn't return an authorization code. Try connecting again.`;
    case "no_instagram_business_account":
      return "No Instagram professional account is linked to a Facebook Page you manage. Convert the account to a Business or Creator account, link it to a Facebook Page, then reconnect.";
    case "no_ig_account":
      return "The linked account could not be found. Reconnect to relink it.";
    default:
      return `Couldn't connect ${platformLabel}. Please try again.`;
  }
};

const ConnectedAccountsCard = ({ brandId, canManage }: { brandId: string; canManage: boolean }) => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(() => {
    fetchConnectedAccounts(brandId).then(setAccounts).catch(() => setAccounts([])).finally(() => setLoading(false));
    fetchCredentialsStatus()
      .then((rows) => setConfigured(Object.fromEntries(rows.map((r) => [r.platform, r.configured]))))
      .catch(() => setConfigured({}));
  }, [brandId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("connected_accounts", brandId, load);

  // Land back here from a provider's OAuth redirect: surface the result, then clean the URL.
  useEffect(() => {
    for (const platform of PLATFORMS) {
      const result = params.get(platform.id);
      if (!result) continue;
      if (result === "connected") toast.success(`${platform.label} connected`);
      else if (result === "denied") toast.info(`${platform.label} connection was cancelled`);
      else if (result === "error") {
        toast.error(reasonMessage(platform.label, params.get("reason") ?? ""));
      }
      const next = new URLSearchParams(params);
      next.delete(platform.id);
      next.delete("reason");
      setParams(next, { replace: true });
      load();
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      if (platformId === "instagram") await startInstagramConnect(brandId);
      else await startPlatformConnect(brandId, platformId as OAuthPlatform);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Couldn't start the connection`);
      setConnecting(null);
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
            const isConfigured = configured[platform.id] ?? false;
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
                  {platform.connectable && !isConfigured && !isConnected && (
                    <p className="text-xs text-muted-foreground truncate">
                      Not configured —{" "}
                      <Link to="/workspace/platform-credentials" className="underline hover:text-foreground">
                        set up in Platform Credentials
                      </Link>
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
                  ) : isConfigured ? (
                    <Button size="sm" disabled={connecting === platform.id} onClick={() => connect(platform.id)}>
                      {connecting === platform.id && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {isExpired || isError ? "Reconnect" : "Connect"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled title="Set up this platform's credentials first">
                      <Settings2 className="w-4 h-4 mr-1" /> Connect
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

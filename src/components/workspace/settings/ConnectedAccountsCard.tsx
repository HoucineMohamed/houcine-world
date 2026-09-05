import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertTriangle, Unlink, Settings2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  disconnectPlatformAccount, fetchConnectedAccounts, saveMetaBusinessToken, startInstagramConnect, startPlatformConnect,
  type ConnectedAccount, type OAuthPlatform,
} from "@/services/connectedAccounts";
import { fetchCredentialsStatus } from "@/services/platformCredentials";

// Meta Business Suite has its own dedicated card below — it's a pasted
// System User token, not an OAuth redirect, so it doesn't belong in the
// generic Connect-button loop this list otherwise renders.
const OAUTH_LOOP_PLATFORMS = PLATFORMS.filter((p) => p.id !== "meta_business");
const META_BUSINESS_PLATFORM = PLATFORMS.find((p) => p.id === "meta_business")!;

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
    case "no_page":
      return "No Facebook Page is managed by this account. Create or get added to a Facebook Page, then reconnect.";
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
  const [metaToken, setMetaToken] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

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

  const saveMeta = async () => {
    const token = metaToken.trim();
    if (!token) return;
    setSavingMeta(true);
    try {
      const result = await saveMetaBusinessToken(brandId, token);
      if (!result.ok) {
        // Validation error from the endpoint (bad token, no linked Page,
        // missing permissions) — surfaced verbatim, it's already specific.
        toast.error(result.error ?? "Couldn't validate that token");
        return;
      }
      toast.success(`${META_BUSINESS_PLATFORM.label} connected`);
      setMetaToken("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the token");
    } finally {
      setSavingMeta(false);
    }
  };

  const MetaIcon = META_BUSINESS_PLATFORM.icon;

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
          OAUTH_LOOP_PLATFORMS.map((platform) => {
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
                {(!account || account.status === "disconnected") && <Badge variant="outline">Not Connected</Badge>}

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

        {/*
          Meta Business Suite: authenticated via a pasted System User token,
          not an OAuth redirect, so it gets its own visually distinct card
          (dashed border, tinted background, a paste field + Save button)
          instead of a row in the Connect-button list above. Connected
          status still uses the same badge/label/icon language as every
          other platform.
        */}
        {!loading && (() => {
          const metaAccount = accounts.find((a) => a.platform === "meta_business");
          const isConnected = metaAccount?.status === "connected";
          const isExpired = metaAccount?.status === "expired";
          const isError = metaAccount?.status === "error";

          return (
            <div className="rounded-lg border border-dashed border-accent/50 bg-accent/5 px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <MetaIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{META_BUSINESS_PLATFORM.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Facebook Page + Instagram Business insights via a pasted Meta System User token — no redirect.
                  </p>
                  {isConnected && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{metaAccount?.account_name}</p>
                  )}
                  {(isExpired || isError) && (
                    <p className="text-xs text-destructive truncate mt-0.5">
                      {metaAccount?.error_message ?? "Connection needs attention"}
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
                {(!metaAccount || metaAccount.status === "disconnected") && (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>

              {canManage && (
                isConnected ? (
                  <Button
                    variant="ghost" size="sm"
                    disabled={disconnecting === "meta_business"}
                    onClick={() => disconnect("meta_business")}
                  >
                    {disconnecting === "meta_business"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Unlink className="w-4 h-4 mr-1" /> Disconnect</>}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Textarea
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="Paste the System User access token from Meta Business Suite…"
                      rows={2}
                      className="text-xs font-mono resize-none"
                    />
                    <Button
                      size="sm" className="shrink-0"
                      disabled={savingMeta || !metaToken.trim()}
                      onClick={saveMeta}
                    >
                      {savingMeta
                        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        : <KeyRound className="w-4 h-4 mr-1" />}
                      {isExpired || isError ? "Reconnect" : "Save token"}
                    </Button>
                  </div>
                )
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default ConnectedAccountsCard;

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";
import { fetchCredentialsStatus, savePlatformCredentials, type PlatformCredentialStatus } from "@/services/platformCredentials";

// The four platforms with a real OAuth app to configure — Gmail has no OAuth flow built yet.
const OAUTH_PLATFORMS = PLATFORMS.filter((p) => ["instagram", "tiktok", "spotify", "soundcloud"].includes(p.id));

const PlatformCredentialForm = ({
  status, onSaved,
}: { status: PlatformCredentialStatus; onSaved: () => void }) => {
  const platform = OAUTH_PLATFORMS.find((p) => p.id === status.platform)!;
  const Icon = platform.icon;
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Client ID and Client Secret are both required");
      return;
    }
    setSaving(true);
    try {
      await savePlatformCredentials(platform.id, clientId.trim(), clientSecret.trim());
      toast.success(`${platform.label} credentials saved`);
      setClientId("");
      setClientSecret("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save credentials");
    } finally {
      setSaving(false);
    }
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(status.redirectUri);
      toast.success("Redirect URI copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" /> {platform.label}
          {status.configured ? (
            <Badge variant="secondary" className="gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Configured
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="w-3 h-3" /> Not configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status.configured
            ? "Credentials are stored. Saving new values below replaces them."
            : "Required to enable this platform's Connect button for every brand."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Redirect URI (register this in {platform.label}'s developer console)</Label>
          <div className="flex gap-2">
            <Input value={status.redirectUri} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copyRedirectUri} title="Copy">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${platform.id}-client-id`}>App ID / Client ID</Label>
            <Input
              id={`${platform.id}-client-id`}
              type="password"
              autoComplete="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={status.configured ? "•••••••••• (set — enter a new value to replace)" : "Client ID"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${platform.id}-client-secret`}>App Secret / Client Secret</Label>
            <Input
              id={`${platform.id}-client-secret`}
              type="password"
              autoComplete="off"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={status.configured ? "•••••••••• (set — enter a new value to replace)" : "Client Secret"}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save {platform.label} credentials
        </Button>
      </CardContent>
    </Card>
  );
};

const PlatformCredentialsPanel = () => {
  const [statuses, setStatuses] = useState<PlatformCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchCredentialsStatus()
      .then(setStatuses)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load credential status"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;
  }
  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error} <Button variant="link" className="px-1" onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {OAUTH_PLATFORMS.map((platform) => {
        const status = statuses.find((s) => s.platform === platform.id)
          ?? { platform: platform.id, configured: false, redirectUri: "" };
        return <PlatformCredentialForm key={platform.id} status={status} onSaved={load} />;
      })}
    </div>
  );
};

export default PlatformCredentialsPanel;

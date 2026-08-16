import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPlatformMetrics, type OAuthPlatform, type PlatformMetricsResponse } from "@/services/connectedAccounts";

/**
 * Generic metrics card for TikTok/Spotify/SoundCloud, styled to match
 * InstagramMetricsCard (kept separate/untouched). Renders nothing until the
 * brand has connected this platform — connecting lives in Settings.
 */
const PlatformMetricsCard = ({
  brandId, platform, label, icon: Icon,
}: { brandId: string; platform: OAuthPlatform; label: string; icon: LucideIcon }) => {
  const [data, setData] = useState<PlatformMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetchPlatformMetrics(brandId, platform)
      .then((res) => { if (alive) setData(res); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brandId, platform]);

  if (loading) {
    return (
      <Card className="bg-card border-border mt-6">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (failed || !data || !data.connected) return null; // not connected — Settings owns the connect CTA

  const needsReconnect = data.status === "expired";
  const metrics = data.metrics;

  return (
    <Card className="bg-card border-border mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" /> {label}
          {data.accountName && <span className="text-muted-foreground font-normal">· {data.accountName}</span>}
        </CardTitle>
        {data.stale && <span className="text-xs text-muted-foreground">Last known data</span>}
      </CardHeader>
      <CardContent>
        {needsReconnect && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{data.message ?? `${label} needs to be reconnected.`}</span>
            <Button asChild size="sm" variant="destructive">
              <Link to={`/workspace/${brandId}/settings`}>Reconnect</Link>
            </Button>
          </div>
        )}

        {!metrics ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No {label} data yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{metrics.followers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
            </div>
            {metrics.engagement.map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-foreground">{stat.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
            <div>
              <div className="text-xl font-bold text-foreground">{metrics.secondaryValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{metrics.secondaryLabel}</div>
            </div>
          </div>
        )}

        {metrics && metrics.recentItems.length > 0 && (
          <ul className="mt-5 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {metrics.recentItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm border-t border-border pt-2 first:border-t-0 first:pt-0">
                <a href={item.permalink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-foreground hover:text-accent">
                  {item.title}
                </a>
                {item.stats.length > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground flex items-center gap-2">
                    {item.stats.map((s) => `${s.label} ${s.value.toLocaleString()}`).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformMetricsCard;

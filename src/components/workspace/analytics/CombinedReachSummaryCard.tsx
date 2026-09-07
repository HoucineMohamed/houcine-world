import React, { useEffect, useState } from "react";
import { Users, TrendingUp, Activity, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchInstagramMetrics, fetchPlatformMetrics, fetchMetaBusinessMetrics,
  type InstagramMetricsResponse, type OAuthPlatform, type PlatformMetricsResponse, type MetaBusinessMetricsResponse,
} from "@/services/connectedAccounts";

/**
 * Sits above the per-platform breakdown sections and sums whatever's common
 * across whichever platforms this brand actually has connected right now —
 * followers on every platform, total engagement actions, and (only from
 * platforms that report it, currently Meta Business Suite) 28-day reach.
 * A metric only appears here once at least one connected platform
 * contributes a real number for it — nothing is padded with zeros for
 * platforms that aren't connected, and the whole card disappears if nothing
 * is connected yet (Settings owns the connect CTAs).
 */

const GENERIC_PLATFORMS: OAuthPlatform[] = ["tiktok", "spotify", "soundcloud", "youtube", "facebook"];

// Meta Business's `engagement[]` mixes true reach/profile-view stats in with
// engagement counts (it's rendered as one flat list of tiles by the generic
// PlatformMetricsCard) — pull the reach-labeled ones out so they land in the
// "Total reach" bucket here instead of double-counting into "Total engagements".
const REACH_LABEL_RE = /reach|profile views/i;

interface Summary {
  connectedCount: number;
  totalFollowers: number;
  hasFollowers: boolean;
  totalEngagement: number;
  hasEngagement: boolean;
  totalReach: number;
  hasReach: boolean;
}

const emptySummary = (): Summary => ({
  connectedCount: 0,
  totalFollowers: 0, hasFollowers: false,
  totalEngagement: 0, hasEngagement: false,
  totalReach: 0, hasReach: false,
});

const CombinedReachSummaryCard = ({ brandId }: { brandId: string }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      fetchInstagramMetrics(brandId).catch((): InstagramMetricsResponse => ({ connected: false })),
      ...GENERIC_PLATFORMS.map((p) =>
        fetchPlatformMetrics(brandId, p).catch((): PlatformMetricsResponse => ({ connected: false }))),
      fetchMetaBusinessMetrics(brandId).catch((): MetaBusinessMetricsResponse => ({ connected: false })),
    ]).then(([ig, ...rest]) => {
      if (!alive) return;
      const generic = rest.slice(0, GENERIC_PLATFORMS.length) as PlatformMetricsResponse[];
      const meta = rest[GENERIC_PLATFORMS.length] as MetaBusinessMetricsResponse;
      const summary = emptySummary();

      if (ig.connected && ig.metrics) {
        summary.connectedCount++;
        summary.totalFollowers += ig.metrics.followers;
        summary.hasFollowers = true;
        summary.totalEngagement += ig.metrics.engagement.totalLikes + ig.metrics.engagement.totalComments;
        summary.hasEngagement = true;
      }

      for (const res of generic) {
        if (!res.connected || !res.metrics) continue;
        summary.connectedCount++;
        summary.totalFollowers += res.metrics.followers;
        summary.hasFollowers = true;
        summary.totalEngagement += res.metrics.engagement.reduce((s, e) => s + e.value, 0);
        summary.hasEngagement = true;
      }

      if (meta.connected && meta.metrics) {
        summary.connectedCount++;
        summary.totalFollowers += meta.metrics.followers;
        summary.hasFollowers = true;
        const engagementOnly = meta.metrics.engagement.filter((e) => !REACH_LABEL_RE.test(e.label));
        summary.totalEngagement += engagementOnly.reduce((s, e) => s + e.value, 0);
        summary.hasEngagement = true;
        if (meta.metrics.breakdown) {
          summary.totalReach += meta.metrics.breakdown.totalReach28d;
          summary.hasReach = true;
        }
      }

      setSummary(summary);
      setLoading(false);
    });

    return () => { alive = false; };
  }, [brandId]);

  if (loading) {
    return (
      <Card className="bg-card border-border mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.connectedCount === 0) return null;

  return (
    <Card className="bg-card border-border mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> Combined reach &amp; engagement
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Across {summary.connectedCount} connected platform{summary.connectedCount === 1 ? "" : "s"} — platforms that aren't connected aren't counted.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {summary.hasFollowers && (
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{summary.totalFollowers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total followers</div>
              </div>
            </div>
          )}
          {summary.hasReach && (
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{summary.totalReach.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total reach (28d)</div>
              </div>
            </div>
          )}
          {summary.hasEngagement && (
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{summary.totalEngagement.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total engagements</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CombinedReachSummaryCard;

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Users, Heart, MessageCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchInstagramMetrics, type InstagramMetricsResponse } from "@/services/connectedAccounts";

/**
 * Sits alongside the website-data tiles on the brand analytics dashboard.
 * Renders nothing when the brand hasn't connected Instagram — connecting is a
 * Settings action, not something to prompt for from the dashboard itself.
 */
const InstagramMetricsCard = ({ brandId }: { brandId: string }) => {
  const [data, setData] = useState<InstagramMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetchInstagramMetrics(brandId)
      .then((res) => { if (alive) setData(res); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brandId]);

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
          <Instagram className="w-4 h-4 text-accent" /> Instagram
          {data.accountName && <span className="text-muted-foreground font-normal">· {data.accountName}</span>}
        </CardTitle>
        {data.stale && <span className="text-xs text-muted-foreground">Last known data</span>}
      </CardHeader>
      <CardContent>
        {needsReconnect && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{data.message ?? "Instagram needs to be reconnected."}</span>
            <Button asChild size="sm" variant="destructive">
              <Link to={`/workspace/${brandId}/settings`}>Reconnect</Link>
            </Button>
          </div>
        )}

        {!metrics ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No Instagram data yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{metrics.followers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{metrics.engagement.avgLikesPerPost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Avg likes / post</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-xl font-bold text-foreground">{metrics.engagement.avgCommentsPerPost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Avg comments / post</div>
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{metrics.mediaCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total posts</div>
            </div>
          </div>
        )}

        {metrics && metrics.recentPosts.length > 0 && (
          <ul className="mt-5 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {metrics.recentPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 text-sm border-t border-border pt-2 first:border-t-0 first:pt-0">
                <a href={post.permalink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-foreground hover:text-accent">
                  {post.caption || "(no caption)"}
                </a>
                <span className="shrink-0 text-xs text-muted-foreground flex items-center gap-2">
                  <Heart className="w-3 h-3" /> {post.likeCount.toLocaleString()}
                  <MessageCircle className="w-3 h-3" /> {post.commentCount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default InstagramMetricsCard;

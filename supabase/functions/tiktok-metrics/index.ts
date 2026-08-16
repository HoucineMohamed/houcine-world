import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import { fetchProfile, fetchRecentVideos, refreshAccessToken, TikTokApiError } from "../_shared/tiktok.ts";

/**
 * Live TikTok metrics: follower count + recent-video engagement. Same
 * lazy-refresh / cached-snapshot-on-failure pattern as instagram-metrics.
 *   POST …/tiktok-metrics  { brand_id }  Authorization: Bearer <user JWT>
 */

const REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // TikTok access tokens live ~24h — refresh inside the last 6h

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ConnectedAccountRow { id: string; status: string; account_name: string | null; token_expires_at: string | null }
interface SecretRow { access_token: string; refresh_token: string | null }

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "tiktok").maybeSingle()).data;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Not authenticated" }, 401);

  let body: { brand_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const brandId = body.brand_id;
  if (!brandId) return json({ error: "brand_id is required" }, 400);
  if (!(await hasBrandAccess(auth.userClient, brandId))) return json({ error: "Not authorized for this brand" }, 403);

  const svc = serviceClient();
  const { data: account } = await svc.from("connected_accounts")
    .select("id, status, account_name, token_expires_at")
    .eq("brand_id", brandId).eq("platform", "tiktok").maybeSingle<ConnectedAccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token, refresh_token").eq("connected_account_id", account.id).maybeSingle<SecretRow>();
  if (!secret) {
    await markNeedsReconnect(svc, account, "No stored credentials — reconnect TikTok.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect TikTok to keep metrics flowing." });
  }

  let accessToken = secret.access_token;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = account.status === "expired" || expiresAt - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const creds = await getPlatformCredentials(svc, "tiktok");
    try {
      if (!creds || !secret.refresh_token) throw new TikTokApiError("Missing refresh token or credentials", "invalid_token");
      const refreshed = await refreshAccessToken(creds, secret.refresh_token);
      accessToken = refreshed.access_token;
      await svc.from("connected_account_secrets").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
      }).eq("connected_account_id", account.id);
      await svc.from("connected_accounts").update({
        status: "connected", error_message: null,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }).eq("id", account.id);
    } catch {
      const message = "TikTok session expired — reconnect to keep metrics flowing.";
      await markNeedsReconnect(svc, account, message);
      const cached = await cachedSnapshot(svc, brandId);
      return json({
        connected: true, status: "expired", accountName: account.account_name, message,
        metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
      });
    }
  }

  try {
    const [profile, videos] = await Promise.all([fetchProfile(accessToken), fetchRecentVideos(accessToken, 6)]);
    const recentItems = videos.map((v) => ({
      id: v.id,
      title: v.video_description?.slice(0, 140) || "(no caption)",
      permalink: v.share_url,
      stats: [
        { label: "Views", value: v.view_count ?? 0 },
        { label: "Likes", value: v.like_count ?? 0 },
        { label: "Comments", value: v.comment_count ?? 0 },
      ],
    }));
    const totalLikes = videos.reduce((s, v) => s + (v.like_count ?? 0), 0);
    const totalViews = videos.reduce((s, v) => s + (v.view_count ?? 0), 0);

    const metrics = {
      followers: profile.follower_count,
      secondaryLabel: "Videos",
      secondaryValue: profile.video_count,
      engagement: [
        { label: "Avg views / video", value: videos.length ? Math.round(totalViews / videos.length) : 0 },
        { label: "Avg likes / video", value: videos.length ? Math.round(totalLikes / videos.length) : 0 },
      ],
      recentItems,
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "tiktok", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    const accountName = `@${profile.display_name}`;
    if (account.account_name !== accountName) {
      await svc.from("connected_accounts").update({ account_name: accountName }).eq("id", account.id);
    }

    return json({ connected: true, status: "connected", accountName, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("tiktok-metrics fetch failed:", e);
    const tokenInvalid = e instanceof TikTokApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "TikTok rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach TikTok right now.";
    if (tokenInvalid) await markNeedsReconnect(svc, account, message);
    const cached = await cachedSnapshot(svc, brandId);
    return json({
      connected: true,
      status: tokenInvalid ? "expired" : "error",
      accountName: account.account_name,
      message,
      metrics: cached?.metrics ?? null,
      fetchedAt: cached?.fetched_at ?? null,
      stale: true,
    });
  }
});

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import { fetchChannel, fetchRecentVideos, refreshAccessToken, YouTubeApiError } from "../_shared/youtube.ts";

/**
 * Live YouTube metrics: subscriber count + recent-video engagement.
 *   POST …/youtube-metrics  { brand_id }  Authorization: Bearer <user JWT>
 *
 * Note: subscriberCount can come back null — a channel owner can hide their
 * subscriber count, in which case the Data API omits it entirely rather than
 * returning 0. The card falls back to 0 for display but this is a real API
 * limitation, not a bug here.
 */

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Google access tokens live ~1h — refresh inside the last 5 min

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ConnectedAccountRow { id: string; status: string; account_name: string | null; token_expires_at: string | null }
interface SecretRow { access_token: string; refresh_token: string | null; provider_meta: { uploads_playlist_id?: string | null } | null }

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "youtube").maybeSingle()).data;

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
    .eq("brand_id", brandId).eq("platform", "youtube").maybeSingle<ConnectedAccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token, refresh_token, provider_meta").eq("connected_account_id", account.id).maybeSingle<SecretRow>();
  if (!secret) {
    await markNeedsReconnect(svc, account, "No stored credentials — reconnect YouTube.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect YouTube to keep metrics flowing." });
  }

  let accessToken = secret.access_token;
  let uploadsPlaylistId = secret.provider_meta?.uploads_playlist_id ?? null;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = account.status === "expired" || expiresAt - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const creds = await getPlatformCredentials(svc, "youtube");
    try {
      if (!creds || !secret.refresh_token) throw new YouTubeApiError("Missing refresh token or credentials", "invalid_token");
      const refreshed = await refreshAccessToken(creds, secret.refresh_token);
      accessToken = refreshed.access_token;
      await svc.from("connected_account_secrets").update({
        access_token: refreshed.access_token,
        // Google usually omits refresh_token on a plain refresh — keep the old one if a new one wasn't issued.
        ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      }).eq("connected_account_id", account.id);
      await svc.from("connected_accounts").update({
        status: "connected", error_message: null,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }).eq("id", account.id);
    } catch {
      const message = "YouTube session expired — reconnect to keep metrics flowing.";
      await markNeedsReconnect(svc, account, message);
      const cached = await cachedSnapshot(svc, brandId);
      return json({
        connected: true, status: "expired", accountName: account.account_name, message,
        metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
      });
    }
  }

  try {
    const channel = await fetchChannel(accessToken);
    if (!uploadsPlaylistId) uploadsPlaylistId = channel.uploadsPlaylistId;
    const videos = await fetchRecentVideos(accessToken, uploadsPlaylistId, 10);

    const recentItems = videos.map((v) => ({
      id: v.id,
      title: v.title.slice(0, 140),
      permalink: `https://www.youtube.com/watch?v=${v.id}`,
      stats: [
        { label: "Views", value: v.viewCount },
        { label: "Likes", value: v.likeCount },
        { label: "Comments", value: v.commentCount },
      ],
    }));
    const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);

    const metrics = {
      followers: channel.subscriberCount ?? 0,
      secondaryLabel: "Videos",
      secondaryValue: channel.videoCount,
      engagement: [
        { label: "Avg views / video", value: videos.length ? Math.round(totalViews / videos.length) : 0 },
        { label: "Avg likes / video", value: videos.length ? Math.round(totalLikes / videos.length) : 0 },
      ],
      recentItems,
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "youtube", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    if (account.account_name !== channel.title) {
      await svc.from("connected_accounts").update({ account_name: channel.title }).eq("id", account.id);
    }
    if (uploadsPlaylistId && secret.provider_meta?.uploads_playlist_id !== uploadsPlaylistId) {
      await svc.from("connected_account_secrets")
        .update({ provider_meta: { ...(secret.provider_meta ?? {}), uploads_playlist_id: uploadsPlaylistId } })
        .eq("connected_account_id", account.id);
    }

    return json({ connected: true, status: "connected", accountName: channel.title, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("youtube-metrics fetch failed:", e);
    const tokenInvalid = e instanceof YouTubeApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "YouTube rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach YouTube right now.";
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

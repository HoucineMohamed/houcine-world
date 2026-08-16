import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import { fetchProfile, fetchRecentTracks, refreshAccessToken, SoundCloudApiError } from "../_shared/soundcloud.ts";

/**
 * Live SoundCloud metrics: follower count + recent-track play counts.
 *   POST …/soundcloud-metrics  { brand_id }  Authorization: Bearer <user JWT>
 */

const REFRESH_THRESHOLD_MS = 15 * 60 * 1000; // SoundCloud access tokens live ~1h — refresh inside the last 15 min

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ConnectedAccountRow { id: string; status: string; account_name: string | null; token_expires_at: string | null }
interface SecretRow { access_token: string; refresh_token: string | null }

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "soundcloud").maybeSingle()).data;

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
    .eq("brand_id", brandId).eq("platform", "soundcloud").maybeSingle<ConnectedAccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token, refresh_token").eq("connected_account_id", account.id).maybeSingle<SecretRow>();
  if (!secret) {
    await markNeedsReconnect(svc, account, "No stored credentials — reconnect SoundCloud.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect SoundCloud to keep metrics flowing." });
  }

  let accessToken = secret.access_token;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = account.status === "expired" || expiresAt - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const creds = await getPlatformCredentials(svc, "soundcloud");
    try {
      if (!creds || !secret.refresh_token) throw new SoundCloudApiError("Missing refresh token or credentials", "invalid_token");
      // SoundCloud issues single-use refresh tokens: the response's refresh_token always replaces the stored one.
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
      const message = "SoundCloud session expired — reconnect to keep metrics flowing.";
      await markNeedsReconnect(svc, account, message);
      const cached = await cachedSnapshot(svc, brandId);
      return json({
        connected: true, status: "expired", accountName: account.account_name, message,
        metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
      });
    }
  }

  try {
    const [profile, tracks] = await Promise.all([fetchProfile(accessToken), fetchRecentTracks(accessToken, 10)]);
    const recentItems = tracks.map((t) => ({
      id: String(t.id),
      title: t.title,
      permalink: t.permalink_url,
      stats: [
        { label: "Plays", value: t.playback_count ?? 0 },
        { label: "Likes", value: t.likes_count ?? 0 },
        { label: "Comments", value: t.comment_count ?? 0 },
      ],
    }));
    const totalPlays = tracks.reduce((s, t) => s + (t.playback_count ?? 0), 0);

    const metrics = {
      followers: profile.followers_count,
      secondaryLabel: "Tracks",
      secondaryValue: profile.track_count,
      engagement: [
        { label: "Avg plays / track", value: tracks.length ? Math.round(totalPlays / tracks.length) : 0 },
      ],
      recentItems,
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "soundcloud", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    if (account.account_name !== profile.username) {
      await svc.from("connected_accounts").update({ account_name: profile.username }).eq("id", account.id);
    }

    return json({ connected: true, status: "connected", accountName: profile.username, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("soundcloud-metrics fetch failed:", e);
    const tokenInvalid = e instanceof SoundCloudApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "SoundCloud rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach SoundCloud right now.";
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

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import { fetchProfile, fetchRecentlyPlayed, refreshAccessToken, SpotifyApiError } from "../_shared/spotify.ts";

/**
 * Live Spotify metrics: follower count + recently played tracks (the closest
 * official proxy for "recent engagement" — see the note in _shared/spotify.ts
 * about why per-track play counts aren't available via the public API).
 *   POST …/spotify-metrics  { brand_id }  Authorization: Bearer <user JWT>
 */

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Spotify access tokens live ~1h — refresh inside the last 5 min

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ConnectedAccountRow { id: string; status: string; account_name: string | null; token_expires_at: string | null }
interface SecretRow { access_token: string; refresh_token: string | null }

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "spotify").maybeSingle()).data;

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
    .eq("brand_id", brandId).eq("platform", "spotify").maybeSingle<ConnectedAccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token, refresh_token").eq("connected_account_id", account.id).maybeSingle<SecretRow>();
  if (!secret) {
    await markNeedsReconnect(svc, account, "No stored credentials — reconnect Spotify.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect Spotify to keep metrics flowing." });
  }

  let accessToken = secret.access_token;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = account.status === "expired" || expiresAt - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const creds = await getPlatformCredentials(svc, "spotify");
    try {
      if (!creds || !secret.refresh_token) throw new SpotifyApiError("Missing refresh token or credentials", "invalid_token");
      const refreshed = await refreshAccessToken(creds, secret.refresh_token);
      accessToken = refreshed.access_token;
      await svc.from("connected_account_secrets").update({
        access_token: refreshed.access_token,
        // Spotify doesn't always rotate the refresh token — keep the old one if a new one wasn't issued.
        ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      }).eq("connected_account_id", account.id);
      await svc.from("connected_accounts").update({
        status: "connected", error_message: null,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }).eq("id", account.id);
    } catch {
      const message = "Spotify session expired — reconnect to keep metrics flowing.";
      await markNeedsReconnect(svc, account, message);
      const cached = await cachedSnapshot(svc, brandId);
      return json({
        connected: true, status: "expired", accountName: account.account_name, message,
        metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
      });
    }
  }

  try {
    const [profile, recentlyPlayed] = await Promise.all([fetchProfile(accessToken), fetchRecentlyPlayed(accessToken, 10)]);
    const recentItems = recentlyPlayed.map((item) => ({
      id: `${item.track.id}-${item.played_at}`,
      title: `${item.track.name} — ${item.track.artists.map((a) => a.name).join(", ")}`,
      permalink: item.track.external_urls.spotify,
      stats: [] as { label: string; value: number }[], // Spotify doesn't expose per-track play counts to the account owner
    }));

    const metrics = {
      followers: profile.followers.total,
      secondaryLabel: "Recently played",
      secondaryValue: recentItems.length,
      engagement: [] as { label: string; value: number }[],
      recentItems,
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "spotify", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    const accountName = profile.display_name || profile.id;
    if (account.account_name !== accountName) {
      await svc.from("connected_accounts").update({ account_name: accountName }).eq("id", account.id);
    }

    return json({ connected: true, status: "connected", accountName, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("spotify-metrics fetch failed:", e);
    const tokenInvalid = e instanceof SpotifyApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "Spotify rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach Spotify right now.";
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

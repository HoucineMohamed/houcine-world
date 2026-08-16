import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import {
  exchangeForLongLivedToken,
  expiryFromTokenResponse,
  fetchInstagramProfile,
  fetchRecentMedia,
  findInstagramBusinessAccount,
  InstagramApiError,
} from "../_shared/instagram.ts";

/**
 * Live Instagram metrics for a brand's connected account: follower count and
 * recent-post engagement. Sourced fresh from the Graph API on every call
 * (with a cached snapshot as a fallback), never from mock data.
 *
 *   POST …/instagram-metrics   { brand_id }   Authorization: Bearer <user JWT>
 *
 * The token itself is loaded with the service-role key and never leaves this
 * function — only derived metrics are returned to the browser. If the stored
 * token is within REFRESH_THRESHOLD of expiry (or already expired) this call
 * transparently refreshes it first; refresh failure flips the connection to
 * "expired" and the response tells the UI to prompt a reconnect instead of
 * failing silently.
 */

const REFRESH_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000; // refresh proactively inside the last 5 days

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const serviceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

interface ConnectedAccountRow {
  id: string;
  status: string;
  account_name: string | null;
  token_expires_at: string | null;
}
interface SecretRow {
  access_token: string;
  refresh_token: string | null;
  provider_meta: { page_id?: string; ig_user_id?: string } | null;
}

/** Re-exchanges the long-lived user token and, since a Page token inherits its
 * lifetime from it, re-derives a fresh Page access token for the same Page. */
const refreshToken = async (svc: SupabaseClient, account: ConnectedAccountRow, secret: SecretRow) => {
  if (!secret.refresh_token) throw new InstagramApiError("No refresh token stored", "invalid_token");
  const creds = await getPlatformCredentials(svc, "instagram");
  if (!creds) throw new InstagramApiError("Instagram is not configured", "config_error");
  const longLived = await exchangeForLongLivedToken(creds, secret.refresh_token);
  const link = await findInstagramBusinessAccount(longLived.access_token);
  if (!link) throw new InstagramApiError("Instagram account is no longer linked to a Facebook Page", "no_ig_account");

  const expiresAt = expiryFromTokenResponse(longLived);
  await svc.from("connected_account_secrets").update({
    access_token: link.pageAccessToken,
    refresh_token: longLived.access_token,
    provider_meta: { page_id: link.pageId, ig_user_id: link.igUserId },
  }).eq("connected_account_id", account.id);
  await svc.from("connected_accounts").update({
    status: "connected",
    error_message: null,
    token_expires_at: expiresAt.toISOString(),
    last_refreshed_at: new Date().toISOString(),
  }).eq("id", account.id);

  return { accessToken: link.pageAccessToken, igUserId: link.igUserId };
};

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not authenticated" }, 401);

  let body: { brand_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const brandId = body.brand_id;
  if (!brandId) return json({ error: "brand_id is required" }, 400);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);

  const { data: hasAccess } = await userClient.rpc("has_brand_access", { target_brand_id: brandId });
  const { data: isSuperAdmin } = await userClient.rpc("is_super_admin");
  if (!hasAccess && !isSuperAdmin) return json({ error: "Not authorized for this brand" }, 403);

  const svc = serviceClient();
  const { data: account } = await svc
    .from("connected_accounts")
    .select("id, status, account_name, token_expires_at")
    .eq("brand_id", brandId)
    .eq("platform", "instagram")
    .maybeSingle<ConnectedAccountRow>();

  if (!account || account.status === "disconnected") {
    return json({ connected: false });
  }

  const { data: secret } = await svc
    .from("connected_account_secrets")
    .select("access_token, refresh_token, provider_meta")
    .eq("connected_account_id", account.id)
    .maybeSingle<SecretRow>();

  if (!secret) {
    await markNeedsReconnect(svc, account, "No stored credentials — reconnect Instagram.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect Instagram to keep metrics flowing." });
  }

  let accessToken = secret.access_token;
  let igUserId = secret.provider_meta?.ig_user_id;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = account.status === "expired" || expiresAt - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    try {
      const refreshed = await refreshToken(svc, account, secret);
      accessToken = refreshed.accessToken;
      igUserId = refreshed.igUserId;
    } catch (e) {
      const message = e instanceof InstagramApiError
        ? "Instagram session could not be renewed — reconnect to keep metrics flowing."
        : "Instagram session expired — reconnect to keep metrics flowing.";
      await markNeedsReconnect(svc, account, message);

      // Serve the last cached snapshot (clearly marked stale) rather than a hard failure.
      const { data: cached } = await svc
        .from("platform_metrics_snapshots")
        .select("metrics, fetched_at")
        .eq("brand_id", brandId).eq("platform", "instagram").maybeSingle();
      return json({
        connected: true, status: "expired", accountName: account.account_name, message,
        metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
      });
    }
  }

  if (!igUserId) {
    await markNeedsReconnect(svc, account, "Instagram account link is incomplete — reconnect.");
    return json({ connected: true, status: "expired", accountName: account.account_name, message: "Reconnect Instagram to keep metrics flowing." });
  }

  try {
    const [profile, media] = await Promise.all([
      fetchInstagramProfile(igUserId, accessToken),
      fetchRecentMedia(igUserId, accessToken, 6),
    ]);

    const recentPosts = media.map((m) => ({
      id: m.id,
      caption: m.caption?.slice(0, 140) ?? null,
      likeCount: m.like_count ?? 0,
      commentCount: m.comments_count ?? 0,
      timestamp: m.timestamp,
      permalink: m.permalink,
      mediaType: m.media_type,
    }));
    const totalLikes = recentPosts.reduce((s, p) => s + p.likeCount, 0);
    const totalComments = recentPosts.reduce((s, p) => s + p.commentCount, 0);

    const metrics = {
      username: profile.username,
      followers: profile.followers_count,
      mediaCount: profile.media_count,
      recentPosts,
      engagement: {
        postsSampled: recentPosts.length,
        totalLikes,
        totalComments,
        avgLikesPerPost: recentPosts.length ? Math.round(totalLikes / recentPosts.length) : 0,
        avgCommentsPerPost: recentPosts.length ? Math.round(totalComments / recentPosts.length) : 0,
      },
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "instagram", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    if (account.account_name !== `@${profile.username}`) {
      await svc.from("connected_accounts").update({ account_name: `@${profile.username}` }).eq("id", account.id);
    }

    return json({ connected: true, status: "connected", accountName: `@${profile.username}`, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("instagram-metrics fetch failed:", e);
    const tokenInvalid = e instanceof InstagramApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "Instagram rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach Instagram right now.";
    if (tokenInvalid) await markNeedsReconnect(svc, account, message);
    const { data: cached } = await svc
      .from("platform_metrics_snapshots")
      .select("metrics, fetched_at")
      .eq("brand_id", brandId).eq("platform", "instagram").maybeSingle();
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

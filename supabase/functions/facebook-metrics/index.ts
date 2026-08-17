import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import { fetchPageFollowers, fetchRecentPosts, FacebookApiError } from "../_shared/facebook.ts";

/**
 * Live Facebook Page metrics: follower count + recent-post engagement.
 *   POST …/facebook-metrics  { brand_id }  Authorization: Bearer <user JWT>
 *
 * No refresh step here, deliberately — Facebook issues no refresh_token at
 * all (see _shared/facebook.ts). The stored Page Access Token is long-lived
 * (~60 days) but once it's actually expired or close to it, there is nothing
 * to silently renew: this marks the account "expired" and returns the last
 * cached snapshot, same shape as every other platform's expired state, but
 * getting there requires a full reconnect through facebook-oauth, not a
 * refresh call.
 */

const RECONNECT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // flag for reconnect a day before actual expiry, not exactly at it

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ConnectedAccountRow { id: string; status: string; account_name: string | null; account_external_id: string | null; token_expires_at: string | null }
interface SecretRow { access_token: string }

const markNeedsReconnect = async (svc: SupabaseClient, account: ConnectedAccountRow, message: string) => {
  await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
};

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "facebook").maybeSingle()).data;

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
    .select("id, status, account_name, account_external_id, token_expires_at")
    .eq("brand_id", brandId).eq("platform", "facebook").maybeSingle<ConnectedAccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token").eq("connected_account_id", account.id).maybeSingle<SecretRow>();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const nearExpiry = expiresAt - Date.now() < RECONNECT_THRESHOLD_MS;

  if (!secret || !account.account_external_id || nearExpiry) {
    const message = !secret
      ? "No stored credentials — reconnect Facebook."
      : "Facebook session is expiring — reconnect to keep metrics flowing (Facebook doesn't support silent token renewal).";
    await markNeedsReconnect(svc, account, message);
    const cached = await cachedSnapshot(svc, brandId);
    return json({
      connected: true, status: "expired", accountName: account.account_name, message,
      metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
    });
  }

  try {
    const [followers, posts] = await Promise.all([
      fetchPageFollowers(account.account_external_id, secret.access_token),
      fetchRecentPosts(account.account_external_id, secret.access_token, 10),
    ]);

    const recentItems = posts.map((p) => ({
      id: p.id,
      title: p.message?.slice(0, 140) || "(no caption)",
      permalink: p.permalink,
      stats: [
        { label: "Likes", value: p.likeCount },
        { label: "Comments", value: p.commentCount },
        { label: "Shares", value: p.shareCount },
      ],
    }));
    const totalLikes = posts.reduce((s, p) => s + p.likeCount, 0);
    const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);

    const metrics = {
      followers,
      secondaryLabel: "Recent posts",
      secondaryValue: recentItems.length,
      engagement: [
        { label: "Avg likes / post", value: posts.length ? Math.round(totalLikes / posts.length) : 0 },
        { label: "Avg comments / post", value: posts.length ? Math.round(totalComments / posts.length) : 0 },
      ],
      recentItems,
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "facebook", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );

    return json({ connected: true, status: "connected", accountName: account.account_name, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("facebook-metrics fetch failed:", e);
    const tokenInvalid = e instanceof FacebookApiError && e.reason === "invalid_token";
    const message = tokenInvalid
      ? "Facebook rejected the stored session — reconnect to keep metrics flowing."
      : "Couldn't reach Facebook right now.";
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

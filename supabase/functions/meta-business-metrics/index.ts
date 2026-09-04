import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, hasBrandAccess, serviceClient } from "../_shared/authz.ts";
import {
  fetchInstagramInsights, fetchPageInsights, fetchRecentIgMedia, fetchRecentPagePosts,
  resolveAssets, MetaApiError,
} from "../_shared/metaBusiness.ts";

/**
 * Page + Instagram Business insights pulled with the brand's stored Meta
 * Business Suite System User token.
 *   POST …/meta-business-metrics  { brand_id }  Authorization: Bearer <user JWT>
 *
 * Response uses the same normalized shape as every other *-metrics function
 * so the analytics dashboard treats it identically. On each call the Page
 * access token is re-derived from the stored System User token, which is how
 * this platform "refreshes" — System User tokens don't expire on their own.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface AccountRow { id: string; status: string; account_name: string | null; account_external_id: string | null }
interface SecretRow { refresh_token: string | null; access_token: string; provider_meta: Record<string, unknown> | null }

const cachedSnapshot = async (svc: SupabaseClient, brandId: string) =>
  (await svc.from("platform_metrics_snapshots").select("metrics, fetched_at")
    .eq("brand_id", brandId).eq("platform", "meta_business").maybeSingle()).data;

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
    .select("id, status, account_name, account_external_id")
    .eq("brand_id", brandId).eq("platform", "meta_business").maybeSingle<AccountRow>();
  if (!account || account.status === "disconnected") return json({ connected: false });

  const { data: secret } = await svc.from("connected_account_secrets")
    .select("access_token, refresh_token, provider_meta")
    .eq("connected_account_id", account.id).maybeSingle<SecretRow>();

  const systemToken = secret?.refresh_token;
  if (!systemToken) {
    const message = "No stored Meta Business token — paste a fresh System User token in Settings.";
    await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
    const cached = await cachedSnapshot(svc, brandId);
    return json({
      connected: true, status: "expired", accountName: account.account_name, message,
      metrics: cached?.metrics ?? null, fetchedAt: cached?.fetched_at ?? null, stale: true,
    });
  }

  try {
    const asset = await resolveAssets(systemToken, account.account_external_id);
    const [pageInsights, igInsights, fbPosts, igMedia] = await Promise.all([
      fetchPageInsights(asset.pageId, asset.pageAccessToken),
      asset.igUserId ? fetchInstagramInsights(asset.igUserId, asset.pageAccessToken) : Promise.resolve(null),
      fetchRecentPagePosts(asset.pageId, asset.pageAccessToken, 6),
      asset.igUserId ? fetchRecentIgMedia(asset.igUserId, asset.pageAccessToken, 6) : Promise.resolve([]),
    ]);

    const followers = asset.pageFollowers + asset.igFollowers;
    const reach = (igInsights?.reach ?? 0) + pageInsights.impressions;
    const engagement = [
      { label: "Page reach (28d)", value: pageInsights.impressions },
      { label: "Page engagements (28d)", value: pageInsights.engagements },
      ...(igInsights
        ? [
            { label: "IG reach (28d)", value: igInsights.reach },
            { label: "IG profile views (28d)", value: igInsights.profileViews },
          ]
        : []),
    ];

    const metrics = {
      followers,
      secondaryLabel: asset.igUserId ? "Instagram followers" : "Page followers",
      secondaryValue: asset.igUserId ? asset.igFollowers : asset.pageFollowers,
      engagement,
      recentItems: [...igMedia, ...fbPosts],
      // Extra context for the unified dashboard; ignored by the generic card.
      breakdown: {
        pageName: asset.pageName,
        pageFollowers: asset.pageFollowers,
        instagramUsername: asset.igUsername,
        instagramFollowers: asset.igFollowers,
        totalReach28d: reach,
      },
    };

    const fetchedAt = new Date().toISOString();
    await svc.from("platform_metrics_snapshots").upsert(
      { brand_id: brandId, platform: "meta_business", metrics, fetched_at: fetchedAt },
      { onConflict: "brand_id,platform" },
    );
    if (account.status !== "connected") {
      await svc.from("connected_accounts").update({ status: "connected", error_message: null }).eq("id", account.id);
    }
    await svc.from("connected_accounts")
      .update({ last_refreshed_at: fetchedAt, account_external_id: asset.pageId })
      .eq("id", account.id);

    return json({ connected: true, status: "connected", accountName: account.account_name, metrics, fetchedAt, stale: false });
  } catch (e) {
    console.error("meta-business-metrics fetch failed:", e);
    const invalid = e instanceof MetaApiError && (e.reason === "invalid_token" || e.reason === "insufficient_permissions" || e.reason === "no_page");
    const message = invalid
      ? (e as MetaApiError).reason === "invalid_token"
        ? "Meta rejected the stored token — paste a fresh System User token in Settings."
        : (e as MetaApiError).message
      : "Couldn't reach Meta right now.";
    if (invalid) {
      await svc.from("connected_accounts").update({ status: "expired", error_message: message }).eq("id", account.id);
    }
    const cached = await cachedSnapshot(svc, brandId);
    return json({
      connected: true,
      status: invalid ? "expired" : "error",
      accountName: account.account_name,
      message,
      metrics: cached?.metrics ?? null,
      fetchedAt: cached?.fetched_at ?? null,
      stale: true,
    });
  }
});

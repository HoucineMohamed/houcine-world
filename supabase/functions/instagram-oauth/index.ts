import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { getPlatformCredentials, redirectUriFor } from "../_shared/credentials.ts";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  expiryFromTokenResponse,
  fetchInstagramProfile,
  findInstagramBusinessAccount,
  InstagramApiError,
} from "../_shared/instagram.ts";

/**
 * Instagram OAuth (Graph API via Facebook Login for Business), end to end.
 *
 *   POST …/instagram-oauth/authorize   { brand_id }   Authorization: Bearer <user JWT>
 *     -> { url }  the frontend redirects the browser to `url`.
 *
 *   GET  …/instagram-oauth/callback?code=&state=      (Instagram calls this directly)
 *     -> 302 redirect back into the admin workspace with a status query param.
 *
 * Tokens are written by this function using the service-role key and are
 * never returned to the browser at any point in either step.
 */

const serviceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const STATE_TTL_MS = 10 * 60 * 1000;

const randomState = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

const allowedOrigin = (origin: string | null): string => {
  const fallback = Deno.env.get("WORKSPACE_APP_URL") ?? "";
  if (!origin) return fallback;
  const allowlist = (Deno.env.get("INSTAGRAM_ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (allowlist.length === 0) return origin; // no allowlist configured -> trust the browser-set Origin header
  return allowlist.includes(origin) ? origin : fallback;
};

const handleAuthorize = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not authenticated" }, 401);

  let body: { brand_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const brandId = body.brand_id;
  if (!brandId) return json({ error: "brand_id is required" }, 400);

  // Run as the caller so `auth.uid()` inside has_brand_role() resolves correctly,
  // and so an invalid/expired JWT is rejected by Supabase itself.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);

  const { data: canManage, error: roleError } = await userClient.rpc("has_brand_role", {
    target_brand_id: brandId,
    min_role: "brand_admin",
  });
  if (roleError) return json({ error: "Could not verify brand access" }, 500);
  const { data: isSuperAdmin } = await userClient.rpc("is_super_admin");
  if (!canManage && !isSuperAdmin) {
    return json({ error: "Only a brand admin can connect this brand's accounts" }, 403);
  }

  const svc = serviceClient();
  const creds = await getPlatformCredentials(svc, "instagram");
  if (!creds) {
    return json({ error: "Instagram isn't configured yet. Ask a super admin to set it up under Platform Credentials." }, 409);
  }

  const state = randomState();
  const redirectUri = redirectUriFor("instagram");
  const authorizeUrl = buildAuthorizeUrl(creds, redirectUri, state);

  const { error: insertError } = await svc.from("oauth_flow_states").insert({
    state,
    brand_id: brandId,
    user_id: userData.user.id,
    platform: "instagram",
    return_origin: allowedOrigin(req.headers.get("origin")),
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (insertError) return json({ error: "Could not start the Instagram connection" }, 500);

  return json({ url: authorizeUrl });
};

const redirectToSettings = (origin: string, brandId: string | null, params: Record<string, string>) => {
  const base = brandId ? `${origin}/workspace/${brandId}/settings` : `${origin}/workspace`;
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
};

const handleCallback = async (req: Request) => {
  const url = new URL(req.url);
  const svc = serviceClient();
  const fallbackOrigin = Deno.env.get("WORKSPACE_APP_URL") ?? "";

  const stateParam = url.searchParams.get("state");
  const stateRow = stateParam
    ? (await svc.from("oauth_flow_states").select("*").eq("state", stateParam).maybeSingle()).data
    : null;
  const origin = stateRow?.return_origin || fallbackOrigin;
  const brandId = stateRow?.brand_id ?? null;

  // The state is single-use: consume it on *any* terminal outcome (denied or
  // otherwise), not just success, so a leaked state can't be replayed later.
  const stateUsable = Boolean(stateRow) && !stateRow.used_at && new Date(stateRow.expires_at) >= new Date();
  if (stateUsable) {
    await svc.from("oauth_flow_states").update({ used_at: new Date().toISOString() }).eq("state", stateParam);
  }

  // User denied the Instagram/Facebook consent screen.
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return redirectToSettings(origin, brandId, { instagram: "denied" });
  }

  if (!stateUsable) {
    return redirectToSettings(origin, brandId, { instagram: "error", reason: "invalid_state" });
  }

  const code = url.searchParams.get("code");
  if (!code) return redirectToSettings(origin, brandId, { instagram: "error", reason: "missing_code" });

  try {
    const creds = await getPlatformCredentials(svc, "instagram");
    if (!creds) return redirectToSettings(origin, brandId, { instagram: "error", reason: "config_error" });

    const shortLived = await exchangeCodeForToken(creds, code, redirectUriFor("instagram"));
    const longLived = await exchangeForLongLivedToken(creds, shortLived.access_token);
    const link = await findInstagramBusinessAccount(longLived.access_token);
    if (!link) {
      return redirectToSettings(origin, brandId, { instagram: "error", reason: "no_instagram_business_account" });
    }
    const profile = await fetchInstagramProfile(link.igUserId, link.pageAccessToken);
    const expiresAt = expiryFromTokenResponse(longLived);

    const { data: account, error: upsertError } = await svc
      .from("connected_accounts")
      .upsert(
        {
          brand_id: stateRow.brand_id,
          platform: "instagram",
          status: "connected",
          account_name: `@${profile.username}`,
          account_external_id: profile.id,
          scopes: ["instagram_basic", "pages_show_list", "instagram_manage_insights", "business_management"],
          error_message: null,
          connected_by: stateRow.user_id,
          connected_at: new Date().toISOString(),
          token_expires_at: expiresAt.toISOString(),
          last_refreshed_at: new Date().toISOString(),
        },
        { onConflict: "brand_id,platform" },
      )
      .select("id")
      .single();
    if (upsertError || !account) throw new InstagramApiError("Could not save the connection", "api_error");

    await svc.from("connected_account_secrets").upsert(
      {
        connected_account_id: account.id,
        access_token: link.pageAccessToken,
        refresh_token: longLived.access_token,
        provider_meta: { page_id: link.pageId, ig_user_id: link.igUserId },
      },
      { onConflict: "connected_account_id" },
    );

    await svc.from("audit_logs").insert({
      actor_id: stateRow.user_id,
      brand_id: stateRow.brand_id,
      action: "connected_account.connect",
      entity_type: "connected_accounts",
      entity_id: account.id,
      metadata: { platform: "instagram", account_name: `@${profile.username}` },
    });

    return redirectToSettings(origin, brandId, { instagram: "connected" });
  } catch (e) {
    console.error("instagram-oauth callback failed:", e);
    const reason = e instanceof InstagramApiError ? e.reason : "unknown";
    return redirectToSettings(origin, brandId, { instagram: "error", reason });
  }
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();

  if (action === "authorize" && req.method === "POST") return handleAuthorize(req);
  if (action === "callback" && req.method === "GET") return handleCallback(req);

  return json({ error: "Not found. Use /authorize or /callback." }, 404);
});

import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, canManageBrand, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials, redirectUriFor } from "../_shared/credentials.ts";
import { allowedOrigin, redirectToSettings } from "../_shared/origin.ts";
import {
  buildAuthorizeUrl, exchangeCodeForToken, exchangeForLongLivedToken, fetchManagedPage,
  FacebookApiError, FACEBOOK_SCOPES,
} from "../_shared/facebook.ts";

/**
 * Facebook Graph API OAuth, same shape as spotify-oauth, with two extra
 * steps the token model requires (see _shared/facebook.ts): the code
 * exchange only returns a short-lived user token, which has to be swapped
 * for a long-lived one before pulling the brand's managed Page and its
 * (also long-lived) Page Access Token — that Page Access Token, not the
 * user token, is what gets stored and used for every later API call.
 *   POST …/facebook-oauth/authorize  { brand_id }  Authorization: Bearer <user JWT>  -> { url }
 *   GET  …/facebook-oauth/callback?code=&state=    (Facebook calls this directly)   -> 302 redirect
 */

const STATE_TTL_MS = 10 * 60 * 1000;
const randomState = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const handleAuthorize = async (req: Request) => {
  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Not authenticated" }, 401);

  let body: { brand_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const brandId = body.brand_id;
  if (!brandId) return json({ error: "brand_id is required" }, 400);

  if (!(await canManageBrand(auth.userClient, brandId))) {
    return json({ error: "Only a brand admin can connect this brand's accounts" }, 403);
  }

  const svc = serviceClient();
  const creds = await getPlatformCredentials(svc, "facebook");
  if (!creds) {
    return json({ error: "Facebook isn't configured yet. Ask a super admin to set it up under Platform Credentials." }, 409);
  }

  const state = randomState();
  const redirectUri = redirectUriFor("facebook");
  const { error: insertError } = await svc.from("oauth_flow_states").insert({
    state,
    brand_id: brandId,
    user_id: auth.user.id,
    platform: "facebook",
    return_origin: allowedOrigin(req),
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (insertError) return json({ error: "Could not start the Facebook connection" }, 500);

  return json({ url: buildAuthorizeUrl(creds, redirectUri, state) });
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

  if (url.searchParams.get("error")) return redirectToSettings(origin, brandId, { facebook: "denied" });

  if (!stateUsable) {
    return redirectToSettings(origin, brandId, { facebook: "error", reason: "invalid_state" });
  }

  const code = url.searchParams.get("code");
  if (!code) return redirectToSettings(origin, brandId, { facebook: "error", reason: "missing_code" });

  try {
    const creds = await getPlatformCredentials(svc, "facebook");
    if (!creds) return redirectToSettings(origin, brandId, { facebook: "error", reason: "config_error" });

    const shortLived = await exchangeCodeForToken(creds, code, redirectUriFor("facebook"));
    const longLived = await exchangeForLongLivedToken(creds, shortLived.access_token);
    const page = await fetchManagedPage(longLived.access_token);

    // Page Access Tokens fetched this way don't carry their own expires_in —
    // they inherit the long-lived user token's ~60-day lifetime.
    const expiresAt = new Date(Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000);

    const { data: account, error: upsertError } = await svc
      .from("connected_accounts")
      .upsert(
        {
          brand_id: stateRow.brand_id,
          platform: "facebook",
          status: "connected",
          account_name: page.name,
          account_external_id: page.id,
          scopes: FACEBOOK_SCOPES.split(","),
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
    if (upsertError || !account) throw new FacebookApiError("Could not save the connection", "api_error");

    await svc.from("connected_account_secrets").upsert(
      {
        connected_account_id: account.id,
        access_token: page.accessToken,
        refresh_token: null, // Facebook has no refresh_token — see _shared/facebook.ts
        provider_meta: { facebook_page_id: page.id },
      },
      { onConflict: "connected_account_id" },
    );

    await svc.from("audit_logs").insert({
      actor_id: stateRow.user_id,
      brand_id: stateRow.brand_id,
      action: "connected_account.connect",
      entity_type: "connected_accounts",
      entity_id: account.id,
      metadata: { platform: "facebook", account_name: page.name },
    });

    return redirectToSettings(origin, brandId, { facebook: "connected" });
  } catch (e) {
    console.error("facebook-oauth callback failed:", e);
    const reason = e instanceof FacebookApiError ? e.reason : "unknown";
    return redirectToSettings(origin, brandId, { facebook: "error", reason });
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (action === "authorize" && req.method === "POST") return handleAuthorize(req);
  if (action === "callback" && req.method === "GET") return handleCallback(req);
  return json({ error: "Not found. Use /authorize or /callback." }, 404);
});

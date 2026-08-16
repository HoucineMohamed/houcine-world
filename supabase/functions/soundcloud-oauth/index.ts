import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, canManageBrand, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials, redirectUriFor } from "../_shared/credentials.ts";
import { allowedOrigin, redirectToSettings } from "../_shared/origin.ts";
import {
  buildAuthorizeUrl, exchangeCodeForToken, fetchProfile, generateCodeVerifier, SoundCloudApiError,
} from "../_shared/soundcloud.ts";

/**
 * SoundCloud OAuth 2.1 + PKCE, same shape as instagram-oauth:
 *   POST …/soundcloud-oauth/authorize  { brand_id }  Authorization: Bearer <user JWT>  -> { url }
 *   GET  …/soundcloud-oauth/callback?code=&state=    (SoundCloud calls this directly) -> 302 redirect
 *
 * The PKCE code_verifier is generated here and stashed on the same
 * single-use oauth_flow_states row as the CSRF state — never sent to the
 * browser — then read back in the callback to complete the exchange.
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
  const creds = await getPlatformCredentials(svc, "soundcloud");
  if (!creds) {
    return json({ error: "SoundCloud isn't configured yet. Ask a super admin to set it up under Platform Credentials." }, 409);
  }

  const state = randomState();
  const codeVerifier = generateCodeVerifier();
  const redirectUri = redirectUriFor("soundcloud");
  const { error: insertError } = await svc.from("oauth_flow_states").insert({
    state,
    brand_id: brandId,
    user_id: auth.user.id,
    platform: "soundcloud",
    return_origin: allowedOrigin(req),
    pkce_verifier: codeVerifier,
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (insertError) return json({ error: "Could not start the SoundCloud connection" }, 500);

  return json({ url: await buildAuthorizeUrl(creds, redirectUri, state, codeVerifier) });
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

  if (url.searchParams.get("error")) return redirectToSettings(origin, brandId, { soundcloud: "denied" });

  if (!stateRow || stateRow.used_at || new Date(stateRow.expires_at) < new Date() || !stateRow.pkce_verifier) {
    return redirectToSettings(origin, brandId, { soundcloud: "error", reason: "invalid_state" });
  }
  await svc.from("oauth_flow_states").update({ used_at: new Date().toISOString() }).eq("state", stateParam);

  const code = url.searchParams.get("code");
  if (!code) return redirectToSettings(origin, brandId, { soundcloud: "error", reason: "missing_code" });

  try {
    const creds = await getPlatformCredentials(svc, "soundcloud");
    if (!creds) return redirectToSettings(origin, brandId, { soundcloud: "error", reason: "config_error" });

    const token = await exchangeCodeForToken(creds, code, redirectUriFor("soundcloud"), stateRow.pkce_verifier);
    const profile = await fetchProfile(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    const { data: account, error: upsertError } = await svc
      .from("connected_accounts")
      .upsert(
        {
          brand_id: stateRow.brand_id,
          platform: "soundcloud",
          status: "connected",
          account_name: profile.username,
          account_external_id: String(profile.id),
          scopes: ["non-expiring"],
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
    if (upsertError || !account) throw new SoundCloudApiError("Could not save the connection", "api_error");

    await svc.from("connected_account_secrets").upsert(
      {
        connected_account_id: account.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        provider_meta: { soundcloud_id: profile.id },
      },
      { onConflict: "connected_account_id" },
    );

    await svc.from("audit_logs").insert({
      actor_id: stateRow.user_id,
      brand_id: stateRow.brand_id,
      action: "connected_account.connect",
      entity_type: "connected_accounts",
      entity_id: account.id,
      metadata: { platform: "soundcloud", account_name: profile.username },
    });

    return redirectToSettings(origin, brandId, { soundcloud: "connected" });
  } catch (e) {
    console.error("soundcloud-oauth callback failed:", e);
    const reason = e instanceof SoundCloudApiError ? e.reason : "unknown";
    return redirectToSettings(origin, brandId, { soundcloud: "error", reason });
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (action === "authorize" && req.method === "POST") return handleAuthorize(req);
  if (action === "callback" && req.method === "GET") return handleCallback(req);
  return json({ error: "Not found. Use /authorize or /callback." }, 404);
});

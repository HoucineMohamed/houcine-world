import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, canManageBrand, serviceClient } from "../_shared/authz.ts";
import { getPlatformCredentials } from "../_shared/credentials.ts";
import { resolveAssets, inspectToken, MetaApiError } from "../_shared/metaBusiness.ts";

/**
 * Saves a brand's Meta Business Suite System User access token.
 *
 *   POST …/meta-business-token  { brand_id, access_token }  Authorization: Bearer <user JWT>
 *
 * Brand-admin gated (re-checked server-side against RLS helper RPCs). The
 * token is validated against the Graph API, then written to
 * connected_account_secrets — a service-role-only table — and NEVER echoed
 * back to the browser. Only the resolved Page/Instagram display names and
 * status land in connected_accounts, which brand members can read.
 *
 * Disconnecting reuses the existing audited `disconnect_platform_account`
 * RPC, exactly like every OAuth platform.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Not authenticated" }, 401);

  let body: { brand_id?: string; access_token?: string; page_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const brandId = body.brand_id;
  const token = body.access_token?.trim();
  if (!brandId) return json({ error: "brand_id is required" }, 400);
  if (!token) return json({ error: "Paste the System User access token from Meta Business Suite" }, 400);
  if (!(await canManageBrand(auth.userClient, brandId))) {
    return json({ error: "Only a brand admin can connect this brand's accounts" }, 403);
  }

  const svc = serviceClient();

  let asset;
  try {
    asset = await resolveAssets(token, body.page_id ?? null);
  } catch (e) {
    const reason = e instanceof MetaApiError ? e.reason : "api_error";
    const message = e instanceof MetaApiError && (reason === "no_page" || reason === "insufficient_permissions")
      ? e.message
      : reason === "invalid_token"
        ? "Meta rejected that token. Generate a fresh System User token in Business Settings and paste it again."
        : "Couldn't reach Meta right now. Try again in a moment.";
    return json({ ok: false, error: message, reason }, 400);
  }

  // App credentials are optional here — they're only used to read the token's
  // expiry via /debug_token. Without them the token is treated as non-expiring
  // (which is what Business-generated System User tokens normally are).
  const creds = await getPlatformCredentials(svc, "facebook");
  const appToken = creds ? `${creds.clientId}|${creds.clientSecret}` : undefined;
  const { expiresAt, scopes } = await inspectToken(token, appToken);

  const accountName = asset.igUsername
    ? `${asset.pageName} · @${asset.igUsername}`
    : asset.pageName;

  const { data: upserted, error: upsertError } = await svc.from("connected_accounts").upsert(
    {
      brand_id: brandId,
      platform: "meta_business",
      status: "connected",
      account_name: accountName,
      account_external_id: asset.pageId,
      scopes,
      error_message: null,
      connected_by: auth.user.id,
      connected_at: new Date().toISOString(),
      token_expires_at: expiresAt,
      last_refreshed_at: new Date().toISOString(),
    },
    { onConflict: "brand_id,platform" },
  ).select("id").single<{ id: string }>();

  if (upsertError || !upserted) {
    console.error("meta-business-token upsert failed:", upsertError);
    return json({ ok: false, error: "Couldn't save the connection" }, 500);
  }

  const { error: secretError } = await svc.from("connected_account_secrets").upsert(
    {
      connected_account_id: upserted.id,
      access_token: asset.pageAccessToken, // used for all insight calls
      refresh_token: token,                // the System User token itself, to re-derive page tokens
      provider_meta: {
        page_id: asset.pageId,
        page_name: asset.pageName,
        ig_user_id: asset.igUserId,
        ig_username: asset.igUsername,
        source: "meta_business_suite_system_user",
      },
    },
    { onConflict: "connected_account_id" },
  );
  if (secretError) {
    console.error("meta-business-token secret upsert failed:", secretError);
    return json({ ok: false, error: "Couldn't store the token securely" }, 500);
  }

  await svc.from("audit_logs").insert({
    actor_id: auth.user.id,
    brand_id: brandId,
    action: "connected_account.meta_business.save_token",
    entity_type: "connected_accounts",
    entity_id: upserted.id,
    metadata: { page_id: asset.pageId, ig_linked: Boolean(asset.igUserId) },
  });

  return json({
    ok: true,
    accountName,
    pageName: asset.pageName,
    instagramUsername: asset.igUsername,
    tokenExpiresAt: expiresAt,
  });
});

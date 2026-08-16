import { corsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, isSuperAdmin, serviceClient } from "../_shared/authz.ts";
import { PLATFORM_IDS, getPlatformCredentials, redirectUriFor, type PlatformId } from "../_shared/credentials.ts";

/**
 * App-level OAuth app credentials (Client ID/Secret) for each platform,
 * managed from the "Platform Credentials" settings panel — never from chat,
 * never hardcoded.
 *
 *   GET  …/platform-credentials              Authorization: Bearer <user JWT>
 *     -> status for every platform: { platform, configured, redirectUri }[]
 *     Any authenticated brand member may call this (no secrets in the
 *     response) — it's what gates the "Connect" button per platform.
 *
 *   POST …/platform-credentials  { platform, client_id, client_secret }
 *     -> super-admin only. Upserts into platform_credentials via the
 *     service-role key and writes an audit_logs row. Never echoes the secret
 *     back in the response.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const handleStatus = async (req: Request) => {
  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Not authenticated" }, 401);

  const svc = serviceClient();
  const results = await Promise.all(
    PLATFORM_IDS.map(async (platform) => ({
      platform,
      configured: (await getPlatformCredentials(svc, platform)) !== null,
      redirectUri: redirectUriFor(platform),
    })),
  );
  return json({ platforms: results });
};

const handleSave = async (req: Request) => {
  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Not authenticated" }, 401);
  if (!(await isSuperAdmin(auth.userClient))) {
    return json({ error: "Only a super admin can manage platform credentials" }, 403);
  }

  let body: { platform?: string; client_id?: string; client_secret?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const platform = body.platform as PlatformId | undefined;
  const clientId = body.client_id?.trim();
  const clientSecret = body.client_secret?.trim();
  if (!platform || !PLATFORM_IDS.includes(platform)) return json({ error: "Unknown platform" }, 400);
  if (!clientId || !clientSecret) return json({ error: "Client ID and Client Secret are both required" }, 400);

  const svc = serviceClient();
  const { error } = await svc.from("platform_credentials").upsert(
    { platform, client_id: clientId, client_secret: clientSecret, updated_by: auth.user.id },
    { onConflict: "platform" },
  );
  if (error) return json({ error: "Could not save credentials" }, 500);

  await svc.from("audit_logs").insert({
    actor_id: auth.user.id,
    action: "platform_credentials.save",
    entity_type: "platform_credentials",
    metadata: { platform },
  });

  return json({ ok: true, platform, configured: true, redirectUri: redirectUriFor(platform) });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return handleStatus(req);
  if (req.method === "POST") return handleSave(req);
  return json({ error: "Method not allowed" }, 405);
});

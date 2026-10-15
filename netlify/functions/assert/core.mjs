// Core of the "assert" Netlify Function (see docs/trades-integration.md).
// It checks, with the caller's OWN Supabase token, that the caller is the owner (super admin and the
// OWNER_USER_ID), then signs a 60-second EdDSA assertion for Houcine.Trades. The Supabase token is
// only used here, on this site's own server, and is never returned, stored or logged.
// Everything that can fail returns a generic 403. No CORS headers: same origin only.
import { createPrivateKey, randomBytes, sign } from "node:crypto";

export const ISSUER = "houcine.world";
export const LIFETIME_SECONDS = 60;
const MAX_AUTH_HEADER = 8192;
const MAX_BODY = 1024;
const MAX_UPSTREAM_BYTES = 65536;
const UPSTREAM_TIMEOUT_MS = 5000;
const RATE_LIMIT = 5; // assertions per user per minute, per function instance
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SUPABASE_URL_SHAPE = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/;
const HOST_SHAPE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
const forbidden = () => json(403, { error: "forbidden" });

const b64url = (buf) => Buffer.from(buf).toString("base64url");

/** Read the settings; null if any is missing or malformed (the function then refuses everything). */
export const readSettings = (env) => {
  const supabaseUrl = (env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const ownerUserId = (env.OWNER_USER_ID ?? "").trim().toLowerCase();
  const audience = (env.TRADES_AUDIENCE ?? "").trim().toLowerCase();
  const rawKey = env.SSO_PRIVATE_KEY ?? "";
  if (!SUPABASE_URL_SHAPE.test(supabaseUrl) || anonKey.length < 20 || anonKey.length > 4096) return null;
  if (!UUID.test(ownerUserId) || !HOST_SHAPE.test(audience) || rawKey.length < 40) return null;
  let privateKey;
  try {
    const pem = rawKey.includes("BEGIN") ? rawKey.replace(/\\n/g, "\n")
      : `-----BEGIN PRIVATE KEY-----\n${rawKey.replace(/\s+/g, "")}\n-----END PRIVATE KEY-----\n`;
    privateKey = createPrivateKey({ key: pem, format: "pem" });
  } catch {
    return null;
  }
  if (privateKey.asymmetricKeyType !== "ed25519") return null;
  return { supabaseUrl, anonKey, ownerUserId, audience, privateKey };
};

/** GET a small JSON document from Supabase with the user's token: timeout, no redirects, size cap. */
const getJson = async (fetchImpl, url, headers) => {
  const response = await fetchImpl(url, {
    method: "GET",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (response.status !== 200) return null;
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_UPSTREAM_BYTES) return null;
  const text = await response.text();
  if (text.length > MAX_UPSTREAM_BYTES) return null;
  return JSON.parse(text);
};

/** The compact EdDSA token (JWS) that Houcine.Trades verifies with the matching public key. */
export const signAssertion = ({ privateKey, audience, subject, nowSeconds, jti }) => {
  const header = b64url(JSON.stringify({ alg: "EdDSA", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: ISSUER, aud: audience, sub: subject, iat: nowSeconds, exp: nowSeconds + LIFETIME_SECONDS, jti,
  }));
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey);
  return `${header}.${payload}.${b64url(signature)}`;
};

/**
 * Build the request handler. Dependencies are injected so it can be tested without the network:
 * env (settings), fetchImpl, now() in milliseconds, randomId().
 */
export const createHandler = ({
  env, fetchImpl = fetch, now = () => Date.now(), randomId = () => b64url(randomBytes(16)),
}) => {
  const recent = new Map(); // user id -> timestamps (ms) of recent assertions, this instance only

  const rateLimited = (userId, nowMs) => {
    const windowStart = nowMs - 60_000;
    const kept = (recent.get(userId) ?? []).filter((t) => t > windowStart);
    if (kept.length >= RATE_LIMIT) { recent.set(userId, kept); return true; }
    kept.push(nowMs);
    recent.set(userId, kept);
    return false;
  };

  return async (request) => {
    try {
      if (request.method !== "POST") return json(405, { error: "method not allowed" });

      // Same origin only: the browser's Origin must be this site's own origin.
      const origin = request.headers.get("origin");
      if (!origin || origin !== new URL(request.url).origin) return forbidden();
      const fetchSite = request.headers.get("sec-fetch-site");
      if (fetchSite && fetchSite !== "same-origin") return forbidden();

      const length = Number(request.headers.get("content-length") ?? "0");
      if (!Number.isFinite(length) || length > MAX_BODY) return json(413, { error: "too large" });

      const settings = readSettings(env);
      if (!settings) return forbidden();

      const authorization = request.headers.get("authorization") ?? "";
      if (authorization.length > MAX_AUTH_HEADER || !authorization.startsWith("Bearer ")) return forbidden();
      const userToken = authorization.slice(7).trim();
      if (!JWT_SHAPE.test(userToken)) return forbidden();

      const headers = { apikey: settings.anonKey, authorization: `Bearer ${userToken}`, accept: "application/json" };

      // 1. Is the token valid? Supabase answers with the user it belongs to.
      const user = await getJson(fetchImpl, `${settings.supabaseUrl}/auth/v1/user`, headers);
      const userId = typeof user?.id === "string" ? user.id.toLowerCase() : "";
      if (!UUID.test(userId) || userId !== settings.ownerUserId) return forbidden();

      // 2. The caller's own profile row, read with the caller's own token (row-level security applies).
      const rows = await getJson(
        fetchImpl,
        `${settings.supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,platform_role,deleted_at`,
        headers,
      );
      const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!row || String(row.id).toLowerCase() !== userId) return forbidden();
      if (row.platform_role !== "super_admin" || row.deleted_at !== null) return forbidden();

      const nowMs = now();
      if (rateLimited(userId, nowMs)) return json(429, { error: "too many requests" });

      const assertion = signAssertion({
        privateKey: settings.privateKey,
        audience: settings.audience,
        subject: userId,
        nowSeconds: Math.floor(nowMs / 1000),
        jti: randomId(),
      });
      return json(200, { assertion });
    } catch {
      // Never log the request, the token or the key; a generic answer only.
      return forbidden();
    }
  };
};

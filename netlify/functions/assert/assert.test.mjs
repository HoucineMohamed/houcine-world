// Tests for the assert function core (node --test netlify/functions/assert/). No network: fetch is faked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify, webcrypto } from "node:crypto";
import { createHandler, readSettings, ISSUER, LIFETIME_SECONDS } from "./core.mjs";

const SITE = "https://houcine.world";
const SUPABASE = "https://abcdefghijklmnopqrst.supabase.co";
const OWNER = "11111111-2222-4333-8444-555555555555";
const OTHER = "99999999-2222-4333-8444-555555555555";
const ANON = ["sb", "publishable", "x".repeat(30)].join("_");
const USER_TOKEN = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiJ0ZXN0In0", "c2lnbmF0dXJl"].join(".");
const NOW = Date.UTC(2026, 9, 15, 12, 0, 0);

/** An Ed25519 key pair made with WebCrypto, exported as the setup page does (PKCS8 / SPKI PEM). */
const makeKeys = async () => {
  const pair = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const pem = (label, der) =>
    `-----BEGIN ${label}-----\n${Buffer.from(der).toString("base64").match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
  return {
    privatePem: pem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)),
    publicPem: pem("PUBLIC KEY", await webcrypto.subtle.exportKey("spki", pair.publicKey)),
  };
};
const keys = await makeKeys();

const env = (over = {}) => ({
  VITE_SUPABASE_URL: SUPABASE,
  VITE_SUPABASE_PUBLISHABLE_KEY: ANON,
  OWNER_USER_ID: OWNER,
  TRADES_AUDIENCE: "houcine-trades.onrender.com",
  SSO_PRIVATE_KEY: keys.privatePem,
  ...over,
});

/** A fake Supabase: records every call; `user` and `profile` decide the answers. */
const fakeFetch = ({ user = { id: OWNER }, profile = { id: OWNER, platform_role: "super_admin", deleted_at: null }, status = 200, throws = false } = {}) => {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (throws) throw new Error("network down");
    const body = url.includes("/auth/v1/user") ? user : profile === null ? [] : [profile];
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  return { impl, calls };
};

const request = ({ method = "POST", origin = SITE, auth = `Bearer ${USER_TOKEN}`, extra = {} } = {}) =>
  new Request(`${SITE}/api/assert`, {
    method,
    headers: { ...(origin ? { origin } : {}), ...(auth ? { authorization: auth } : {}), "sec-fetch-site": "same-origin", ...extra },
  });

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

test("the owner gets a signed 60-second assertion that verifies with the public key", async () => {
  const { impl, calls } = fakeFetch();
  const handler = createHandler({ env: env(), fetchImpl: impl, now: () => NOW, randomId: () => "jti-1" });
  const res = await handler(request());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("access-control-allow-origin"), null, "no CORS headers");
  const { assertion } = await res.json();
  const [h, p, s] = assertion.split(".");
  assert.deepEqual(decode(h), { alg: "EdDSA", typ: "JWT" });
  const claims = decode(p);
  assert.deepEqual(claims, {
    iss: ISSUER, aud: "houcine-trades.onrender.com", sub: OWNER,
    iat: NOW / 1000, exp: NOW / 1000 + LIFETIME_SECONDS, jti: "jti-1",
  });
  assert.equal(verify(null, Buffer.from(`${h}.${p}`), createPublicKey(keys.publicPem), Buffer.from(s, "base64url")), true);
  assert.equal(JSON.stringify(claims).includes(USER_TOKEN), false, "the Supabase token is never inside the assertion");
});

test("Supabase is called with the user's own token and the public key, no redirects, with a timeout", async () => {
  const { impl, calls } = fakeFetch();
  await createHandler({ env: env(), fetchImpl: impl, now: () => NOW })(request());
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${SUPABASE}/auth/v1/user`);
  assert.equal(calls[1].url, `${SUPABASE}/rest/v1/profiles?id=eq.${OWNER}&select=id,platform_role,deleted_at`);
  for (const { init } of calls) {
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.authorization, `Bearer ${USER_TOKEN}`);
    assert.equal(init.headers.apikey, ANON);
  }
});

test("refused: anyone who is not the configured owner", async () => {
  const { impl } = fakeFetch({ user: { id: OTHER }, profile: { id: OTHER, platform_role: "super_admin", deleted_at: null } });
  const res = await createHandler({ env: env(), fetchImpl: impl, now: () => NOW })(request());
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "forbidden" });
});

test("refused: the owner id without the super-admin role, or a deleted profile, or no profile", async () => {
  for (const profile of [
    { id: OWNER, platform_role: "member", deleted_at: null },
    { id: OWNER, platform_role: "super_admin", deleted_at: "2026-01-01T00:00:00Z" },
    { id: OWNER },
    null,
  ]) {
    const { impl } = fakeFetch({ profile });
    const res = await createHandler({ env: env(), fetchImpl: impl, now: () => NOW })(request());
    assert.equal(res.status, 403, JSON.stringify(profile));
  }
});

test("refused: invalid Supabase token, Supabase errors and network failures", async () => {
  for (const opts of [{ status: 401 }, { status: 500 }, { throws: true }, { user: {} }]) {
    const { impl } = fakeFetch(opts);
    const res = await createHandler({ env: env(), fetchImpl: impl, now: () => NOW })(request());
    assert.equal(res.status, 403, JSON.stringify(opts));
  }
});

test("refused before calling Supabase: wrong method, other origin, missing or malformed token, big body", async () => {
  const cases = [
    [request({ method: "GET" }), 405],
    [request({ origin: "https://evil.example" }), 403],
    [request({ origin: null }), 403],
    [request({ extra: { "sec-fetch-site": "cross-site" } }), 403],
    [request({ auth: null }), 403],
    [request({ auth: "Bearer not-a-jwt" }), 403],
    [request({ auth: `Basic ${USER_TOKEN}` }), 403],
    [request({ extra: { "content-length": "5000" } }), 413],
  ];
  for (const [req, status] of cases) {
    const { impl, calls } = fakeFetch();
    const res = await createHandler({ env: env(), fetchImpl: impl, now: () => NOW })(req);
    assert.equal(res.status, status);
    assert.equal(calls.length, 0, "Supabase must not be called");
  }
});

test("refused: missing or malformed settings (fail closed, answered as not configured)", async () => {
  for (const over of [
    { SSO_PRIVATE_KEY: "" }, { SSO_PRIVATE_KEY: "not a key at all, definitely not a key" },
    { OWNER_USER_ID: "" }, { OWNER_USER_ID: "owner" },
    { TRADES_AUDIENCE: "" }, { TRADES_AUDIENCE: "https://houcine-trades.onrender.com/" },
    { VITE_SUPABASE_URL: "http://abcdefghijklmnopqrst.supabase.co" }, { VITE_SUPABASE_URL: "https://evil.example" },
    { VITE_SUPABASE_PUBLISHABLE_KEY: "" },
  ]) {
    assert.equal(readSettings(env(over)), null, JSON.stringify(Object.keys(over)));
    const { impl, calls } = fakeFetch();
    const res = await createHandler({ env: env(over), fetchImpl: impl, now: () => NOW })(request());
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "not configured" });
    assert.equal(calls.length, 0);
  }
});

test("a non-Ed25519 private key is refused", async () => {
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const der = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  assert.equal(readSettings(env({ SSO_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` })), null);
});

test("the key also works pasted as one line with \\n escapes or as bare base64", () => {
  assert.ok(readSettings(env({ SSO_PRIVATE_KEY: keys.privatePem.replace(/\n/g, "\\n") })));
  const bare = keys.privatePem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  assert.ok(readSettings(env({ SSO_PRIVATE_KEY: bare })));
});

test("rate limit: at most 5 assertions per user per minute", async () => {
  const { impl } = fakeFetch();
  let t = NOW;
  const handler = createHandler({ env: env(), fetchImpl: impl, now: () => t });
  for (let i = 0; i < 5; i++) assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429);
  t += 61_000;
  assert.equal((await handler(request())).status, 200);
});

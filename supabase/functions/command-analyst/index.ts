// command-analyst: the Command Center's AI management analyst (docs/command-center.md). Read-only.
//
//   POST /command-analyst  { question, brandIds: string[] | null, history? }
//
// Order of checks: allowed origin; a signed-in user (their token is forwarded, so every read below runs AS THEM and
// row-level security decides what comes back); the brand scope: "all brands" only for a super admin, otherwise every
// requested brand must be one the user may access; finance only when the user may read it for the whole scope. Then
// the shared engine computes the facts pack and the model answers from it alone (core.ts). No SQL, no tool, no write,
// no key in the browser. Logs hold outcomes only, never a question, an answer or a figure.
//
// Secrets: ANTHROPIC_API_KEY (shared with the concierge), optional ANALYST_MODEL (default the concierge's
// ANTHROPIC_MODEL, else claude-opus-5-5). Without a key the analyst says it is not configured.
import { authenticateRequest, isSuperAdmin } from "../_shared/authz.ts";
import { createAnthropicProvider } from "../_shared/llm/anthropic.ts";
import { isAllowedOrigin } from "../concierge/core.ts";
import { loadDataset, type ReadClient } from "../_shared/command/load.ts";
import { dayOf } from "../_shared/command/metrics.ts";
import { ask, facts } from "./core.ts";

const MAX_BODY = 20_000;
const corsFor = (origin: string | null): Record<string, string> =>
  isAllowedOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin!, Vary: "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
    : {};
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsFor(origin) } });

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
const model = Deno.env.get("ANALYST_MODEL")?.trim() || Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-opus-5-5";
const llm = apiKey ? createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: 60_000, fetch }) : null;

// A few questions per user per minute (per running instance): the console's spend limit is the real cap.
const recent = new Map<string, number[]>();
const throttled = (userId: string) => {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(userId, list);
  return list.length > 6;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(origin) ? 204 : 403, headers: corsFor(origin) });
  if (!isAllowedOrigin(origin)) return json(403, { error: "Not allowed from this origin." }, origin);
  if (req.method !== "POST") return json(405, { error: "POST only." }, origin);
  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Sign in again." }, origin);
  if (throttled(auth.user.id)) return json(429, { error: "Too many questions in a minute. Wait a moment." }, origin);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "The request is too large." }, origin);
  let body: { question?: unknown; brandIds?: unknown; history?: unknown };
  try { body = JSON.parse(raw); } catch { return json(400, { error: "Invalid request." }, origin); }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) return json(400, { error: "Ask a question." }, origin);
  const requested = body.brandIds === null ? null : Array.isArray(body.brandIds) ? body.brandIds.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 50) : undefined;
  if (requested === undefined || (requested && !requested.length)) return json(400, { error: "Choose the brands to ask about." }, origin);

  try {
    const client = auth.userClient;
    const superAdmin = await isSuperAdmin(client);
    if (requested === null && !superAdmin) return json(403, { error: "Only a super admin may ask about every brand." }, origin);
    // Every requested brand must be one this user may read; finance only if they are brand_admin of all of them.
    let financeVisible = superAdmin;
    if (requested && !superAdmin) {
      const checks = await Promise.all(requested.map(async (id) => {
        const [{ data: access }, { data: admin }] = await Promise.all([
          client.rpc("has_brand_access", { target_brand_id: id }),
          client.rpc("has_brand_role", { target_brand_id: id, min_role: "brand_admin" }),
        ]);
        return { access: Boolean(access), admin: Boolean(admin) };
      }));
      if (checks.some((c) => !c.access)) return json(403, { error: "One of these brands is not yours to read." }, origin);
      financeVisible = checks.every((c) => c.admin);
    }
    const { dataset, truncated } = await loadDataset(client as unknown as ReadClient, { brandIds: requested, financeVisible });
    let bq = client.from("brands").select("id, name").is("deleted_at", null);
    if (requested) bq = bq.in("id", requested);
    const { data: brandRows } = await bq;
    const { data: contactRows } = await client.from("contacts").select("id, name").is("deleted_at", null).limit(2000);
    const brands = (brandRows ?? []) as { id: string; name: string }[];
    const today = dayOf(new Date().toISOString());
    const pack = facts({ dataset, brands, contacts: (contactRows ?? []) as { id: string; name: string }[], today, truncated, scopeLabel: requested ? `brands ${brands.map((b) => b.name).join(", ")}` : "every brand (super admin)" });
    const history = Array.isArray(body.history)
      ? body.history.filter((m): m is { role: "user" | "assistant"; content: string } => !!m && typeof m === "object" && ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") && typeof (m as { content?: unknown }).content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      : [];
    const result = await ask(llm, question, pack, history);
    console.log(`command-analyst: ${result.error ? "error" : "answered"}${result.unverified.length ? ` (${result.unverified.length} unverified)` : ""}`);
    return json(200, { ...result, scope: requested ? brands.map((b) => b.name) : "all", financeVisible, facts: pack }, origin);
  } catch (e) {
    console.error("command-analyst: failed", e instanceof Error ? e.message.slice(0, 60) : "unknown");
    return json(500, { error: "The analyst could not read the records. Try again." }, origin);
  }
});

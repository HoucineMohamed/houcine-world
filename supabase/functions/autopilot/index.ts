// autopilot: the server side of Autopilot that needs the AI model (docs/autopilot.md). Everything else (events,
// automations, executions, monitoring, notifications, confirmations) runs in the database.
//
//   POST /autopilot/tick  { }                                  run monitoring (ap_tick) and write queued AI jobs
//   POST /autopilot/ask   { question, brandIds | null, history? }  the AI Operations Assistant (proposals, never actions)
//
// Every read and write runs AS THE SIGNED-IN USER (their token is forwarded): row-level security and the database
// functions decide what exists for them. "All brands" only for a super admin; otherwise only brands they manage.
// No SQL, no tool, no key in the browser. Logs hold outcomes only.
import { authenticateRequest, isSuperAdmin } from "../_shared/authz.ts";
import { createAnthropicProvider } from "../_shared/llm/anthropic.ts";
import { isAllowedOrigin } from "../concierge/core.ts";
import { loadDataset, type ReadClient } from "../_shared/command/load.ts";
import { dayOf } from "../_shared/command/metrics.ts";
import { BRAIN_INDEX } from "../_shared/brain/index.generated.ts";
import { facts } from "../command-analyst/core.ts";
import { ask, context, jobText, knowledgeFor, type Actionable } from "./core.ts";
import { privateSources } from "../_shared/knowledge/retrieve.ts";

const corsFor = (origin: string | null): Record<string, string> =>
  isAllowedOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin!, Vary: "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
    : {};
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsFor(origin) } });

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
const model = Deno.env.get("ANALYST_MODEL")?.trim() || Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-opus-5-5";
const llm = apiKey ? createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: 60_000, fetch }) : null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const recent = new Map<string, number[]>();
const throttled = (userId: string) => {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(userId, list);
  return list.length > 10;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(origin) ? 204 : 403, headers: corsFor(origin) });
  if (!isAllowedOrigin(origin)) return json(403, { error: "Not allowed from this origin." }, origin);
  if (req.method !== "POST") return json(405, { error: "POST only." }, origin);
  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Sign in again." }, origin);
  if (throttled(auth.user.id)) return json(429, { error: "Too many requests in a minute. Wait a moment." }, origin);
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const client = auth.userClient;
  let body: Record<string, unknown> = {};
  try { const raw = await req.text(); if (raw.length > 20_000) return json(413, { error: "Too large." }, origin); body = raw ? JSON.parse(raw) : {}; } catch { return json(400, { error: "Invalid request." }, origin); }

  try {
    if (action === "tick") {
      const { data: tick, error } = await client.rpc("ap_tick", { p_force: body.force === true });
      if (error) return json(403, { error: "Monitoring is for brand admins and super admins." }, origin);
      // AI jobs of the brands this admin manages (claimed by the database, at most 5 per call).
      const { data: jobs } = await client.rpc("ap_claim_jobs", { p_limit: 5 });
      let written = 0;
      for (const job of (jobs ?? []) as { id: string; kind: "ai_summary" | "followup_draft"; input: { payload?: Record<string, unknown>; instruction?: string } }[]) {
        const r = await jobText(llm, job.kind, job.input.payload ?? {}, job.input.instruction ?? "");
        await client.rpc("ap_complete_job", { p_id: job.id, p_result: r.text, p_error: r.error });
        if (r.text) written++;
      }
      console.log(`autopilot: tick ${tick?.ran ? "ran" : "skipped"}, ${written} job(s)`);
      return json(200, { tick, jobs: written }, origin);
    }

    if (action === "ask") {
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
      if (!question) return json(400, { error: "Ask a question." }, origin);
      const requested = body.brandIds === null ? null : Array.isArray(body.brandIds) ? body.brandIds.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 50) : undefined;
      if (requested === undefined || (requested && !requested.length)) return json(400, { error: "Choose the brands." }, origin);
      const superAdmin = await isSuperAdmin(client);
      if (requested === null && !superAdmin) return json(403, { error: "Only a super admin may ask about every brand." }, origin);
      if (requested && !superAdmin) {
        for (const id of requested) {
          const { data } = await client.rpc("has_brand_role", { target_brand_id: id, min_role: "brand_admin" });
          if (!data) return json(403, { error: "Autopilot is for the admins of a brand." }, origin);
        }
      }
      // Reads as the user, limited to the requested brands (row-level security limits them anyway).
      type Q = PromiseLike<{ data: unknown[] | null }> & { in(c: string, v: string[]): Q; eq(c: string, v: string): Q; is(c: string, v: null): Q; not(c: string, o: string, v: string): Q; order(c: string, o: { ascending: boolean }): Q; limit(n: number): Q };
      const from = (table: string, cols: string) => (client as unknown as { from(t: string): { select(c: string): Q } }).from(table).select(cols);
      const scoped = (q: Q) => (requested ? q.in("brand_id", requested) : q);
      const { dataset, truncated } = await loadDataset(client as unknown as ReadClient, { brandIds: requested, financeVisible: true });
      let bq = from("brands", "id, name").is("deleted_at", null);
      if (requested) bq = bq.in("id", requested);
      const [{ data: brandRows }, { data: contacts }, { data: alerts }, { data: runs }, { data: projects }, { data: leads }, { data: invoices }, { data: members }] = await Promise.all([
        bq,
        from("contacts", "id, name").is("deleted_at", null).limit(2000),
        scoped(from("ops_alerts", "title, severity, category, brand_id, status, detected_at, suggested_action").eq("status", "open").order("detected_at", { ascending: false }).limit(60)),
        scoped(from("automation_runs", "status, created_at, error, brand_id, automation:automations(name)").order("created_at", { ascending: false }).limit(20)),
        scoped(from("projects", "id, brand_id, name, owner_id").is("deleted_at", null).limit(200)),
        scoped(from("leads", "id, brand_id, title, owner_id").is("deleted_at", null).not("stage", "in", "(won,lost)").limit(200)),
        scoped(from("invoices", "id, brand_id, number").eq("status", "sent").limit(200)),
        scoped(from("brand_admins", "user_id, brand_id, role, profile:profiles(full_name, email)").eq("role", "brand_admin").limit(200)),
      ]);
      const brands = (brandRows ?? []) as { id: string; name: string }[];
      const actionable: Actionable = {
        brands,
        projects: (projects ?? []) as Actionable["projects"],
        leads: (leads ?? []) as Actionable["leads"],
        invoices: (invoices ?? []) as Actionable["invoices"],
        members: ((members ?? []) as { user_id: string; brand_id: string; profile: { full_name: string | null; email: string | null } | null }[]).map((m) => ({ user_id: m.user_id, brand_id: m.brand_id, name: m.profile?.full_name || m.profile?.email || "a team member" })),
      };
      const today = dayOf(new Date().toISOString());
      const pack = facts({ dataset, brands, contacts: (contacts ?? []) as { id: string; name: string }[], today, truncated, scopeLabel: requested ? `brands ${brands.map((b) => b.name).join(", ")}` : "every brand (super admin)" });
      // Knowledge OS: public notes plus private documents this admin may read (checked in the database, as them).
      const privateKnowledge = (await privateSources(client as never, question, "autopilot_ai", requested, 3)).map((k) => ({ title: `${k.title} (${k.visibility}, ${k.version})`, section: k.section, status: "verified" as const, text: k.text, link: null }));
      const knowledge = [...privateKnowledge, ...knowledgeFor(BRAIN_INDEX, question, superAdmin)].slice(0, 6);
      const ctx = context({
        facts: pack, knowledge, actionable,
        alerts: (alerts ?? []) as never,
        runs: ((runs ?? []) as { status: string; created_at: string; error: string | null; automation: { name: string } | null }[]).map((r) => ({ automation: r.automation?.name ?? "automation", status: r.status, created_at: r.created_at, error: r.error })),
      });
      const history = Array.isArray(body.history) ? (body.history as { role: unknown; content: unknown }[]).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 4000) })) : [];
      const result = await ask(llm, question, ctx, actionable, history);
      // Proposals are stored in the user's name (row-level security checks the brand); executed only on confirmation.
      const stored = [];
      for (const p of result.proposals) {
        const { data, error } = await client.from("assistant_proposals").insert({ user_id: auth.user.id, brand_id: p.brand_id, action_type: p.action_type, target_type: p.target_type, target_id: p.target_id, params: p.params, summary: p.summary }).select("id").single();
        if (!error && data) stored.push({ ...p, id: (data as { id: string }).id, brand_name: brands.find((b) => b.id === p.brand_id)?.name ?? "" });
      }
      console.log(`autopilot: ask ${result.error ? "error" : "answered"}, ${stored.length} proposal(s), ${result.rejected} rejected`);
      return json(200, { answer: result.answer, error: result.error, unverified: result.unverified, proposals: stored, rejected: result.rejected, knowledge, context: ctx }, origin);
    }
    return json(404, { error: "Unknown action." }, origin);
  } catch (e) {
    console.error("autopilot: failed", e instanceof Error ? e.message.slice(0, 60) : "unknown");
    return json(500, { error: "Autopilot could not complete this request." }, origin);
  }
});

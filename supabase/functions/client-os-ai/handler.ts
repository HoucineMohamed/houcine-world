// Client OS AI, one request (docs/client-os-ai.md). Everything is read and written with the signed-in person's own
// client (their token): row-level security and the Client OS functions decide what exists for them, on EVERY turn
// (nothing from an earlier turn is trusted). The model gets facts as text and returns JSON; links and actions are
// checked against the records just read; actions are stored as proposals that run only on confirmation.
import type { BrainIndex } from "../_shared/brain/types.ts";
import type { LlmProvider } from "../_shared/llm/provider.ts";
import {
  CLIENT_SCHEMA, CLIENT_SYSTEM, INTERNAL_SCHEMA, INTERNAL_SYSTEM, cents, clientFacts, flagFigures, fromCents, historyTurns, internalFacts, keepLinks,
  knowledgeBrands, knowledgeFor, providerMessage, userTurn, validateClientActions, validateInternalActions, withRetry, type Mode,
} from "./core.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Reply { status: number; body: Record<string, unknown> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const LIMITS = { perHour: 30, questionChars: 1000 };

const log = (db: Db, user: string, kind: Mode, event: string, conversation: string | null, meta: Record<string, unknown> = {}) =>
  db.from("ai_activity").insert({ user_id: user, kind, event, conversation_id: conversation, meta }).then(() => undefined, () => undefined);

const data = async <T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>, fallback: T): Promise<T> => {
  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return r.data ?? fallback;
};

export const handleAsk = async (db: Db, userId: string, body: Record<string, unknown>, llm: LlmProvider | null, index: BrainIndex, now = new Date()): Promise<Reply> => {
  const mode = body.mode === "internal" ? "internal" : body.mode === "client" ? "client" : null;
  if (!mode) return { status: 400, body: { error: "Unknown assistant." } };
  const question = typeof body.question === "string" ? body.question.trim().slice(0, LIMITS.questionChars) : "";
  if (!question) return { status: 400, body: { error: "Ask a question." } };

  // 1. Access, now (a revoked membership or a removed brand role ends access at once).
  const { data: allowed } = await db.rpc("cai_can_use", { p_kind: mode });
  if (allowed !== true) return { status: 403, body: { error: mode === "client" ? "This account has no active client access." : "The intelligence assistant is for brand admins and super admins." } };
  let brandFilter: string | null = null;
  if (mode === "internal" && typeof body.brandId === "string" && body.brandId) {
    const { data: can } = await db.rpc("ap_can_manage", { p_brand_id: body.brandId });
    if (!UUID.test(body.brandId) || can !== true) { await log(db, userId, mode, "refused", null, { reason: "brand" }); return { status: 403, body: { error: "Not allowed for this brand." } }; }
    brandFilter = body.brandId;
  }

  // 2. Rate limit from the person's own activity log.
  const since = new Date(now.getTime() - 3600_000).toISOString();
  const { count } = await db.from("ai_activity").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event", "request").gte("created_at", since);
  if ((count ?? 0) >= LIMITS.perHour) return { status: 429, body: { error: "Too many questions in the last hour. Please wait a little." } };

  // 3. The conversation (their own; created if new).
  let conversationId = typeof body.conversationId === "string" && UUID.test(body.conversationId) ? body.conversationId : null;
  if (conversationId) {
    const { data: conv } = await db.from("ai_conversations").select("id, kind").eq("id", conversationId).maybeSingle();
    if (!conv || conv.kind !== mode) return { status: 404, body: { error: "Conversation not found." } };
  } else {
    const conv = await data(db.from("ai_conversations").insert({ user_id: userId, kind: mode, title: question.slice(0, 80) }).select("id").single(), null as { id: string } | null);
    conversationId = conv!.id;
    await log(db, userId, mode, "conversation_created", conversationId);
  }
  const history = await data(db.from("ai_messages").select("role, content, meta").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(40), [] as { role: string; content: string; meta: Record<string, unknown> }[]);
  await data(db.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: question }).select("id").single(), null);
  await log(db, userId, mode, "request", conversationId);

  // 4. Facts, read now as this person.
  let facts: ReturnType<typeof clientFacts>;
  let slugs: string[] = [];
  if (mode === "client") {
    const home = await data(db.rpc("portal_client_home"), { memberships: [] } as Record<string, unknown>);
    const props = (home.proposals as { id: string }[] | undefined) ?? [];
    const snaps = props.length ? await data(db.from("proposal_versions").select("proposal_id, version, snapshot").in("proposal_id", props.map((p) => p.id)), [] as never[]) : [];
    const convs = await data(db.from("cos_conversations").select("id, subject").eq("audience", "client").limit(50), [] as { id: string; subject: string }[]);
    const msgs = convs.length ? await data(db.from("cos_messages").select("conversation_id, author_id, body, created_at, internal").eq("internal", false).in("conversation_id", convs.map((c) => c.id)).order("created_at", { ascending: true }).limit(200), [] as { conversation_id: string; author_id: string | null; body: string; created_at: string }[]) : [];
    facts = clientFacts(home, snaps, msgs.map((m) => ({ conversation_subject: convs.find((c) => c.id === m.conversation_id)?.subject ?? "", from_team: m.author_id !== userId, body: m.body, created_at: m.created_at })));
    const ids = ((home.memberships as { brand_id: string }[] | undefined) ?? []).map((m) => m.brand_id);
    slugs = ids.length ? (await data(db.from("brands").select("slug").in("id", ids), [] as { slug: string }[])).map((b) => b.slug) : [];
  } else {
    const { data: isSuper } = await db.rpc("is_super_admin");
    let brands = await data(db.from("brands").select("id, name, slug").is("deleted_at", null), [] as { id: string; name: string; slug: string }[]);
    if (!isSuper) {
      const mine = (await data(db.from("brand_admins").select("brand_id").eq("user_id", userId).eq("role", "brand_admin"), [] as { brand_id: string }[])).map((r) => r.brand_id);
      brands = brands.filter((b) => mine.includes(b.id));
    }
    if (brandFilter) brands = brands.filter((b) => b.id === brandFilter);
    const ids = brands.map((b) => b.id);
    slugs = brands.map((b) => b.slug);
    const today = now.toISOString().slice(0, 10);
    const inScope = (q: Db) => q.in("brand_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const [analytics, projects, proposals, deliverables, requests, invoices, payments, rels, interactions, members, stages] = await Promise.all([
      db.rpc("cos_analytics", { p_brand: brandFilter }).then((r: { data: unknown }) => r.data ?? null),
      data(inScope(db.from("projects").select("id, brand_id, name, status, deadline, owner_id, client_contact_id, stage_key").is("deleted_at", null)).limit(300), []),
      data(inScope(db.from("proposals").select("id, brand_id, reference, title, status, currency, contact_id, sent_at, valid_until, version").in("status", ["sent", "viewed", "negotiation", "accepted", "rejected"])).order("updated_at", { ascending: false }).limit(60), []),
      data(inScope(db.from("deliverables").select("id, brand_id, project_id, title, status, current_version, submitted_at").in("status", ["submitted", "internal_review", "revision_requested"])).limit(100), []),
      data(inScope(db.from("client_requests").select("id, brand_id, title, category, status, created_at, project_id").in("status", ["open", "in_progress", "waiting_client"])).limit(100), []),
      data(inScope(db.from("invoices").select("id, brand_id, contact_id, number, amount, currency, due_date").eq("status", "sent")).limit(300), []),
      data(inScope(db.from("payments").select("invoice_id, amount")).limit(2000), []),
      data(inScope(db.from("contact_brands").select("contact_id, brand_id, contact:contacts(name)").eq("status", "client")).limit(300), []),
      data(inScope(db.from("interactions").select("contact_id, occurred_at")).order("occurred_at", { ascending: false }).limit(1000), []),
      data(inScope(db.from("brand_admins").select("user_id, brand_id, profile:profiles(full_name, email)").eq("role", "brand_admin")).limit(200), []),
      data(db.from("lifecycle_stages").select("key").limit(300), []),
    ]);
    const paid = new Map<string, number>();
    for (const p of payments as { invoice_id: string | null; amount: string }[]) if (p.invoice_id) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + cents(p.amount));
    const totals = new Map<string, string | null>();
    for (const p of proposals as { id: string }[]) {
      const { data: t } = await db.rpc("cos_proposal_totals", { p_proposal: p.id });
      totals.set(p.id, (t as { total?: string } | null)?.total ?? null);
    }
    facts = internalFacts({
      brands, analytics, today, stages: [...new Set((stages as { key: string }[]).map((s) => s.key))],
      projects: projects as never, deliverables: deliverables as never, requests: requests as never,
      proposals: (proposals as { id: string }[]).map((p) => ({ ...(p as never as Record<string, unknown>), total: totals.get(p.id) ?? null })) as never,
      invoices: (invoices as { id: string }[]).map((i) => ({ ...(i as never as Record<string, unknown>), paid: fromCents(paid.get(i.id) ?? 0) })) as never,
      clients: (rels as { contact_id: string; brand_id: string; contact: { name: string } | null }[]).map((r) => ({ contact_id: r.contact_id, brand_id: r.brand_id, name: r.contact?.name ?? "Client",
        last_interaction: (interactions as { contact_id: string | null; occurred_at: string }[]).find((i) => i.contact_id === r.contact_id)?.occurred_at ?? null })),
      members: (members as { user_id: string; brand_id: string; profile: { full_name: string | null; email: string | null } | null }[]).map((m) => ({ user_id: m.user_id, brand_id: m.brand_id, name: m.profile?.full_name || m.profile?.email || "Team member" })),
    });
  }
  const knowledge = knowledgeFor(index, question, knowledgeBrands(slugs));

  // 5. The model (no tools, no SQL): facts in, JSON out; one retry for a temporary provider problem.
  const store = async (content: string, meta: Record<string, unknown>) =>
    (await data(db.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: content.slice(0, 12000), meta }).select("id, created_at").single(), null as { id: string; created_at: string } | null))!;
  await db.from("ai_conversations").update({ updated_at: now.toISOString() }).eq("id", conversationId);
  if (!llm) {
    const msg = providerMessage(null);
    const saved = await store(msg, { error: "not_configured" });
    await log(db, userId, mode, "provider_error", conversationId, { error: "not_configured" });
    return { status: 200, body: { conversationId, message: { id: saved.id, role: "assistant", content: msg, meta: { error: "not_configured" }, created_at: saved.created_at } } };
  }
  const result = await withRetry(() => llm.json({
    system: mode === "client" ? CLIENT_SYSTEM : INTERNAL_SYSTEM,
    messages: [...historyTurns(history), { role: "user", content: userTurn(facts.text, knowledge, facts.allowed.links, question) }],
    maxTokens: 1800,
    schema: mode === "client" ? CLIENT_SCHEMA : INTERNAL_SCHEMA,
  }));
  if (!result.ok) {
    const msg = providerMessage(llm, result.error);
    const saved = await store(msg, { error: result.error });
    await log(db, userId, mode, "provider_error", conversationId, { error: result.error, model: llm.model });
    return { status: 200, body: { conversationId, message: { id: saved.id, role: "assistant", content: msg, meta: { error: result.error }, created_at: saved.created_at } } };
  }

  // 6. Checks: links from the records only, actions validated and stored as proposals, unverified numbers flagged.
  const v = result.value as Record<string, unknown>;
  const answer = typeof v.answer === "string" && v.answer.trim() ? v.answer.trim() : "I could not form an answer from your records.";
  const observations = mode === "internal" ? (Array.isArray(v.observations) ? v.observations.filter((x): x is string => typeof x === "string").slice(0, 10) : []) : [];
  const recommendations = mode === "internal" ? (Array.isArray(v.recommendations) ? v.recommendations.filter((x): x is string => typeof x === "string").slice(0, 8) : []) : [];
  const missing = mode === "internal" ? (Array.isArray(v.missing) ? v.missing.filter((x): x is string => typeof x === "string").slice(0, 6) : []) : [];
  const links = keepLinks(v.links, facts.allowed);
  const checked = mode === "client" ? validateClientActions(v.actions, facts.allowed) : validateInternalActions(v.actions, facts.allowed);
  const proposals = [];
  for (const act of checked.valid) {
    const { data: row, error } = await db.from("ai_action_proposals").insert({ user_id: userId, conversation_id: conversationId, kind: mode, action_type: act.action_type, brand_id: act.brand_id, payload: act.payload, summary: act.summary }).select("id").single();
    if (!error && row) { proposals.push({ id: row.id, action_type: act.action_type, summary: act.summary, preview: act.preview, status: "proposed" }); await log(db, userId, mode, "action_proposed", conversationId, { action: act.action_type }); }
  }
  if (checked.rejected) await log(db, userId, mode, "action_rejected_by_validation", conversationId, { count: checked.rejected });
  const unverified = flagFigures([answer, ...observations, ...recommendations], facts.text);
  const meta = { links, observations, recommendations, missing, proposals, unverified, rejected: checked.rejected,
    knowledge: knowledge.map((k) => ({ title: k.title, section: k.section, brand: k.brand, status: k.status, updated: k.updated, source: k.source })) };
  const saved = await store(answer, meta);
  await log(db, userId, mode, "answer", conversationId, { model: llm.model, links: links.length, proposals: proposals.length, unverified: unverified.length, knowledge: knowledge.length });
  return { status: 200, body: { conversationId, message: { id: saved.id, role: "assistant", content: answer, meta, created_at: saved.created_at } } };
};

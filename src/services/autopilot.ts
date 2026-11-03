// Autopilot data access (docs/autopilot.md). Everything runs with the signed-in user's own session: row-level
// security and the database functions decide what exists for them and what they may change. The engine itself
// (events, executions, monitoring) runs in the database; the AI side in the "autopilot" function.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const db = supabase as unknown as SupabaseClient;
const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};
const NO_BRAND = "00000000-0000-0000-0000-000000000000";

export interface Condition { field: string; op: string; value?: string }
export interface Action { type: string; title?: string; body?: string; priority?: string; category?: string; severity?: string; due_in_days?: number; include_central?: boolean; to?: string; instruction?: string; assign?: string; suggested_action?: string }
export interface Definition { trigger: string; match?: "all" | "any"; conditions?: Condition[]; actions: Action[]; requires_approval?: boolean }
export interface Automation { id: string; brand_id: string | null; name: string; description: string | null; status: string; definition: Definition; version: number; created_at: string; updated_at: string }
export interface Run { id: string; automation_id: string; version: number; event_id: number; brand_id: string | null; status: string; attempts: number; conditions_result: { passed: boolean; checks: { field: string; op: string; value: string; actual: unknown; ok: boolean }[] } | null; error: string | null; created_at: string; started_at: string | null; completed_at: string | null }
export interface RunAction { id: number; run_id: string; position: number; action_type: string; status: string; result: Record<string, unknown> | null; error: string | null; attempt: number; created_at: string }
export interface AutomationEvent { id: number; brand_id: string | null; event_type: string; entity_type: string | null; entity_id: string | null; occurred_at: string; dispatch_error: string | null }
export interface OpsAlert { id: string; brand_id: string | null; rule: string; category: string; severity: string; title: string; description: string | null; entity_type: string | null; entity_id: string | null; suggested_action: string | null; status: string; responsible_id: string | null; detected_at: string; last_seen_at: string; resolved_at: string | null; dismissed_at: string | null; source: string }
export interface UserNotification { id: string; brand_id: string | null; category: string; priority: string; title: string; body: string | null; link: string | null; source: string; created_at: string; read_at: string | null }
export interface Preferences { user_id: string; muted_categories: string[]; muted_brands: string[]; min_priority: string; in_app: boolean }
export interface Proposal { id: string; action_type: string; target_type: string; target_id: string; brand_id: string; brand_name: string; summary: string; params: Record<string, string>; target_name: string; expected: string; responsible: string }

/** Records limited to some brands (null = all the user may see; "global" adds the brand-less rows for super admins). */
const scoped = <Q extends { in: (c: string, v: string[]) => Q }>(q: Q, brandIds: string[] | null) => (brandIds ? q.in("brand_id", brandIds.length ? brandIds : [NO_BRAND]) : q);

export const autopilotApi = {
  automations: async (brandIds: string[] | null): Promise<Automation[]> => {
    const { data, error } = await scoped(db.from("automations").select("*").order("updated_at", { ascending: false }), brandIds);
    fail(error);
    return (data ?? []) as Automation[];
  },
  versions: async (automationId: string) => {
    const { data, error } = await db.from("automation_versions").select("version, definition, created_at").eq("automation_id", automationId).order("version", { ascending: false });
    fail(error);
    return (data ?? []) as { version: number; definition: Definition; created_at: string }[];
  },
  saveAutomation: async (row: { id?: string; brand_id: string | null; name: string; description: string | null; status: string; definition: Definition }) => {
    const { id, ...rest } = row;
    const q = id ? db.from("automations").update({ name: rest.name, description: rest.description, status: rest.status, definition: rest.definition }).eq("id", id).select("id").single()
      : db.from("automations").insert(rest).select("id").single();
    const { data, error } = await q;
    fail(error);
    return (data as { id: string }).id;
  },
  setStatus: async (id: string, status: string) => {
    const { error } = await db.from("automations").update({ status }).eq("id", id);
    fail(error);
  },
  runs: async (brandIds: string[] | null, filter: { status?: string; automation?: string } = {}): Promise<Run[]> => {
    let q = db.from("automation_runs").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.automation) q = q.eq("automation_id", filter.automation);
    const { data, error } = await scoped(q, brandIds);
    fail(error);
    return (data ?? []) as Run[];
  },
  /** One execution by id (row-level security returns nothing for a brand the person does not manage). */
  run: async (id: string): Promise<Run | null> => {
    const { data, error } = await db.from("automation_runs").select("*").eq("id", id).maybeSingle();
    fail(error);
    return (data as Run | null) ?? null;
  },
  runActions: async (runId: string): Promise<RunAction[]> => {
    const { data, error } = await db.from("automation_run_actions").select("*").eq("run_id", runId).order("position").order("attempt");
    fail(error);
    return (data ?? []) as RunAction[];
  },
  events: async (brandIds: string[] | null, eventType?: string): Promise<AutomationEvent[]> => {
    let q = db.from("automation_events").select("id, brand_id, event_type, entity_type, entity_id, occurred_at, dispatch_error").order("occurred_at", { ascending: false }).limit(50);
    if (eventType) q = q.eq("event_type", eventType);
    const { data, error } = await scoped(q, brandIds);
    fail(error);
    return (data ?? []) as AutomationEvent[];
  },
  alerts: async (brandIds: string[] | null, status: string): Promise<OpsAlert[]> => {
    const { data, error } = await scoped(db.from("ops_alerts").select("*").eq("status", status).order("detected_at", { ascending: false }).limit(300), brandIds);
    fail(error);
    return (data ?? []) as OpsAlert[];
  },
  setAlert: async (id: string, status: "dismissed" | "resolved") => {
    const { error } = await db.rpc("ap_set_alert", { p_alert: id, p_status: status, p_responsible: null });
    fail(error);
  },
  retry: async (runId: string) => {
    const { data, error } = await db.rpc("ap_retry", { p_run: runId });
    fail(error);
    return data as string;
  },
  decide: async (runId: string, approve: boolean) => {
    const { data, error } = await db.rpc("ap_decide", { p_run: runId, p_approve: approve });
    fail(error);
    return data as string;
  },
  test: async (automationId: string, eventId: number) => {
    const { data, error } = await db.rpc("ap_test", { p_automation: automationId, p_event: eventId });
    fail(error);
    return data as { trigger_matches: boolean; conditions_pass: boolean; would_run: boolean; checks: { field: string; op: string; value: string; actual: unknown; ok: boolean }[]; actions: Action[]; requires_approval: boolean };
  },
  state: async () => {
    const { data, error } = await db.from("autopilot_state").select("last_scan_at").maybeSingle();
    fail(error);
    return (data as { last_scan_at: string | null } | null)?.last_scan_at ?? null;
  },
  /** Monitoring now (the database runs it at most every 2 minutes unless forced) and pending AI jobs. */
  tick: async (force = false) => {
    const { data, error } = await supabase.functions.invoke("autopilot/tick", { body: { force } });
    if (error) throw new Error("Monitoring could not run.");
    return data as { tick: { ran: boolean; last_scan_at: string } | null; jobs: number };
  },
  notifications: async (): Promise<UserNotification[]> => {
    const { data, error } = await db.from("user_notifications").select("*").order("created_at", { ascending: false }).limit(300);
    fail(error);
    return (data ?? []) as UserNotification[];
  },
  unreadCount: async (): Promise<number> => {
    const { count, error } = await db.from("user_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    if (error) return 0;
    return count ?? 0;
  },
  markRead: async (ids: string[] | "all") => {
    let q = db.from("user_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (ids !== "all") q = q.in("id", ids.length ? ids : [NO_BRAND]);
    const { error } = await q;
    fail(error);
  },
  preferences: async (userId: string): Promise<Preferences> => {
    const { data, error } = await db.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
    fail(error);
    return (data as Preferences | null) ?? { user_id: userId, muted_categories: [], muted_brands: [], min_priority: "low", in_app: true };
  },
  savePreferences: async (p: Preferences) => {
    const { error } = await db.from("notification_preferences").upsert({ ...p, updated_at: new Date().toISOString() });
    fail(error);
  },
  ask: async (question: string, brandIds: string[] | null, history: { role: "user" | "assistant"; content: string }[]) => {
    const { data, error } = await supabase.functions.invoke("autopilot/ask", { body: { question, brandIds, history } });
    if (error) {
      let message = "The assistant could not be reached.";
      try { const ctx = (error as { context?: Response }).context; const payload = ctx ? await ctx.json() : null; if (payload?.error) message = payload.error; } catch { /* plain message */ }
      throw new Error(message);
    }
    return data as { answer: string | null; error: string | null; unverified: string[]; proposals: Proposal[]; rejected: number; knowledge: { title: string; section: string; link: string | null }[]; context: string };
  },
  confirmProposal: async (id: string, approve: boolean) => {
    const { data, error } = await db.rpc("ap_confirm_proposal", { p_id: id, p_approve: approve });
    fail(error);
    return data as Record<string, unknown>;
  },
};

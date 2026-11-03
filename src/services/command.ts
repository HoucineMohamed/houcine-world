// Command Center data access (docs/command-center.md). Every read and write goes through the signed-in user's own
// Supabase session, so row-level security decides what is returned: a brand admin's request for another brand
// simply returns nothing, whatever ids the browser sends. Figures are never computed here: the rows go to the ONE
// engine, supabase/functions/_shared/command/metrics.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Dataset, Currency } from "../../supabase/functions/_shared/command/metrics.ts";
import { loadDataset as loadShared, type ReadClient } from "../../supabase/functions/_shared/command/load.ts";

// The generated database types predate these tables; the queries below name their columns explicitly.
const db = supabase as unknown as SupabaseClient;

export { ROW_LIMIT } from "../../supabase/functions/_shared/command/load.ts";

export interface Scope {
  /** null = every brand the caller may see (the global Command Center). */
  brandIds: string[] | null;
  /** Whether finance may be read for the whole scope (super admin, or brand_admin of every brand in it). */
  financeVisible: boolean;
}

export interface LoadedData {
  dataset: Dataset;
  truncated: string[];
  loadedAt: string;
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Every record the engine needs for a scope (the database returns only what the caller may see). */
export const loadDataset = async (scope: Scope): Promise<LoadedData> => {
  const { dataset, truncated } = await loadShared(db as unknown as ReadClient, scope);
  return { dataset, truncated, loadedAt: new Date().toISOString() };
};

// ---------- detail records (lists with the fields people read) ----------

export interface Contact { id: string; kind: string; entity_type: string; name: string; email: string | null; phone: string | null; organization_id: string | null; website: string | null; notes: string | null; tags: string[]; created_at: string; updated_at: string }
export interface ContactBrand { id: string; contact_id: string; brand_id: string; status: string; source: string | null; notes: string | null; became_client_at: string | null; created_at: string }
export interface Lead { id: string; brand_id: string; contact_id: string | null; title: string; stage: string; expected_value: string | null; currency: Currency | null; source: string | null; owner_id: string | null; next_follow_up: string | null; notes: string | null; lost_reason: string | null; won_at: string | null; lost_at: string | null; converted_project_id: string | null; created_at: string; updated_at: string }
export interface Interaction { id: string; brand_id: string; contact_id: string | null; lead_id: string | null; project_id: string | null; kind: string; summary: string; occurred_at: string; created_by: string | null }
export interface Project { id: string; brand_id: string; client_contact_id: string | null; lead_id: string | null; name: string; description: string | null; owner_id: string | null; status: string; priority: string; start_date: string | null; deadline: string | null; currency: Currency | null; budget: string | null; estimated_cost: string | null; contract_value: string | null; contract_signed_on: string | null; completed_at: string | null; created_at: string; updated_at: string }
export interface Milestone { id: string; project_id: string; brand_id: string; title: string; due_date: string | null; completed_at: string | null }
export interface Task { id: string; project_id: string; brand_id: string; milestone_id: string | null; title: string; kind: string; status: string; priority: string; assignee_id: string | null; due_date: string | null; completed_at: string | null; created_at: string }
export interface Invoice { id: string; brand_id: string; contact_id: string | null; project_id: string | null; number: string; issue_date: string; due_date: string | null; amount: string; currency: Currency; status: string; category: string | null; description: string | null; created_at: string }
export interface Payment { id: string; brand_id: string; invoice_id: string | null; contact_id: string | null; project_id: string | null; amount: string; currency: Currency; received_on: string; method: string | null; category: string | null; description: string | null; created_at: string }
export interface Expense { id: string; brand_id: string; project_id: string | null; amount: string; currency: Currency; incurred_on: string; category: string | null; vendor: string | null; description: string | null; status: string; created_at: string }
export interface ActivityEvent { id: string; actor_id: string | null; brand_id: string | null; action: string; entity_type: string | null; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string }

const list = async <T>(table: string, scope: Scope, opts: { order?: string; ascending?: boolean; eq?: Record<string, string>; limit?: number; columns?: string } = {}): Promise<T[]> => {
  let q = db.from(table).select(opts.columns ?? "*").limit(opts.limit ?? 1000);
  if (scope.brandIds) q = q.in("brand_id", scope.brandIds.length ? scope.brandIds : ["00000000-0000-0000-0000-000000000000"]);
  for (const [k, v] of Object.entries(opts.eq ?? {})) q = q.eq(k, v);
  if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as T[];
};

export const commandApi = {
  contacts: async (): Promise<Contact[]> => {
    const { data, error } = await db.from("contacts").select("*").is("deleted_at", null).order("name").limit(2000);
    fail(error);
    return (data ?? []) as Contact[];
  },
  contactBrands: (scope: Scope) => list<ContactBrand>("contact_brands", scope),
  leads: (scope: Scope) => list<Lead>("leads", scope, { order: "updated_at" }).then((r) => r.filter((l) => !(l as unknown as { deleted_at?: string }).deleted_at)),
  leadEvents: (scope: Scope, leadId: string) => list<{ id: number; from_stage: string | null; to_stage: string; actor_id: string | null; created_at: string }>("lead_events", scope, { eq: { lead_id: leadId }, order: "created_at", ascending: true }),
  interactions: (scope: Scope, eq: Record<string, string>) => list<Interaction>("interactions", scope, { eq, order: "occurred_at" }),
  projects: (scope: Scope) => list<Project>("projects", scope, { order: "updated_at" }).then((r) => r.filter((p) => !(p as unknown as { deleted_at?: string }).deleted_at)),
  milestones: (scope: Scope, projectId: string) => list<Milestone>("milestones", scope, { eq: { project_id: projectId }, order: "due_date", ascending: true }),
  tasks: (scope: Scope, projectId?: string) => list<Task>("tasks", scope, { eq: projectId ? { project_id: projectId } : {}, order: "created_at", ascending: true, limit: 5000 }),
  invoices: (scope: Scope) => list<Invoice>("invoices", scope, { order: "issue_date" }),
  payments: (scope: Scope) => list<Payment>("payments", scope, { order: "received_on" }),
  expenses: (scope: Scope) => list<Expense>("expenses", scope, { order: "incurred_on" }),

  /** The activity history (audit_logs), newest first, filtered on the server. */
  activity: async (scope: Scope, f: { action?: string; entity?: string; actor?: string; from?: string; to?: string; before?: string }): Promise<ActivityEvent[]> => {
    let q = db.from("audit_logs").select("id, actor_id, brand_id, action, entity_type, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(100);
    if (scope.brandIds) q = q.in("brand_id", scope.brandIds.length ? scope.brandIds : ["00000000-0000-0000-0000-000000000000"]);
    if (f.action) q = q.like("action", `${f.action}%`);
    if (f.entity) q = q.eq("entity_type", f.entity);
    if (f.actor) q = q.eq("actor_id", f.actor);
    if (f.from) q = q.gte("created_at", `${f.from}T00:00:00`);
    if (f.to) q = q.lte("created_at", `${f.to}T23:59:59.999`);
    if (f.before) q = q.lt("created_at", f.before);
    const { data, error } = await q;
    fail(error);
    return (data ?? []) as ActivityEvent[];
  },

  // ---------- writes (the database checks the caller's role and every link) ----------
  createContact: async (input: { brandId: string; name: string; kind: string; entityType: string; email?: string; phone?: string; status: string; source?: string; notes?: string; tags?: string[] }) => {
    const { data, error } = await db.rpc("create_contact", {
      p_brand_id: input.brandId, p_name: input.name, p_kind: input.kind, p_entity_type: input.entityType,
      p_email: input.email || null, p_phone: input.phone || null, p_organization_id: null, p_status: input.status,
      p_source: input.source || null, p_notes: input.notes || null, p_tags: input.tags ?? [],
    });
    fail(error);
    return data as string;
  },
  updateContact: async (id: string, patch: Partial<Pick<Contact, "name" | "email" | "phone" | "entity_type" | "notes" | "tags" | "website">>) => {
    const { error } = await db.from("contacts").update(patch).eq("id", id);
    fail(error);
  },
  updateContactBrand: async (id: string, patch: Partial<Pick<ContactBrand, "status" | "source" | "notes">>) => {
    const { error } = await db.from("contact_brands").update(patch).eq("id", id);
    fail(error);
  },
  createLead: async (row: Partial<Lead> & { brand_id: string; title: string }) => {
    const { data, error } = await db.from("leads").insert(row).select("id").single();
    fail(error);
    return (data as { id: string }).id;
  },
  updateLead: async (id: string, patch: Partial<Lead>) => {
    const { error } = await db.from("leads").update(patch).eq("id", id);
    fail(error);
  },
  convertLead: async (leadId: string, projectName: string, deadline: string | null) => {
    const { data, error } = await db.rpc("convert_lead", { p_lead_id: leadId, p_project_name: projectName, p_deadline: deadline });
    fail(error);
    return data as string;
  },
  addInteraction: async (row: Partial<Interaction> & { brand_id: string; summary: string; kind: string }) => {
    const { error } = await db.from("interactions").insert(row);
    fail(error);
  },
  createProject: async (row: Partial<Project> & { brand_id: string; name: string }) => {
    const { data, error } = await db.from("projects").insert(row).select("id").single();
    fail(error);
    return (data as { id: string }).id;
  },
  updateProject: async (id: string, patch: Partial<Project>) => {
    const { error } = await db.from("projects").update(patch).eq("id", id);
    fail(error);
  },
  addMilestone: async (row: { project_id: string; brand_id: string; title: string; due_date: string | null }) => {
    const { error } = await db.from("milestones").insert(row);
    fail(error);
  },
  setMilestoneDone: async (id: string, done: boolean) => {
    const { error } = await db.from("milestones").update({ completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    fail(error);
  },
  addTask: async (row: { project_id: string; brand_id: string; title: string; kind: string; due_date: string | null; milestone_id: string | null; priority: string }) => {
    const { error } = await db.from("tasks").insert(row);
    fail(error);
  },
  updateTask: async (id: string, patch: Partial<Task>) => {
    const { error } = await db.from("tasks").update(patch).eq("id", id);
    fail(error);
  },
  createInvoice: async (row: Partial<Invoice> & { brand_id: string; number: string; issue_date: string; amount: string; currency: Currency }) => {
    const { error } = await db.from("invoices").insert(row);
    fail(error);
  },
  setInvoiceStatus: async (id: string, status: "draft" | "sent" | "void") => {
    const { error } = await db.from("invoices").update({ status }).eq("id", id);
    fail(error);
  },
  recordPayment: async (row: Partial<Payment> & { brand_id: string; amount: string; currency: Currency; received_on: string }) => {
    const { error } = await db.from("payments").insert(row);
    fail(error);
  },
  recordExpense: async (row: Partial<Expense> & { brand_id: string; amount: string; currency: Currency; incurred_on: string }) => {
    const { error } = await db.from("expenses").insert(row);
    fail(error);
  },
  voidExpense: async (id: string) => {
    const { error } = await db.from("expenses").update({ status: "void" }).eq("id", id);
    fail(error);
  },
  /** Record a report or export in the activity history (the database checks the scope). */
  logReport: async (brandId: string | null, report: string, params: Record<string, unknown>) => {
    const { error } = await db.rpc("log_report", { p_brand_id: brandId, p_report: report, p_params: params });
    fail(error);
  },
};

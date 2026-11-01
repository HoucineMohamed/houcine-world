// Knowledge OS data access (docs/knowledge-os.md). Private knowledge (client, internal, management) lives in Supabase;
// every read here runs with the signed-in person's session, so the one access rule in the database decides what exists
// for them (search, lists, graph links, versions). Writes go only through the kos_* functions, which check rights and
// audit. Public knowledge stays in Knowledge Studio's notes (published through the website repository).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const db = supabase as unknown as SupabaseClient;
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await db.rpc(fn, args);
  fail(error);
  return data as T;
};

export type Visibility = "client" | "internal" | "management";
export const VISIBILITY: Record<Visibility, { label: string; help: string }> = {
  client: { label: "Client", help: "Clients of the brand (or of every brand when global), client-facing AI, and the brand's team." },
  internal: { label: "Internal", help: "The brand's team (or every team member when global) and internal AI. Never clients or partners." },
  management: { label: "Management", help: "Super admins only. Never brand admins, clients or partners, and never a client-facing AI." },
};
export const STATUS: Record<string, string> = { draft: "Draft", in_review: "In review", approved: "Approved", published: "Published", archived: "Archived" };
export const RELATIONS = ["related", "procedure", "policy", "service", "faq", "source", "project_type", "brand"] as const;

export interface KosDocument {
  id: string; title: string; description: string | null; content: string; category: string | null; tags: string[]; visibility: Visibility;
  brand_id: string | null; client_contact_id: string | null; status: string; version: number; published_version: number | null; published_at: string | null;
  owner_id: string | null; author_id: string | null; reviewer_id: string | null; review_due: string | null; review_interval_days: number | null; expires_on: string | null;
  sources: string[]; created_at: string; updated_at: string;
}
export interface KosVersion { id: string; version: number; title: string; content: string; category: string | null; tags: string[]; summary: string | null; author_id: string | null; created_at: string }
export interface KosReview { id: string; version: number; decision: string; comment: string | null; actor_id: string | null; created_at: string }
export interface KosLink { id: string; from_document: string; to_document: string | null; to_note: string | null; relation: string; created_at: string }
export interface KosResult { document_id: string; title: string; version: number; brand_id: string | null; brand: string; visibility: string; category: string | null; section: string; score: number; updated_at: string; why: string }
export interface KosInsights {
  total: number; live: number; by_status: Record<string, number>; by_visibility: Record<string, number>; by_brand: { brand_id: string | null; brand: string; count: number }[];
  recent: { id: string; title: string; updated_at: string; status: string }[]; review_overdue: { id: string; title: string; review_due: string }[];
  expiring: { id: string; title: string; expires_on: string }[]; unowned: { id: string; title: string }[]; awaiting_review: { id: string; title: string }[];
  retrievals: number; answered_pct: number | null; by_consumer: Record<string, number>; top_documents: { id: string; title: string; uses: number; consumers: string[] }[];
  unused: { id: string; title: string }[]; gaps: { question: string; times: number; last: string }[]; duplicates: { a: string; a_title: string; b: string; b_title: string }[];
  broken_links: { from: string; from_title: string; to: string }[]; orphans: { id: string; title: string }[]; computed_at: string;
}

const LIST_COLUMNS = "id, title, description, category, tags, visibility, brand_id, client_contact_id, status, version, published_version, published_at, owner_id, author_id, reviewer_id, review_due, review_interval_days, expires_on, sources, created_at, updated_at";

export const knowledgeOsApi = {
  /** A page of documents the person may read, filtered in the database. */
  list: async (f: { q?: string; visibility?: string; brand?: string; status?: string; category?: string; tag?: string; owner?: string; page?: number }) => {
    let q = db.from("kos_documents").select(LIST_COLUMNS, { count: "exact" }).order("updated_at", { ascending: false });
    if (f.visibility) q = q.eq("visibility", f.visibility);
    if (f.brand === "global") q = q.is("brand_id", null); else if (f.brand) q = q.eq("brand_id", f.brand);
    if (f.status) q = q.eq("status", f.status); else q = q.neq("status", "archived");
    if (f.category) q = q.eq("category", f.category);
    if (f.tag) q = q.contains("tags", [f.tag.toLowerCase()]);
    if (f.owner) q = q.eq("owner_id", f.owner);
    if (f.q?.trim()) { const t = f.q.trim().replace(/[%,()]/g, " "); q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%,category.ilike.%${t}%,content.ilike.%${t}%`); }
    const page = f.page ?? 0;
    const { data, error, count } = await q.range(page * 50, page * 50 + 49);
    fail(error);
    return { rows: (data ?? []) as unknown as KosDocument[], count: count ?? 0 };
  },
  get: async (id: string) => {
    const { data, error } = await db.from("kos_documents").select("*").eq("id", id).maybeSingle();
    fail(error);
    return data as KosDocument | null;
  },
  /** Titles of readable documents (for relations), limited. */
  titles: async () => {
    const { data, error } = await db.from("kos_documents").select("id, title, visibility, brand_id, status").neq("status", "archived").order("title").limit(500);
    fail(error);
    return (data ?? []) as Pick<KosDocument, "id" | "title" | "visibility" | "brand_id" | "status">[];
  },
  versions: async (id: string) => { const { data, error } = await db.from("kos_versions").select("id, version, title, content, category, tags, summary, author_id, created_at").eq("document_id", id).order("version", { ascending: false }); fail(error); return (data ?? []) as KosVersion[]; },
  reviews: async (id: string) => { const { data, error } = await db.from("kos_reviews").select("*").eq("document_id", id).order("created_at"); fail(error); return (data ?? []) as KosReview[]; },
  links: async (id?: string) => {
    let q = db.from("kos_links").select("*");
    if (id) q = q.or(`from_document.eq.${id},to_document.eq.${id}`);
    const { data, error } = await q.limit(2000);
    fail(error);
    return (data ?? []) as KosLink[];
  },
  save: (id: string | null, doc: Record<string, unknown>, summary: string | null) => rpc<string>("kos_save", { p_id: id, p_doc: doc, p_summary: summary }),
  setScope: (id: string, visibility: Visibility, brand: string | null, contact: string | null, confirm: boolean) => rpc("kos_set_scope", { p_id: id, p_visibility: visibility, p_brand: brand, p_contact: contact, p_confirm: confirm }),
  setSchedule: (id: string, owner: string | null, reviewDue: string | null, interval: number | null, expires: string | null) => rpc("kos_set_schedule", { p_id: id, p_owner: owner, p_review_due: reviewDue, p_interval: interval, p_expires: expires }),
  transition: (id: string, action: string, comment: string | null = null, reviewer: string | null = null) => rpc<{ status: string }>("kos_transition", { p_id: id, p_action: action, p_comment: comment, p_reviewer: reviewer }),
  restoreVersion: (id: string, version: number) => rpc<number>("kos_restore_version", { p_id: id, p_version: version }),
  duplicate: (id: string) => rpc<string>("kos_duplicate", { p_id: id }),
  remove: (id: string) => rpc("kos_delete", { p_id: id }),
  link: (from: string, toDocument: string | null, toNote: string | null, relation: string) => rpc<string>("kos_link", { p_from: from, p_to_document: toDocument, p_to_note: toNote, p_relation: relation }),
  unlink: (id: string) => rpc("kos_unlink", { p_link: id }),
  insights: (brand: string | null) => rpc<KosInsights>("kos_insights", { p_brand: brand }),
  simulate: (q: string, role: string, brand: string | null, contact: string | null, draft: string | null) =>
    rpc<{ identity: string; note: string | null; results: KosResult[] }>("kos_simulate", { p_query: q, p_role: role, p_brand: brand, p_contact: contact, p_draft: draft }),
  /** Team members who may own or review a brand's document (brand admins of that brand). */
  editors: async (brand: string | null) => {
    if (!brand) return [] as { user_id: string; name: string }[];
    const { data, error } = await db.from("brand_admins").select("user_id, profile:profiles(full_name, email)").eq("brand_id", brand).eq("role", "brand_admin");
    fail(error);
    return ((data ?? []) as unknown as { user_id: string; profile: { full_name: string | null; email: string | null } | null }[]).map((m) => ({ user_id: m.user_id, name: m.profile?.full_name || m.profile?.email || "Team member" }));
  },
  clients: async (brand: string) => {
    const { data, error } = await db.from("contact_brands").select("contact_id, contact:contacts(name)").eq("brand_id", brand).eq("status", "client").limit(300);
    fail(error);
    return ((data ?? []) as unknown as { contact_id: string; contact: { name: string } | null }[]).map((c) => ({ id: c.contact_id, name: c.contact?.name ?? "Client" }));
  },
};

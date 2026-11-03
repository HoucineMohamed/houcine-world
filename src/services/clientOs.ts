// Client OS data access (docs/client-os.md). Everything runs with the signed-in person's own session: row-level
// security and the cos_* / portal_* database functions decide what exists for them and what they may change. External
// people (clients, partners) read Command Center records ONLY through the portal_* functions, which return client-safe
// fields. Files: a private bucket; the server registers every upload and checks every read.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { renderPdf, type PdfLine } from "@/lib/command/pdf";

const db = supabase as unknown as SupabaseClient;
const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await db.rpc(fn, args);
  fail(error);
  return data as T;
};
const rows = async <T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> => {
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as T[];
};
const NO_ID = "00000000-0000-0000-0000-000000000000";
type Query = PromiseLike<{ data: unknown; error: { message: string } | null }> & { in(c: string, v: string[]): Query };
/** Limits a query to some brands (null = everything the person may see; row-level security applies either way). */
const scoped = (q: unknown, brandIds: string[] | null): Query => {
  const b = q as Query;
  return brandIds ? b.in("brand_id", brandIds.length ? brandIds : [NO_ID]) : b;
};

export type Money = { currency: string; amount: string | number };
export interface Membership { id: string; kind: "client" | "partner"; user_id: string; contact_id: string; brand_id: string; status: string; created_at: string; status_changed_at: string }
export interface Invitation { id: string; kind: string; brand_id: string; contact_id: string; email: string; project_ids: string[]; status: string; expires_at: string; created_at: string; accepted_at: string | null }
export interface Relationship { id: string; contact_id: string; brand_id: string; status: string; became_client_at: string | null; created_at: string; contact: { id: string; name: string; email: string | null; kind: string; organization_id: string | null } | null }
export interface ProjectRow { id: string; brand_id: string; name: string; status: string; client_contact_id: string | null; owner_id: string | null; deadline: string | null; start_date: string | null; stage_key: string | null; lifecycle_id: string | null; client_summary: string | null; currency: string | null }
export interface Participant { id: string; project_id: string; brand_id: string; membership_id: string; scope: string; status: string; expires_at: string | null; created_at: string }
export interface TaskAssignment { id: string; task_id: string; project_id: string; brand_id: string; membership_id: string; can_submit: boolean; status: string; expires_at: string | null }
export interface Lifecycle { id: string; brand_id: string | null; name: string; project_type: string | null; is_default: boolean }
export interface Stage { id: string; lifecycle_id: string; key: string; label: string; client_label: string | null; position: number; allowed_next: string[]; requires: string[]; is_final: boolean }
export interface Deliverable { id: string; project_id: string; brand_id: string; task_id: string | null; title: string; description: string | null; status: string; current_version: number; approved_version: number | null; partner_membership_id: string | null; due_date: string | null; submitted_at: string | null; approved_at: string | null; created_at: string }
export interface DeliverableVersion { id: string; deliverable_id: string; project_id: string; brand_id: string; version: number; audience: string; note: string | null; file_id: string | null; link_url: string | null; submitted_by: string | null; submitted_at: string }
export interface Review { id: string; version_id: string; deliverable_id: string; reviewer_kind: string; decision: string; comment: string | null; created_at: string }
export interface ClientRequest { id: string; brand_id: string; project_id: string | null; membership_id: string | null; contact_id: string | null; deliverable_id: string | null; category: string; title: string; description: string | null; status: string; assigned_to: string | null; created_at: string; resolved_at: string | null }
export interface RequestEvent { id: number; request_id: string; kind: string; body: string | null; internal: boolean; actor_id: string | null; created_at: string; file_id: string | null }
export interface Conversation { id: string; brand_id: string; project_id: string | null; contact_id: string | null; audience: string; subject: string; created_at: string; last_message_at: string | null }
export interface Message { id: string; conversation_id: string; brand_id: string; author_id: string | null; body: string; internal: boolean; file_id: string | null; created_at: string }
export interface Proposal { id: string; brand_id: string; contact_id: string; project_id: string | null; reference: string; title: string; summary: string | null; currency: "EUR" | "USD"; payment_terms: string | null; delivery_estimate: string | null; terms: string | null; valid_until: string | null; status: string; version: number; sent_at: string | null; viewed_at: string | null; decided_at: string | null; decision_note: string | null; created_at: string; updated_at: string }
export interface ProposalItem { id?: string; proposal_id?: string; position: number; catalog_id: string | null; category: string | null; description: string; quantity: string; unit_price: string; discount_pct: string; tax_pct: string }
export interface ProposalEvent { id: number; proposal_id: string; kind: string; version: number | null; body: string | null; actor_kind: string; created_at: string }
export interface ProposalSnapshot { reference: string; title: string; summary: string | null; currency: string; payment_terms: string | null; delivery_estimate: string | null; terms: string | null; valid_until: string; totals: Totals; items: { description: string; category: string | null; quantity: number; unit_price: number; discount_pct: number; tax_pct: number }[] }
export interface Totals { currency: string; subtotal: string; discount: string; net: string; tax: string; total: string; lines: number }
export interface CatalogItem { id: string; brand_id: string; name: string; description: string | null; category: string | null; unit: string | null; unit_price: string; currency: string; active: boolean }
export interface Contract { id: string; brand_id: string; contact_id: string; proposal_id: string | null; project_id: string | null; template_id: string | null; title: string; body: string; status: string; version: number; sent_at: string | null; decided_at: string | null; decision_note: string | null; created_at: string }
export interface ContractTemplate { id: string; brand_id: string | null; name: string; body: string }
export interface FileRow { id: string; brand_id: string; project_id: string | null; object_path: string; file_name: string; mime_type: string; size_bytes: number; purpose: string; audience: string; status: string; created_at: string }
export interface SearchHit { kind: string; id: string; brand_id: string | null; title: string; subtitle: string | null; updated_at: string | null }

// Portal shapes (from portal_* functions).
export interface PortalVersion { id: string; version: number; note: string | null; file_id: string | null; file_name: string | null; mime_type: string | null; link_url: string | null; submitted_at: string; review: { decision: string; comment: string | null; at: string } | null }
export interface PortalDeliverable { id: string; title: string; description: string | null; status: string; due_date: string | null; approved_version: number | null; versions: PortalVersion[] }
export interface PortalProject {
  id: string; name: string; brand_id: string; brand: string; access: string; summary: string | null; status: string; start_date: string | null; deadline: string | null;
  progress: { done: number; total: number }; manager: string | null;
  milestones: { id: string; title: string; due_date: string | null; completed: boolean }[];
  tasks: { id: string; title: string; status: string; due_date: string | null; priority?: string; can_submit?: boolean; expires_at?: string | null }[];
  deliverables?: PortalDeliverable[]; files?: { id: string; name: string; mime_type: string; size: number; created_at: string }[];
  stage_history?: { status: string; at: string }[] | null;
}
export interface ClientHome {
  memberships: { id: string; brand_id: string; brand: string; contact: string }[];
  projects?: PortalProject[];
  proposals?: { id: string; reference: string; title: string; brand: string; status: string; version: number; valid_until: string; currency: string; total: string; sent_at: string }[];
  contracts?: { id: string; title: string; brand: string; status: string; version: number; sent_at: string; decided_at: string | null }[];
  invoices?: { id: string; number: string; brand: string; issue_date: string; due_date: string | null; currency: string; amount: number; paid: number; balance: number; payments: { amount: number; currency: string; received_on: string }[]; instructions: string | null; description: string | null }[];
  requests?: { id: string; title: string; category: string; status: string; brand_id: string; project_id: string | null; created_at: string; resolved_at: string | null }[];
}
export interface PartnerHome {
  memberships: { id: string; brand_id: string; brand: string; contact: string }[];
  collaborations?: { project_id: string; brand_id: string; name: string; brand: string; scope: string; deadline: string | null; expires_at: string | null }[];
  tasks?: { id: string; title: string; status: string; priority: string; due_date: string | null; project_id: string; brand_id: string; project: string; can_submit: boolean; expires_at: string | null; deliverables: { id: string; title: string; status: string; current_version: number }[] }[];
  files?: { id: string; name: string; mime_type: string; size: number; project_id: string | null; expires_at: string | null; shared_at: string }[];
  agreements?: { id: string; title: string; status: string; version: number }[];
}

export const REQUEST_CATEGORIES: Record<string, string> = { revision: "Revision", support: "Support", change: "Change request", new_project: "New project", information: "Information", other: "Other" };
export const ACCEPTED_FILES = "application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,text/plain,text/csv,application/zip,audio/mpeg,audio/wav,video/mp4,.docx,.xlsx,.pptx";
export const MAX_FILE = 25 * 1024 * 1024;

/** Money is text from the database (numeric); formatted per currency, never summed across currencies here. */
export const fmtMoney = (amount: string | number | null | undefined, currency: string) =>
  amount === null || amount === undefined || amount === "" ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount));

export const clientOsApi = {
  // ── Relationships and identity ──────────────────────────────────────────────────────────────────────────────────
  relationships: (brandIds: string[] | null, statuses: string[]) =>
    rows<Relationship>(scoped(db.from("contact_brands").select("id, contact_id, brand_id, status, became_client_at, created_at, contact:contacts(id, name, email, kind, organization_id)").in("status", statuses).order("created_at", { ascending: false }).limit(1000), brandIds)),
  memberships: (brandIds: string[] | null) => rows<Membership>(scoped(db.from("portal_memberships").select("*").order("created_at", { ascending: false }), brandIds)),
  invitations: (brandIds: string[] | null) =>
    rows<Invitation>(scoped(db.from("portal_invitations").select("id, kind, brand_id, contact_id, email, project_ids, status, expires_at, created_at, accepted_at").order("created_at", { ascending: false }).limit(300), brandIds)),
  invite: (kind: string, brandId: string, contactId: string, email: string, projectIds: string[], days: number) =>
    rpc<{ id: string; token: string }>("cos_invite", { p_kind: kind, p_brand: brandId, p_contact: contactId, p_email: email, p_project_ids: projectIds, p_days: days }),
  revokeInvitation: (id: string) => rpc("cos_revoke_invitation", { p_id: id }),
  setMembershipStatus: (id: string, status: string) => rpc("cos_set_membership_status", { p_id: id, p_status: status }),
  invitationPreview: (token: string) => rpc<{ valid: boolean; reason?: string; kind?: string; brand?: string; expires_at?: string; email_hint?: string }>("cos_invitation_preview", { p_token: token }),
  acceptInvitation: (token: string) => rpc<{ membership_id: string; kind: string; brand_id: string }>("cos_accept_invitation", { p_token: token }),
  myMemberships: async () => rows<Membership>(db.from("portal_memberships").select("*").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? NO_ID)),

  // ── Projects, participation, lifecycle ──────────────────────────────────────────────────────────────────────────
  projects: (brandIds: string[] | null) =>
    rows<ProjectRow>(scoped(db.from("projects").select("id, brand_id, name, status, client_contact_id, owner_id, deadline, start_date, stage_key, lifecycle_id, client_summary, currency").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000), brandIds)),
  updateProject: async (id: string, patch: Partial<Pick<ProjectRow, "client_summary" | "lifecycle_id">>) => { const { error } = await db.from("projects").update(patch).eq("id", id); fail(error); },
  participants: (brandIds: string[] | null) => rows<Participant>(scoped(db.from("project_participants").select("*").order("created_at", { ascending: false }), brandIds)),
  addParticipant: async (projectId: string, brandId: string, membershipId: string, scope: string, expiresAt: string | null) => {
    const { error } = await db.from("project_participants").upsert({ project_id: projectId, brand_id: brandId, membership_id: membershipId, scope, expires_at: expiresAt, status: "active" }, { onConflict: "project_id,membership_id" });
    fail(error);
  },
  revokeParticipant: async (id: string) => { const { error } = await db.from("project_participants").update({ status: "revoked" }).eq("id", id); fail(error); },
  tasks: (projectId: string) => rows<{ id: string; title: string; status: string; due_date: string | null; client_visible: boolean; priority: string }>(db.from("tasks").select("id, title, status, due_date, client_visible, priority").eq("project_id", projectId).order("due_date", { ascending: true, nullsFirst: false })),
  setTaskVisible: async (id: string, visible: boolean) => { const { error } = await db.from("tasks").update({ client_visible: visible }).eq("id", id); fail(error); },
  taskAssignments: (brandIds: string[] | null) => rows<TaskAssignment>(scoped(db.from("partner_task_assignments").select("*"), brandIds)),
  assignTask: async (taskId: string, projectId: string, brandId: string, membershipId: string, canSubmit: boolean, expiresAt: string | null) => {
    const { error } = await db.from("partner_task_assignments").upsert({ task_id: taskId, project_id: projectId, brand_id: brandId, membership_id: membershipId, can_submit: canSubmit, expires_at: expiresAt, status: "active" }, { onConflict: "task_id,membership_id" });
    fail(error);
  },
  unassignTask: async (id: string) => { const { error } = await db.from("partner_task_assignments").update({ status: "revoked" }).eq("id", id); fail(error); },
  lifecycles: () => rows<Lifecycle>(db.from("project_lifecycles").select("*").order("name")),
  stages: () => rows<Stage>(db.from("lifecycle_stages").select("*").order("position")),
  saveLifecycle: async (row: { id?: string; brand_id: string | null; name: string; project_type: string | null; is_default: boolean }) => {
    const { id, ...rest } = row;
    const q = id ? db.from("project_lifecycles").update(rest).eq("id", id).select("id").single() : db.from("project_lifecycles").insert(rest).select("id").single();
    const { data, error } = await q;
    fail(error);
    return (data as { id: string }).id;
  },
  saveStage: async (row: Omit<Stage, "id"> & { id?: string }) => {
    const { id, ...rest } = row;
    const { error } = id ? await db.from("lifecycle_stages").update(rest).eq("id", id) : await db.from("lifecycle_stages").insert(rest);
    fail(error);
  },
  deleteStage: async (id: string) => { const { error } = await db.from("lifecycle_stages").delete().eq("id", id); fail(error); },
  setStage: (projectId: string, stage: string, note: string | null) => rpc<{ stage: string; changed: boolean }>("cos_set_stage", { p_project: projectId, p_stage: stage, p_note: note }),
  stageHistory: (projectId: string) => rows<{ id: number; from_stage: string | null; to_stage: string; note: string | null; created_at: string }>(db.from("project_stage_history").select("id, from_stage, to_stage, note, created_at").eq("project_id", projectId).order("created_at")),

  // ── Deliverables ────────────────────────────────────────────────────────────────────────────────────────────────
  deliverables: (brandIds: string[] | null) => rows<Deliverable>(scoped(db.from("deliverables").select("*").order("updated_at", { ascending: false }).limit(500), brandIds)),
  createDeliverable: async (row: { project_id: string; brand_id: string; title: string; description: string | null; task_id: string | null; partner_membership_id: string | null; due_date: string | null }) => {
    const { error } = await db.from("deliverables").insert(row);
    fail(error);
  },
  versions: (deliverableId: string) => rows<DeliverableVersion>(db.from("deliverable_versions").select("*").eq("deliverable_id", deliverableId).order("version", { ascending: false })),
  reviews: (deliverableId: string) => rows<Review>(db.from("deliverable_reviews").select("*").eq("deliverable_id", deliverableId)),
  submitVersion: (deliverableId: string, note: string, fileId: string | null, link: string | null) =>
    rpc<{ version_id: string; version: number; audience: string }>("cos_submit_version", { p_deliverable: deliverableId, p_note: note, p_file: fileId, p_link: link }),
  review: (versionId: string, decision: "approved" | "rejected" | "revision_requested", comment: string | null) =>
    rpc<{ review_id: string; request_id: string | null }>("cos_review_version", { p_version: versionId, p_decision: decision, p_comment: comment }),

  // ── Requests ────────────────────────────────────────────────────────────────────────────────────────────────────
  requests: (brandIds: string[] | null) => rows<ClientRequest>(scoped(db.from("client_requests").select("*").order("created_at", { ascending: false }).limit(500), brandIds)),
  requestEvents: (requestId: string) => rows<RequestEvent>(db.from("client_request_events").select("*").eq("request_id", requestId).order("created_at")),
  createRequest: (brandId: string, projectId: string | null, category: string, title: string, description: string) =>
    rpc<string>("cos_create_request", { p_brand: brandId, p_project: projectId, p_category: category, p_title: title, p_description: description }),
  updateRequest: async (id: string, patch: { status?: string; assigned_to?: string | null }) => { const { error } = await db.from("client_requests").update(patch).eq("id", id); fail(error); },
  commentRequest: async (requestId: string, brandId: string, body: string, internal: boolean, fileId: string | null = null) => {
    const { error } = await db.from("client_request_events").insert({ request_id: requestId, brand_id: brandId, kind: "comment", body, internal, file_id: fileId, actor_id: (await supabase.auth.getUser()).data.user?.id });
    fail(error);
  },

  // ── Conversations ───────────────────────────────────────────────────────────────────────────────────────────────
  conversations: (brandIds: string[] | null) => rows<Conversation>(scoped(db.from("cos_conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(300), brandIds)),
  createConversation: async (row: { brand_id: string; project_id: string | null; contact_id: string | null; audience: string; subject: string }) => {
    const { data, error } = await db.from("cos_conversations").insert({ ...row, created_by: (await supabase.auth.getUser()).data.user?.id }).select("id").single();
    fail(error);
    return (data as { id: string }).id;
  },
  messages: (conversationId: string) => rows<Message>(db.from("cos_messages").select("*").eq("conversation_id", conversationId).order("created_at")),
  sendMessage: async (conversationId: string, brandId: string, body: string, internal: boolean, fileId: string | null = null) => {
    const { error } = await db.from("cos_messages").insert({ conversation_id: conversationId, brand_id: brandId, body, internal, file_id: fileId });
    fail(error);
  },

  // ── Files ───────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Upload in three steps: the server registers (and authorizes) the file and builds its path; the object is stored;
   *  the server confirms it exists. The browser never chooses a path. */
  upload: async (file: File, brandId: string, projectId: string | null, purpose: string, audience: string | null = null) => {
    if (file.size > MAX_FILE) throw new Error("Files are limited to 25 MB.");
    const reg = await rpc<{ id: string; path: string; bucket: string }>("cos_register_upload", { p_brand: brandId, p_project: projectId, p_purpose: purpose, p_file_name: file.name, p_mime: file.type || "application/octet-stream", p_size: file.size, p_audience: audience });
    const { error } = await supabase.storage.from(reg.bucket).upload(reg.path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`The upload failed: ${error.message}`);
    await rpc("cos_complete_upload", { p_file: reg.id });
    return reg.id;
  },
  /** A link valid for 60 seconds, only for a file the database says this person may read. */
  fileUrl: async (fileId: string, download = false) => {
    const { data, error } = await db.from("cos_files").select("object_path, file_name").eq("id", fileId).maybeSingle();
    fail(error);
    if (!data) throw new Error("This file is not available to you.");
    const f = data as { object_path: string; file_name: string };
    const r = await supabase.storage.from("client-os").createSignedUrl(f.object_path, 60, download ? { download: f.file_name } : undefined);
    if (r.error || !r.data) throw new Error("This file is not available to you.");
    return r.data.signedUrl;
  },
  files: (brandIds: string[] | null) => rows<FileRow>(scoped(db.from("cos_files").select("*").neq("status", "revoked").order("created_at", { ascending: false }).limit(500), brandIds)),
  shareFile: (fileId: string, membershipId: string, expires: string | null) => rpc<string>("cos_share_file", { p_file: fileId, p_membership: membershipId, p_expires: expires }),
  unshareFile: (shareId: string) => rpc("cos_unshare_file", { p_share: shareId }),
  fileShares: (brandIds: string[] | null) => rows<{ id: string; file_id: string; membership_id: string; expires_at: string | null; revoked_at: string | null; created_at: string }>(scoped(db.from("cos_file_shares").select("*"), brandIds)),
  revokeFile: (fileId: string) => rpc("cos_revoke_file", { p_file: fileId }),

  // ── Proposals, contracts, invoices ──────────────────────────────────────────────────────────────────────────────
  proposals: (brandIds: string[] | null) => rows<Proposal>(scoped(db.from("proposals").select("*").order("updated_at", { ascending: false }).limit(500), brandIds)),
  proposalItems: (id: string) => rows<ProposalItem>(db.from("proposal_items").select("*").eq("proposal_id", id).order("position")),
  proposalTotals: (id: string) => rpc<Totals | null>("cos_proposal_totals", { p_proposal: id }),
  proposalVersion: async (id: string, version: number) => {
    const { data, error } = await db.from("proposal_versions").select("snapshot, created_at").eq("proposal_id", id).eq("version", version).maybeSingle();
    fail(error);
    return (data as { snapshot: ProposalSnapshot; created_at: string } | null);
  },
  proposalEvents: (id: string) => rows<ProposalEvent>(db.from("proposal_events").select("*").eq("proposal_id", id).order("created_at")),
  saveProposal: async (p: Partial<Proposal> & { brand_id: string; contact_id: string }, items: ProposalItem[]) => {
    const { id, ...rest } = p;
    const fields = { brand_id: rest.brand_id, contact_id: rest.contact_id, reference: rest.reference, title: rest.title, summary: rest.summary ?? null, currency: rest.currency,
      payment_terms: rest.payment_terms ?? null, delivery_estimate: rest.delivery_estimate ?? null, terms: rest.terms ?? null, valid_until: rest.valid_until || null };
    let pid = id;
    if (pid) { const { error } = await db.from("proposals").update(fields).eq("id", pid); fail(error); }
    else { const { data, error } = await db.from("proposals").insert(fields).select("id").single(); fail(error); pid = (data as { id: string }).id; }
    const { error: delErr } = await db.from("proposal_items").delete().eq("proposal_id", pid);
    fail(delErr);
    if (items.length) {
      const { error } = await db.from("proposal_items").insert(items.map((it, i) => ({ proposal_id: pid, brand_id: rest.brand_id, position: i + 1, catalog_id: it.catalog_id, category: it.category,
        description: it.description, quantity: it.quantity, unit_price: it.unit_price, discount_pct: it.discount_pct || "0", tax_pct: it.tax_pct || "0" })));
      fail(error);
    }
    return pid!;
  },
  sendProposal: (id: string) => rpc<{ version: number; totals: Totals }>("cos_send_proposal", { p_id: id }),
  proposalAction: (id: string, action: "reopen" | "withdraw", note: string | null = null) => rpc("cos_proposal_action", { p_id: id, p_action: action, p_note: note }),
  proposalComment: (id: string, body: string) => rpc("cos_proposal_comment", { p_id: id, p_body: body }),
  proposalViewed: (id: string) => rpc("cos_proposal_viewed", { p_id: id }),
  decideProposal: (id: string, version: number, accept: boolean, note: string | null) => rpc<{ status: string }>("cos_decide_proposal", { p_id: id, p_version: version, p_accept: accept, p_note: note }),
  projectFromProposal: (id: string, name: string | null, deadline: string | null, share: boolean) => rpc<string>("cos_project_from_proposal", { p_id: id, p_name: name, p_deadline: deadline, p_share_with_client: share }),
  catalog: (brandIds: string[] | null) => rows<CatalogItem>(scoped(db.from("service_catalog").select("*").order("name"), brandIds)),
  saveCatalog: async (row: Partial<CatalogItem> & { brand_id: string }) => {
    const { id, ...rest } = row;
    const { error } = id ? await db.from("service_catalog").update(rest).eq("id", id) : await db.from("service_catalog").insert(rest);
    fail(error);
  },
  contracts: (brandIds: string[] | null) => rows<Contract>(scoped(db.from("contracts").select("*").order("updated_at", { ascending: false }).limit(500), brandIds)),
  saveContract: async (c: Partial<Contract> & { brand_id: string; contact_id: string; title: string; body: string }) => {
    const { id, ...rest } = c;
    const fields = { brand_id: rest.brand_id, contact_id: rest.contact_id, title: rest.title, body: rest.body, proposal_id: rest.proposal_id ?? null, project_id: rest.project_id ?? null, template_id: rest.template_id ?? null };
    if (id) { const { error } = await db.from("contracts").update({ title: fields.title, body: fields.body }).eq("id", id); fail(error); return id; }
    const { data, error } = await db.from("contracts").insert(fields).select("id").single();
    fail(error);
    return (data as { id: string }).id;
  },
  contractAction: (id: string, action: "send" | "reopen" | "cancel") => rpc<{ status: string }>("cos_contract_action", { p_id: id, p_action: action }),
  contractVersion: async (id: string, version: number) => {
    const { data, error } = await db.from("contract_versions").select("title, body, body_sha256, version, created_at").eq("contract_id", id).eq("version", version).maybeSingle();
    fail(error);
    return data as { title: string; body: string; body_sha256: string; version: number; created_at: string } | null;
  },
  contractEvents: (id: string) => rows<{ id: number; kind: string; version: number | null; body: string | null; actor_kind: string; created_at: string }>(db.from("contract_events").select("*").eq("contract_id", id).order("created_at")),
  decideContract: (id: string, version: number, approve: boolean, note: string | null) => rpc<{ status: string }>("cos_decide_contract", { p_id: id, p_version: version, p_approve: approve, p_note: note }),
  templates: () => rows<ContractTemplate>(db.from("contract_templates").select("id, brand_id, name, body").order("name")),
  saveTemplate: async (t: Partial<ContractTemplate> & { brand_id: string | null; name: string; body: string }) => {
    const { id, ...rest } = t;
    const { error } = id ? await db.from("contract_templates").update(rest).eq("id", id) : await db.from("contract_templates").insert(rest);
    fail(error);
  },
  invoices: (brandIds: string[] | null) => rows<{ id: string; brand_id: string; contact_id: string | null; number: string; amount: string; currency: string; status: string; issue_date: string; due_date: string | null }>(scoped(db.from("invoices").select("id, brand_id, contact_id, number, amount, currency, status, issue_date, due_date").order("issue_date", { ascending: false }).limit(500), brandIds)),
  invoiceShares: (brandIds: string[] | null) => rows<{ invoice_id: string; revoked_at: string | null; payment_instructions: string | null }>(scoped(db.from("cos_invoice_shares").select("invoice_id, revoked_at, payment_instructions"), brandIds)),
  shareInvoice: (id: string, share: boolean, instructions: string | null) => rpc("cos_share_invoice", { p_invoice: id, p_share: share, p_instructions: instructions }),

  // ── Insight ─────────────────────────────────────────────────────────────────────────────────────────────────────
  analytics: (brandId: string | null) => rpc<Analytics>("cos_analytics", { p_brand: brandId }),
  search: (q: string, kinds: string[] | null, limit = 20, offset = 0) => rpc<SearchHit[]>("cos_search", { p_q: q, p_kinds: kinds, p_limit: limit, p_offset: offset }),
  profiles: async (ids: string[]) => {
    if (!ids.length) return [] as { id: string; full_name: string | null; email: string | null }[];
    return rows<{ id: string; full_name: string | null; email: string | null }>(db.from("profiles").select("id, full_name, email").in("id", ids));
  },
  brandAdmins: (brandIds: string[] | null) => rows<{ user_id: string; brand_id: string; role: string; profile: { full_name: string | null; email: string | null } | null }>(scoped(db.from("brand_admins").select("user_id, brand_id, role, profile:profiles(full_name, email)"), brandIds)),

  // ── AI assistants (docs/client-os-ai.md) ───────────────────────────────────────────────────────────────────────
  aiConversations: (kind: "client" | "internal") => rows<AiConversation>(db.from("ai_conversations").select("id, kind, title, created_at, updated_at").eq("kind", kind).order("updated_at", { ascending: false }).limit(100)),
  aiMessages: (conversationId: string) => rows<AiMessage>(db.from("ai_messages").select("id, role, content, meta, created_at").eq("conversation_id", conversationId).order("created_at")),
  aiDeleteConversation: async (id: string) => { const { error } = await db.from("ai_conversations").delete().eq("id", id); fail(error); },
  aiProposals: (ids: string[]) => (ids.length ? rows<{ id: string; status: string; result: Record<string, unknown> | null; error: string | null }>(db.from("ai_action_proposals").select("id, status, result, error").in("id", ids)) : Promise.resolve([])),
  aiConfirm: (id: string, approve: boolean) => rpc<{ status: string; link?: string; error?: string }>("cai_confirm_action", { p_id: id, p_approve: approve }),
  aiAsk: async (body: { mode: "client" | "internal"; question: string; conversationId?: string | null; brandId?: string | null }) => {
    const { data, error } = await supabase.functions.invoke("client-os-ai/ask", { body });
    if (error) {
      let message = "The assistant could not be reached. Everything else in Client OS works as usual.";
      try { const ctx = (error as { context?: Response }).context; const payload = ctx ? await ctx.json() : null; if (payload?.error) message = payload.error; } catch { /* plain message */ }
      throw new Error(message);
    }
    return data as { conversationId: string; message: AiMessage };
  },

  // ── Portals ─────────────────────────────────────────────────────────────────────────────────────────────────────
  clientHome: () => rpc<ClientHome>("portal_client_home"),
  partnerHome: () => rpc<PartnerHome>("portal_partner_home"),
  portalProject: (id: string) => rpc<PortalProject>("portal_project", { p_project: id }),
  partnerAgreement: (id: string) => rpc<{ id: string; title: string; body: string; version: number; status: string; body_sha256: string } | null>("portal_partner_agreement", { p_contract: id }),
};

export interface AiConversation { id: string; kind: string; title: string; created_at: string; updated_at: string }
export interface AiProposalView { id: string; action_type: string; summary: string; preview: string[]; status: string }
export interface AiMessage {
  id: string; role: "user" | "assistant"; content: string; created_at: string;
  meta: { error?: string; links?: { label: string; path: string }[]; observations?: string[]; recommendations?: string[]; missing?: string[]; proposals?: AiProposalView[]; unverified?: string[]; rejected?: number;
    knowledge?: { title: string; section: string; brand: string; status: string; updated: string; source: string }[] } | null;
}
export interface Analytics {
  scope_brands: number;
  clients: { total: number; active: number; new_by_month: { month: string; count: number }[]; by_brand: { brand_id: string; brand: string; count: number }[]; with_project: number; repeat: number; retained: number; eligible_for_retention: number };
  projects: { active: number; completed: number; delayed: number; awaiting_approval: number; avg_delivery_days: number | null; completed_measured: number; avg_approval_hours: number | null; approvals_measured: number };
  proposals: { open: number; accepted: number; rejected: number; expired: number; conversion_pct: number | null };
  money: Record<string, { expected: number; contracted: number; invoiced: number; received: number; outstanding: number; overdue: number }>;
  revenue_by_client: { contact_id: string; client: string; currency: string; received: number }[];
  revenue_by_brand: { brand_id: string; brand: string; currency: string; received: number }[];
  contracted_by_category: { category: string; currency: string; amount: number }[];
  computed_at: string;
}

/** A proposal (frozen version) as a PDF: the same text and figures the client accepts. */
export const proposalPdf = (s: ProposalSnapshot, brand: string, client: string, version: number): Uint8Array<ArrayBuffer> => {
  const m = (v: string | number) => fmtMoney(v, s.currency);
  const lines: PdfLine[] = [
    { text: `${brand} · Proposal ${s.reference} (version ${version})`, size: 9 },
    { text: s.title, size: 16, bold: true, gap: 6 },
    { text: `For ${client} · valid until ${s.valid_until} · ${s.currency}`, size: 9, gap: 4 },
    ...(s.summary ? s.summary.split("\n").map((t) => ({ text: t, size: 10 })) : []),
    { text: "Items", size: 12, bold: true, gap: 10 },
    ...s.items.map((it) => ({ text: `${it.description}  ·  ${it.quantity} × ${m(it.unit_price)}${Number(it.discount_pct) ? `  −${it.discount_pct}%` : ""}${Number(it.tax_pct) ? `  +${it.tax_pct}% tax` : ""}`, size: 10 })),
    { text: `Subtotal ${m(s.totals.subtotal)}   Discount −${m(s.totals.discount)}   Tax ${m(s.totals.tax)}`, size: 10, gap: 8 },
    { text: `Total ${m(s.totals.total)}`, size: 13, bold: true },
    ...(s.payment_terms ? [{ text: "Payment terms", size: 11, bold: true, gap: 8 }, ...s.payment_terms.split("\n").map((t) => ({ text: t, size: 10 }))] : []),
    ...(s.delivery_estimate ? [{ text: `Delivery: ${s.delivery_estimate}`, size: 10, gap: 4 }] : []),
    ...(s.terms ? [{ text: "Terms", size: 11, bold: true, gap: 8 }, ...s.terms.split("\n").map((t) => ({ text: t, size: 9 }))] : []),
  ];
  return renderPdf(lines);
};

/** A contract version as a PDF (an approval record, not an electronic signature). */
export const contractPdf = (c: { title: string; body: string; version: number; body_sha256: string }, brand: string, client: string): Uint8Array<ArrayBuffer> =>
  renderPdf([
    { text: `${brand} · Contract version ${c.version}`, size: 9 },
    { text: c.title, size: 16, bold: true, gap: 6 },
    { text: `Client: ${client}`, size: 9, gap: 4 },
    ...c.body.split("\n").map((t) => ({ text: t, size: 10 })),
    { text: `Text fingerprint (SHA-256): ${c.body_sha256}`, size: 7, gap: 10 },
    { text: "Approval in the Houcine.world portal is an approval record, not an electronic signature.", size: 7 },
  ]);

export const downloadBytes = (name: string, bytes: Uint8Array<ArrayBuffer>) => {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

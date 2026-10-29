// The database adapter of Knowledge Studio: the four tables of supabase/migrations/20261030090000_knowledge_studio.sql,
// through the service-role client (they have no policy for anyone else). Optimistic concurrency is done in SQL: an
// update names the version it expects, so two admins can never silently overwrite each other.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import type { Actor, Draft, Feedback, KnowledgeEvent, Publication, Store } from "./core.ts";

const UNIQUE_VIOLATION = "23505";

export const createStore = (db: SupabaseClient): Store => {
  const draft = async (path: string): Promise<Draft | null> => {
    const { data } = await db.from("knowledge_drafts").select("*").eq("path", path).maybeSingle();
    return (data as Draft | null) ?? null;
  };

  return {
    async drafts() {
      const { data, error } = await db.from("knowledge_drafts").select("*").order("updated_at", { ascending: false }).limit(500);
      if (error) throw new Error("drafts_unreadable");
      return (data ?? []) as Draft[];
    },

    draft,

    async saveDraft(d, expectedVersion, actor: Actor) {
      const now = new Date().toISOString();
      const row = {
        operation: d.operation, content: d.content, target_path: d.target_path, base_sha: d.base_sha,
        original_input: d.original_input, updated_by: actor.id, updated_by_email: actor.email, updated_at: now,
      };
      if (expectedVersion === null) {
        const { data, error } = await db.from("knowledge_drafts").insert({ path: d.path, ...row, created_by: actor.id, version: 1 }).select("*").single();
        if (error) return { ok: false, current: error.code === UNIQUE_VIOLATION ? await draft(d.path) : null };
        return { ok: true, draft: data as Draft };
      }
      if (expectedVersion < 1) return { ok: false, current: await draft(d.path) };
      const { data, error } = await db
        .from("knowledge_drafts")
        .update({ ...row, version: expectedVersion + 1 })
        .eq("path", d.path)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle();
      if (error || !data) return { ok: false, current: await draft(d.path) };
      return { ok: true, draft: data as Draft };
    },

    async deleteDraft(path, expectedVersion) {
      let q = db.from("knowledge_drafts").delete().eq("path", path);
      if (expectedVersion !== null) q = q.eq("version", expectedVersion);
      const { data, error } = await q.select("path");
      return !error && Array.isArray(data) && data.length > 0;
    },

    async createPublication(p) {
      const { data, error } = await db.from("knowledge_publications").insert({ status: "committing", paths: p.paths, requested_by: p.requested_by }).select("*").single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) return null;
        throw new Error("publication_unwritable");
      }
      return data as Publication;
    },

    async updatePublication(id, patch) {
      const { data, error } = await db.from("knowledge_publications").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) return null; // e.g. the one-in-flight rule refused a retry while another publication runs
      return (data as Publication | null) ?? null;
    },

    async publication(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data } = await db.from("knowledge_publications").select("*").eq("id", id).maybeSingle();
      return (data as Publication | null) ?? null;
    },

    async publications(limit) {
      const { data } = await db.from("knowledge_publications").select("*").order("requested_at", { ascending: false }).limit(limit);
      return (data ?? []) as Publication[];
    },

    async addEvent(e) {
      const { error } = await db.from("knowledge_events").insert({
        actor: e.actor?.id ?? null, actor_email: e.actor?.email ?? null, kind: e.kind, path: e.path ?? null,
        publication_id: e.publication_id ?? null, detail: e.detail ?? {},
      });
      if (error) console.error("knowledge-studio: could not write an activity event", error.code ?? "");
    },

    async events({ before, path, limit }) {
      let q = db.from("knowledge_events").select("id, at, actor_email, kind, path, publication_id, detail").order("id", { ascending: false }).limit(limit);
      if (before !== undefined) q = q.lt("id", before);
      if (path) q = q.eq("path", path);
      const { data } = await q;
      return (data ?? []) as KnowledgeEvent[];
    },

    async addFeedback(f, actor) {
      const { data, error } = await db.from("knowledge_feedback").insert({ ...f, created_by: actor.id, created_by_email: actor.email }).select("*").single();
      if (error) throw new Error("feedback_unwritable");
      return data as Feedback;
    },

    async feedback(status, limit) {
      let q = db.from("knowledge_feedback").select("*").order("created_at", { ascending: false }).limit(limit);
      if (status === "open") q = q.eq("status", "open");
      const { data } = await q;
      return (data ?? []) as Feedback[];
    },

    async resolveFeedback(id, status, resolution, actor) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data } = await db
        .from("knowledge_feedback")
        .update({ status, resolution, resolved_by: actor.id, resolved_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      return (data as Feedback | null) ?? null;
    },
  };
};

-- Rollback of supabase/migrations/20261104100000_knowledge_os.sql (owner use only, run by hand; NOT a migration).
-- Removes the private knowledge store (documents, versions, reviews, links, retrieval analytics) and the kos_*
-- functions, and puts Autopilot's event list and monitoring tick back as they were. Export documents first if needed.
begin;
drop table if exists public.kos_retrievals, public.kos_links, public.kos_reviews, public.kos_versions, public.kos_documents cascade;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'kos\_%' loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;
create or replace function public.ap_event_types() returns text[] language sql immutable as $$
  select array['lead.created', 'lead.stage_changed', 'contact.created', 'project.created', 'project.status_changed',
    'task.created', 'task.completed', 'task.overdue', 'project.deadline_approaching', 'milestone.completed',
    'invoice.created', 'invoice.overdue', 'payment.recorded', 'expense.recorded', 'project.budget_threshold',
    'knowledge.publication_completed', 'knowledge.sync_failed',
    'client.invited', 'client.invitation_accepted', 'partner.invited', 'partner.invitation_accepted', 'project.client_added',
    'project.client_status_changed', 'proposal.sent', 'proposal.accepted', 'proposal.rejected', 'deliverable.submitted',
    'deliverable.approved', 'deliverable.revision_requested', 'deliverable.rejected', 'client.request_created',
    'client.request_resolved', 'contract.approved', 'partner.assigned', 'partner.access_revoked'];
$$;
create or replace function public.ap_tick(p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s record;
  res jsonb;
begin
  if not (is_super_admin() or exists (select 1 from brand_admins where user_id = auth.uid() and role = 'brand_admin')) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  select * into s from autopilot_state where id = 1 for update;
  if not p_force and s.last_scan_at > now() - interval '2 minutes' then
    return jsonb_build_object('ran', false, 'last_scan_at', s.last_scan_at);
  end if;
  res := ap_scan();
  update autopilot_state set last_scan_at = now(), last_scan_by = auth.uid(), last_scan_result = res where id = 1;
  return jsonb_build_object('ran', true, 'last_scan_at', now());
end $$;
commit;

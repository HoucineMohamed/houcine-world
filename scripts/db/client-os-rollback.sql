-- Rollback of the three Client OS migrations (supabase/migrations/20261102*_client_os_*.sql), for the owner's use only
-- (run by hand in the Supabase SQL editor; NOT a migration). Removes ONLY what Client OS created: its tables, functions,
-- storage policies, and the columns it added to projects and tasks. Run it BEFORE scripts/db/autopilot-rollback.sql if
-- that is removed too. Files already uploaded to the "client-os" bucket stay in storage (delete them there by hand
-- if wanted); the bucket itself is kept so no stored object is lost.
begin;
drop policy if exists "client_os_objects_insert" on storage.objects;
drop policy if exists "client_os_objects_select" on storage.objects;
drop table if exists public.contract_events, public.contract_versions, public.contracts, public.contract_templates,
  public.proposal_events, public.proposal_versions, public.proposal_items, public.proposals, public.service_catalog,
  public.cos_invoice_shares, public.cos_message_reads, public.cos_messages, public.cos_conversations,
  public.client_request_events, public.client_requests, public.deliverable_reviews, public.deliverable_versions, public.deliverables,
  public.cos_file_shares, public.cos_files, public.project_stage_history, public.partner_task_assignments, public.project_participants,
  public.portal_invitations, public.portal_memberships cascade;
alter table public.projects drop column if exists lifecycle_id, drop column if exists stage_key, drop column if exists stage_changed_at, drop column if exists client_summary;
alter table public.tasks drop column if exists client_visible;
drop table if exists public.lifecycle_stages, public.project_lifecycles cascade;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'cos\_%' or p.proname like 'portal\_%') loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;
-- Autopilot's event list without the Client OS events (as in 20261101100000_autopilot.sql).
create or replace function public.ap_event_types() returns text[] language sql immutable as $$
  select array['lead.created', 'lead.stage_changed', 'contact.created', 'project.created', 'project.status_changed',
    'task.created', 'task.completed', 'task.overdue', 'project.deadline_approaching', 'milestone.completed',
    'invoice.created', 'invoice.overdue', 'payment.recorded', 'expense.recorded', 'project.budget_threshold',
    'knowledge.publication_completed', 'knowledge.sync_failed'];
$$;
-- Notification links: back to the Workspace only. Existing portal notifications are kept (NOT VALID checks new rows only).
alter table public.user_notifications drop constraint if exists user_notifications_link_check;
alter table public.user_notifications add constraint user_notifications_link_check check (link is null or link ~ '^/workspace/') not valid;
commit;

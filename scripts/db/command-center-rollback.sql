-- Rollback of supabase/migrations/20261031100000_command_center.sql, for the owner's use only if the Command Center
-- must be removed (run by hand in the Supabase SQL editor; NOT a migration, so it never runs on its own).
-- It removes ONLY what that migration created. Existing tables (brands, brand_admins, bookings, audit_logs...) and their
-- rows are untouched; the Command Center's past entries in audit_logs stay as history.
-- WARNING: it deletes every contact, lead, project, task, invoice, payment and expense recorded in the Command Center.
-- Export them first (Command Center, Reports) if they matter.
begin;
drop function if exists public.create_contact(uuid, text, text, text, text, text, uuid, text, text, text, text[]);
drop function if exists public.convert_lead(uuid, text, date);
drop function if exists public.log_report(uuid, text, jsonb);
drop table if exists public.payments, public.expenses, public.invoices, public.tasks, public.milestones, public.project_members,
  public.interactions, public.lead_events cascade;
alter table if exists public.leads drop constraint if exists leads_converted_project_fkey;
drop table if exists public.projects, public.leads, public.contact_brands, public.contacts cascade;
drop function if exists public.cc_validate(), public.cc_audit(), public.cc_audit_value_keys(), public.cc_lead_stage(),
  public.cc_lead_event(), public.cc_append_only(), public.can_see_contact(uuid), public.cc_contact_in_brand(uuid, uuid),
  public.cc_user_in_brand(uuid, uuid);
commit;

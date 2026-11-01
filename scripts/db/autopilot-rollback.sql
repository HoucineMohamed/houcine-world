-- Rollback of supabase/migrations/20261101100000_autopilot.sql, for the owner's use only (run by hand in the Supabase
-- SQL editor; NOT a migration). Removes ONLY what Autopilot created: its tables (automations, executions, alerts,
-- notifications, proposals, jobs), its functions and its triggers on the Command Center tables and Knowledge Studio's
-- log. The Command Center, Knowledge Studio and audit_logs (with Autopilot's past entries) are untouched.
-- Run it BEFORE scripts/db/command-center-rollback.sql if both are removed.
begin;
do $$ declare t text; begin
  foreach t in array array['leads', 'contact_brands', 'projects', 'tasks', 'milestones', 'invoices', 'payments', 'expenses'] loop
    execute format('drop trigger if exists trg_%1$s_autopilot on public.%1$I', t);
  end loop;
end $$;
drop trigger if exists trg_knowledge_events_autopilot on public.knowledge_events;
drop table if exists public.assistant_proposals, public.automation_jobs, public.notification_preferences, public.user_notifications,
  public.ops_alerts, public.automation_run_actions, public.automation_runs, public.automation_versions, public.automations,
  public.automation_events, public.autopilot_state cascade;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'ap\_%' loop
    execute 'drop function if exists ' || f.sig;
  end loop;
end $$;
commit;

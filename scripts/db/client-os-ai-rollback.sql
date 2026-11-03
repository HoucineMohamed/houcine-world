-- Rollback of supabase/migrations/20261103100000_client_os_ai.sql (owner use only, run by hand; NOT a migration).
-- Removes the AI conversations, messages, activity log and action proposals, and the cai_* functions. Business
-- records created by confirmed actions (requests, tasks, drafts) and their audit entries are kept.
begin;
drop table if exists public.ai_action_proposals, public.ai_activity, public.ai_messages, public.ai_conversations cascade;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'cai\_%' loop
    execute 'drop function if exists ' || f.sig;
  end loop;
end $$;
commit;

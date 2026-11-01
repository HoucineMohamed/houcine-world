-- Client OS AI tests (supabase/migrations/20261103100000_client_os_ai.sql) on a real PostgreSQL, as signed-in users:
-- super admin, brand A admin, brand B admin, client A, client B, partner A, a revoked client, anonymous.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema caitest;
grant usage on schema caitest to authenticated, anon;
create table caitest.ids (name text primary key, id uuid);
grant select, insert on caitest.ids to authenticated, anon;
create function caitest.id(p text) returns uuid language sql stable as $$ select id from caitest.ids where name = p $$;
create function caitest.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'EXPECTED FAILURE did not happen: %', label;
end $$;
create function caitest.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', label; end if; end $$;
create function caitest.act(p text) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(caitest.id(p)::text, ''), false) $$;
grant execute on all functions in schema caitest to authenticated, anon;

-- Setup as the owner: two brands, people, client and partner memberships, a project each.
insert into public.brands (service_id, slug, name) select id, 'cai-a', 'CAI Brand A' from public.services where slug = 'studio';
insert into public.brands (service_id, slug, name) select id, 'cai-b', 'CAI Brand B' from public.services where slug = 'tech';
insert into caitest.ids select 'brand_a', id from public.brands where slug = 'cai-a';
insert into caitest.ids select 'brand_b', id from public.brands where slug = 'cai-b';
do $$ declare u text; begin
  foreach u in array array['super', 'admin_a', 'admin_b', 'client_a', 'client_b', 'partner_a', 'revoked'] loop
    insert into caitest.ids values (u, gen_random_uuid());
    insert into auth.users (id, email) values (caitest.id(u), 'cai.' || u || '@example.com');
  end loop;
end $$;
alter table public.profiles disable trigger trg_profiles_role_guard;
update public.profiles set platform_role = 'super_admin' where id = caitest.id('super');
alter table public.profiles enable trigger trg_profiles_role_guard;
insert into public.brand_admins (user_id, brand_id, role) values (caitest.id('admin_a'), caitest.id('brand_a'), 'brand_admin'), (caitest.id('admin_b'), caitest.id('brand_b'), 'brand_admin');
insert into public.contacts (name, email) values ('CAI Alice', 'cai.alice@contact.example.com'), ('CAI Bob', 'cai.bob@contact.example.com'), ('CAI Pat', 'cai.pat@contact.example.com'), ('CAI Rex', 'cai.rex@contact.example.com');
insert into caitest.ids select 'c_' || lower(split_part(name, ' ', 2)), id from public.contacts where email like 'cai.%@contact.example.com';
insert into public.contact_brands (contact_id, brand_id, status) values (caitest.id('c_alice'), caitest.id('brand_a'), 'client'), (caitest.id('c_bob'), caitest.id('brand_b'), 'client'),
  (caitest.id('c_pat'), caitest.id('brand_a'), 'partner'), (caitest.id('c_rex'), caitest.id('brand_a'), 'client');
insert into public.portal_memberships (kind, user_id, contact_id, brand_id) values
  ('client', caitest.id('client_a'), caitest.id('c_alice'), caitest.id('brand_a')), ('client', caitest.id('client_b'), caitest.id('c_bob'), caitest.id('brand_b')),
  ('partner', caitest.id('partner_a'), caitest.id('c_pat'), caitest.id('brand_a')), ('client', caitest.id('revoked'), caitest.id('c_rex'), caitest.id('brand_a'));
insert into public.projects (brand_id, client_contact_id, name, status, owner_id) values (caitest.id('brand_a'), caitest.id('c_alice'), 'CAI Alice Project', 'active', caitest.id('admin_a')),
  (caitest.id('brand_b'), caitest.id('c_bob'), 'CAI Bob Project', 'active', caitest.id('admin_b'));
insert into caitest.ids select 'p_alice', id from public.projects where name = 'CAI Alice Project';
insert into caitest.ids select 'p_bob', id from public.projects where name = 'CAI Bob Project';
insert into public.project_participants (project_id, brand_id, membership_id) select caitest.id('p_alice'), caitest.id('brand_a'), id from public.portal_memberships where user_id = caitest.id('client_a');
insert into public.project_participants (project_id, brand_id, membership_id) select caitest.id('p_bob'), caitest.id('brand_b'), id from public.portal_memberships where user_id = caitest.id('client_b');

set role authenticated;

-- ── Who may use which assistant ──────────────────────────────────────────────────────────────────────────────────────
select caitest.act('client_a');
select caitest.check('client A may use the client assistant only', public.cai_can_use('client') and not public.cai_can_use('internal'));
insert into public.ai_conversations (user_id, kind, title) values (auth.uid(), 'client', 'My project');
insert into caitest.ids select 'conv_a', id from public.ai_conversations where title = 'My project';
insert into public.ai_messages (conversation_id, user_id, role, content) values (caitest.id('conv_a'), auth.uid(), 'user', 'What is the status?');
select caitest.must_fail('client A opens an internal conversation', $$ insert into public.ai_conversations (user_id, kind) values (auth.uid(), 'internal') $$);
select caitest.must_fail('client A writes a conversation as someone else', $$ insert into public.ai_conversations (user_id, kind) values (caitest.id('client_b'), 'client') $$);
select caitest.act('partner_a');
select caitest.check('a partner may use neither assistant', not public.cai_can_use('client') and not public.cai_can_use('internal'));
select caitest.must_fail('a partner opens a client conversation', $$ insert into public.ai_conversations (user_id, kind) values (auth.uid(), 'client') $$);
select caitest.act('admin_a');
select caitest.check('brand A admin: internal assistant only', public.cai_can_use('internal') and not public.cai_can_use('client'));
insert into public.ai_conversations (user_id, kind, title) values (auth.uid(), 'internal', 'Pipeline');
insert into caitest.ids select 'conv_admin', id from public.ai_conversations where title = 'Pipeline';

-- ── Isolation of conversations ───────────────────────────────────────────────────────────────────────────────────────
select caitest.act('client_b');
select caitest.check('client B sees no other conversation or message', (select count(*) from public.ai_conversations) = 0 and (select count(*) from public.ai_messages) = 0);
select caitest.must_fail('client B writes into client A''s conversation', $$ insert into public.ai_messages (conversation_id, user_id, role, content) values (caitest.id('conv_a'), auth.uid(), 'user', 'hi') $$);
select caitest.act('admin_b');
select caitest.check('brand B admin sees no other conversation', (select count(*) from public.ai_conversations) = 0);
select caitest.act('super');
select caitest.check('even a super admin reads only their own conversations', (select count(*) from public.ai_conversations) = 0);
reset role;
set role anon;
select caitest.must_fail('anonymous reads conversations', $$ select count(*) from public.ai_conversations $$);
select caitest.must_fail('anonymous confirms an action', $$ select public.cai_confirm_action(gen_random_uuid(), true) $$);
set role authenticated;

-- ── Client actions: proposed, then executed only on confirmation, through the Client OS function ───────────────────
select caitest.act('client_a');
insert into public.ai_action_proposals (user_id, conversation_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), caitest.id('conv_a'), 'client', 'create_request', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_alice'), 'category', 'revision', 'title', 'Bigger logo', 'description', 'Please enlarge the logo'), 'Request a revision');
insert into caitest.ids select 'act_ok', id from public.ai_action_proposals where summary = 'Request a revision';
select caitest.check('nothing happens before confirmation', not exists (select 1 from public.client_requests where title = 'Bigger logo'));
select caitest.must_fail('a proposal cannot be stored as already executed', $$ insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary, status) values (auth.uid(), 'client', 'create_request', caitest.id('brand_a'), '{}', 'x', 'executed') $$);
select caitest.must_fail('a client proposal for another brand', $$ insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary) values (auth.uid(), 'client', 'create_request', caitest.id('brand_b'), '{}', 'x') $$);
select caitest.must_fail('a client cannot propose an internal action', $$ insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary) values (auth.uid(), 'client', 'create_task', caitest.id('brand_a'), '{}', 'x') $$);
-- A client proposal naming another client's project (brand B's, smuggled in the payload) fails on confirmation.
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), 'client', 'create_request', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_bob'), 'category', 'support', 'title', 'Smuggled', 'description', 'x'), 'Smuggled');
select caitest.check('a smuggled project id is refused at execution (status)', public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Smuggled'), true) ->> 'status' = 'failed');
select caitest.check('a smuggled project id is refused at execution', not exists (select 1 from public.client_requests where title = 'Smuggled'));
select caitest.act('client_b');
select caitest.must_fail('client B confirms client A''s proposal', $$ select public.cai_confirm_action(caitest.id('act_ok'), true) $$);
select caitest.act('client_a');
select caitest.check('confirmed: the request exists, created by client A (status)', public.cai_confirm_action(caitest.id('act_ok'), true) ->> 'status' = 'executed');
select caitest.check('confirmed: the request exists, created by client A', exists (select 1 from public.client_requests where title = 'Bigger logo' and created_by = caitest.id('client_a')));
select caitest.must_fail('a proposal is executed once', $$ select public.cai_confirm_action(caitest.id('act_ok'), true) $$);

-- ── Internal actions: brand-scoped, confirmed, audited ───────────────────────────────────────────────────────────────
select caitest.act('admin_a');
insert into public.ai_action_proposals (user_id, conversation_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), caitest.id('conv_admin'), 'internal', 'create_task', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_alice'), 'title', 'Call Alice about the logo'), 'Create a task');
select caitest.check('internal task created on confirmation (status)', public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Create a task'), true) ->> 'status' = 'executed');
select caitest.check('internal task created on confirmation', exists (select 1 from public.tasks where title = 'Call Alice about the logo'));
select caitest.must_fail('brand A admin proposes for brand B', $$ insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary) values (auth.uid(), 'internal', 'create_task', caitest.id('brand_b'), jsonb_build_object('project_id', caitest.id('p_bob')), 'x') $$);
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), 'internal', 'create_task', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_bob'), 'title', 'Cross-brand'), 'Cross');
select caitest.check('a brand B project in a brand A proposal is refused (status)', public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Cross'), true) ->> 'status' = 'failed');
select caitest.check('a brand B project in a brand A proposal is refused', not exists (select 1 from public.tasks where title = 'Cross-brand'));
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), 'internal', 'draft_automation', caitest.id('brand_a'), jsonb_build_object('name', 'AI draft', 'definition', jsonb_build_object('trigger', 'proposal.sent', 'actions', jsonb_build_array(jsonb_build_object('type', 'notify_admins', 'title', 'Proposal sent')))), 'Draft automation');
select public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Draft automation'), true);
select caitest.check('an AI automation is created as a draft, never active', (select status from public.automations where name = 'AI draft') = 'draft');
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary)
  values (auth.uid(), 'internal', 'send_reminder', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_alice'), 'body', 'Reminder: please review the homepage.'), 'Reminder');
select public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Reminder'), true);
select caitest.act('client_a');
select caitest.check('the reminder reaches the client in the portal (in-app)', exists (select 1 from public.cos_messages where body like 'Reminder: please review%'));
select caitest.act('admin_a');
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary) values (auth.uid(), 'internal', 'create_task', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_alice'), 'title', 'Declined one'), 'Decline me');
select public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Decline me'), false);
select caitest.check('a declined proposal changes nothing', not exists (select 1 from public.tasks where title = 'Declined one'));
reset role;
update public.ai_action_proposals set created_at = now() - interval '2 days' where summary = 'Decline me';
insert into public.ai_action_proposals (user_id, kind, action_type, brand_id, payload, summary, created_at) values (caitest.id('admin_a'), 'internal', 'create_task', caitest.id('brand_a'), jsonb_build_object('project_id', caitest.id('p_alice'), 'title', 'Stale'), 'Stale', now() - interval '2 days');
set role authenticated;
select caitest.act('admin_a');
select caitest.must_fail('a proposal older than 24 hours', $$ select public.cai_confirm_action((select id from public.ai_action_proposals where summary = 'Stale'), true) $$);
reset role;
select caitest.check('confirmed actions are audited with the confirming person', (select count(*) from public.audit_logs where action = 'ai.action_confirmed' and actor_id = caitest.id('admin_a')) = 3
  and exists (select 1 from public.audit_logs where action = 'ai.action_confirmed' and actor_id = caitest.id('client_a')));
set role authenticated;

-- ── Revocation: access ends at once, old conversations included ──────────────────────────────────────────────────────
select caitest.act('revoked');
insert into public.ai_conversations (user_id, kind, title) values (auth.uid(), 'client', 'Before revocation');
select caitest.act('admin_a');
select public.cos_set_membership_status((select id from public.portal_memberships where user_id = caitest.id('revoked')), 'revoked');
select caitest.act('revoked');
select caitest.check('a revoked client can no longer read their old conversation', (select count(*) from public.ai_conversations) = 0 and not public.cai_can_use('client'));
select caitest.must_fail('a revoked client cannot continue it', $$ insert into public.ai_messages (conversation_id, user_id, role, content) values ((select id from public.ai_conversations c where c.title = 'Before revocation' union all select gen_random_uuid() limit 1), auth.uid(), 'user', 'still there?') $$);
select caitest.must_fail('a revoked client cannot start a new one', $$ insert into public.ai_conversations (user_id, kind) values (auth.uid(), 'client') $$);

-- ── Activity log: own entries, append-only ───────────────────────────────────────────────────────────────────────────
select caitest.act('client_a');
insert into public.ai_activity (user_id, kind, event, conversation_id) values (auth.uid(), 'client', 'request', caitest.id('conv_a'));
select caitest.must_fail('client A logs as client B', $$ insert into public.ai_activity (user_id, kind, event) values (caitest.id('client_b'), 'client', 'request') $$);
select caitest.must_fail('the activity log is append-only', $$ delete from public.ai_activity $$);
select caitest.act('client_b');
select caitest.check('client B does not see client A''s activity', (select count(*) from public.ai_activity) = 0);
-- Clearing history: a person deletes their own conversations.
select caitest.act('client_a');
delete from public.ai_conversations where id = caitest.id('conv_a');
select caitest.check('history cleared', (select count(*) from public.ai_messages) = 0);
reset role;
\o
select 'ALL CLIENT OS AI DATABASE TESTS PASSED' as result;

-- Autopilot tests (supabase/migrations/20261101100000_autopilot.sql) on a real PostgreSQL with every migration applied,
-- acting as signed-in users like Supabase does. Run by scripts/db/test-command-center.sh after the Command Center tests.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema aptest;
grant usage on schema aptest to authenticated, anon;
create table aptest.ids (name text primary key, id uuid);
grant select, insert on aptest.ids to authenticated;
create function aptest.id(p text) returns uuid language sql stable as $$ select id from aptest.ids where name = p $$;
create function aptest.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'EXPECTED FAILURE did not happen: %', label;
end $$;
create function aptest.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', label; end if; end $$;
create function aptest.act(p text) returns void language sql as $$ select set_config('request.jwt.claim.sub', aptest.id(p)::text, false) $$;
grant execute on all functions in schema aptest to authenticated, anon;

-- Setup: brands A and B, users, memberships.
insert into aptest.ids select 'brand_a', id from public.brands where slug = 'la-rosa-view';
insert into public.brands (service_id, slug, name) select id, 'ap-brand-b', 'AP Brand B' from public.services where slug = 'tech';
insert into aptest.ids select 'brand_b', id from public.brands where slug = 'ap-brand-b';
do $$ declare u text; begin
  foreach u in array array['super', 'admin_a', 'editor_a', 'admin_b', 'multi'] loop
    insert into aptest.ids values (u, gen_random_uuid());
    insert into auth.users (id, email) values (aptest.id(u), 'ap.' || u || '@example.com');
  end loop;
end $$;
alter table public.profiles disable trigger trg_profiles_role_guard;
update public.profiles set platform_role = 'super_admin' where id = aptest.id('super');
alter table public.profiles enable trigger trg_profiles_role_guard;
insert into public.brand_admins (user_id, brand_id, role) values
  (aptest.id('admin_a'), aptest.id('brand_a'), 'brand_admin'), (aptest.id('editor_a'), aptest.id('brand_a'), 'editor'),
  (aptest.id('admin_b'), aptest.id('brand_b'), 'brand_admin'), (aptest.id('multi'), aptest.id('brand_a'), 'brand_admin'),
  (aptest.id('multi'), aptest.id('brand_b'), 'brand_admin');

-- ── Automations: who may create what; validation; versions ───────────────────────────────────────────────────
set role authenticated;
select aptest.act('admin_a');
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Unassigned leads', 'active',
  '{"trigger":"lead.created","match":"all","conditions":[{"field":"unassigned","op":"eq","value":"true"}],"actions":[{"type":"notify_admins","title":"New lead without owner: {name}","category":"leads"},{"type":"queue_assignment"}]}');
insert into aptest.ids select 'w_unassigned', id from public.automations where name = 'Unassigned leads';
select aptest.must_fail('unknown trigger', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"row.deleted","actions":[{"type":"add_activity"}]}') $$);
select aptest.must_fail('email without a provider', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"send_email"}]}') $$);
select aptest.must_fail('arbitrary action', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"run_sql","sql":"drop table leads"}]}') $$);
select aptest.must_fail('a status change that is not allowed', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"project.created","actions":[{"type":"set_status","to":"completed"}]}') $$);
select aptest.must_fail('an unknown condition field', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","conditions":[{"field":"password","op":"eq","value":"x"}],"actions":[{"type":"add_activity"}]}') $$);
select aptest.must_fail('a global automation by a brand admin', $$ insert into public.automations (brand_id, name, definition) values (null, 'x', '{"trigger":"lead.created","actions":[{"type":"add_activity"}]}') $$);
select aptest.must_fail('an automation for another brand', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_b'), 'x', '{"trigger":"lead.created","actions":[{"type":"add_activity"}]}') $$);
select aptest.must_fail('an alert with a notification category', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"create_alert","title":"t","category":"leads"}]}') $$);
select aptest.must_fail('a notification with an unknown category', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"notify_admins","title":"t","category":"secret"}]}') $$);
select aptest.must_fail('an unknown severity', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"create_alert","title":"t","severity":"panic"}]}') $$);
select aptest.must_fail('a task priority that tasks refuse', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"project.created","actions":[{"type":"create_task","title":"t","priority":"normal"}]}') $$);
update public.automations set definition = jsonb_set(definition, '{actions,0,priority}', '"high"') where id = aptest.id('w_unassigned');
select aptest.check('a changed definition is a new version', (select version from public.automations where id = aptest.id('w_unassigned')) = 2
  and (select count(*) from public.automation_versions where automation_id = aptest.id('w_unassigned')) = 2);
update public.automations set status = 'paused' where id = aptest.id('w_unassigned');
select aptest.check('a status change is not a new version', (select version from public.automations where id = aptest.id('w_unassigned')) = 2);
update public.automations set status = 'active' where id = aptest.id('w_unassigned');
select aptest.must_fail('versions are append-only', $$ update public.automation_versions set definition = '{}' $$);
select aptest.must_fail('moving an automation to another brand', $$ update public.automations set brand_id = aptest.id('brand_b') where id = aptest.id('w_unassigned') $$);
reset role;
set role authenticated;
select aptest.act('editor_a');
select aptest.must_fail('an editor creates an automation', $$ insert into public.automations (brand_id, name, definition) values (aptest.id('brand_a'), 'x', '{"trigger":"lead.created","actions":[{"type":"add_activity"}]}') $$);
select aptest.check('an editor sees no automation', (select count(*) from public.automations) = 0);
reset role;

-- ── Events -> conditions -> actions, once ────────────────────────────────────────────────────────────────────
set role authenticated;
select aptest.act('admin_a');
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Big leads', 'active',
  '{"trigger":"lead.created","conditions":[{"field":"amount","op":"gte","value":"1000"},{"field":"currency","op":"eq","value":"EUR"}],"actions":[{"type":"add_activity","title":"Big lead {name}"}]}');
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Broken', 'active',
  '{"trigger":"lead.created","conditions":[{"field":"amount","op":"gte","value":"1000"}],"actions":[{"type":"create_task","title":"impossible: no project"},{"type":"add_activity","title":"still runs"}]}');
insert into public.leads (brand_id, title, expected_value, currency) values (aptest.id('brand_a'), 'Small lead', 500, 'EUR');
insert into public.leads (brand_id, title, expected_value, currency) values (aptest.id('brand_a'), 'Big lead', 1500, 'EUR');
insert into aptest.ids select 'lead_big', id from public.leads where title = 'Big lead';
insert into aptest.ids select 'lead_small', id from public.leads where title = 'Small lead';
select aptest.check('conditions: the small lead skips "Big leads"', (select r.status from public.automation_runs r join public.automation_events e on e.id = r.event_id
  join public.automations a on a.id = r.automation_id where a.name = 'Big leads' and e.entity_id = aptest.id('lead_small')) = 'skipped');
select aptest.check('conditions: the big lead runs it', (select r.status from public.automation_runs r join public.automation_events e on e.id = r.event_id
  join public.automations a on a.id = r.automation_id where a.name = 'Big leads' and e.entity_id = aptest.id('lead_big')) = 'completed');
select aptest.check('unassigned leads: notified the brand admins of A only', (select count(*) from public.user_notifications) >= 1);
select aptest.check('unassigned leads: added to the assignment queue', (select count(*) from public.ops_alerts where rule = 'lead_unassigned' and entity_id = aptest.id('lead_big') and status = 'open') = 1);
select aptest.check('a failing action fails the execution, the lead is still saved, the other action ran',
  (select r.status = 'failed' and (select count(*) from public.automation_run_actions x where x.run_id = r.id and x.status = 'completed') = 1
   from public.automation_runs r join public.automations a on a.id = r.automation_id join public.automation_events e on e.id = r.event_id
   where a.name = 'Broken' and e.entity_id = aptest.id('lead_big')));
insert into aptest.ids select 'run_broken', r.id from public.automation_runs r join public.automations a on a.id = r.automation_id join public.automation_events e on e.id = r.event_id where a.name = 'Broken' and e.entity_id = aptest.id('lead_big');
select public.ap_retry(aptest.id('run_broken'));
select aptest.check('a retry repeats only the failed action', (select count(*) from public.automation_run_actions where run_id = aptest.id('run_broken') and action_type = 'add_activity') = 1
  and (select attempts from public.automation_runs where id = aptest.id('run_broken')) = 2);
select aptest.check('automated actions are marked in the audit', exists (select 1 from public.audit_logs where action = 'autopilot.action' and (metadata ->> 'automated')::boolean and actor_id is null));
select aptest.check('engine internals are not callable', true);
select aptest.must_fail('calling the engine directly', $$ select public.ap_execute(aptest.id('run_broken'), true) $$);
select aptest.must_fail('emitting a fake event', $$ select public.ap_emit('lead.created', aptest.id('brand_a'), 'lead', aptest.id('lead_big'), '{}', 'x') $$);
reset role;
-- Duplicate events never run twice (as the owner, who could).
select aptest.check('the same event is recorded once', public.ap_emit('lead.created', aptest.id('brand_a'), 'lead', aptest.id('lead_big'), '{}', 'lead.created:' || aptest.id('lead_big')) is null);
select aptest.check('dispatching an event again runs nothing new', public.ap_dispatch((select id from public.automation_events where dedupe_key = 'lead.created:' || aptest.id('lead_big'))) = 0);
update public.automation_runs set attempts = 5 where id = aptest.id('run_broken');
set role authenticated;
select aptest.act('admin_a');
select aptest.must_fail('retry limit', $$ select public.ap_retry(aptest.id('run_broken')) $$);
reset role;

-- ── Approval ─────────────────────────────────────────────────────────────────────────────────────────────────
set role authenticated;
select aptest.act('admin_a');
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Needs approval', 'active',
  '{"trigger":"project.created","requires_approval":true,"actions":[{"type":"create_task","title":"Kick-off for {name}","due_in_days":3}]}');
insert into public.projects (brand_id, name, status, currency, budget, deadline) values (aptest.id('brand_a'), 'Gala', 'active', 'EUR', 1000, public.ap_today() + 5);
insert into aptest.ids select 'project_a', id from public.projects where name = 'Gala';
insert into aptest.ids select 'run_approval', r.id from public.automation_runs r join public.automations a on a.id = r.automation_id where a.name = 'Needs approval';
select aptest.check('waiting for approval, nothing done yet', (select status from public.automation_runs where id = aptest.id('run_approval')) = 'awaiting_approval'
  and not exists (select 1 from public.tasks where title = 'Kick-off for Gala'));
reset role;
set role authenticated;
select aptest.act('admin_b');
select aptest.must_fail('B approves an A execution', $$ select public.ap_decide(aptest.id('run_approval'), true) $$);
select aptest.check('B sees nothing of A: automations, runs, events, alerts, notifications',
  (select count(*) from public.automations) + (select count(*) from public.automation_runs) + (select count(*) from public.automation_events)
  + (select count(*) from public.ops_alerts) + (select count(*) from public.user_notifications) + (select count(*) from public.automation_run_actions) = 0);
update public.automations set status = 'paused' where id = aptest.id('w_unassigned');
select aptest.must_fail('B tests an A automation', $$ select public.ap_test(aptest.id('w_unassigned'), 1) $$);
select aptest.must_fail('B retries an A execution', $$ select public.ap_retry(aptest.id('run_broken')) $$);
reset role;
select aptest.check('B could not pause A''s automation', (select status from public.automations where id = aptest.id('w_unassigned')) = 'active');
set role authenticated;
select aptest.act('admin_a');
select public.ap_decide(aptest.id('run_approval'), true);
select aptest.check('approved: the action ran', exists (select 1 from public.tasks where title = 'Kick-off for Gala') and (select status from public.automation_runs where id = aptest.id('run_approval')) = 'completed');
select aptest.check('changes made by an automation are marked in the Command Center audit', exists (select 1 from public.audit_logs where action = 'task.created' and (metadata ->> 'automated')::boolean));

-- ── Budget threshold, currencies apart ───────────────────────────────────────────────────────────────────────
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Budget watch', 'active',
  '{"trigger":"project.budget_threshold","conditions":[{"field":"budget_use_pct","op":"gte","value":"90"}],"actions":[{"type":"create_alert","title":"Budget at {budget_use_pct}%: {name}","severity":"high","category":"finance"}]}');
insert into public.expenses (brand_id, project_id, amount, currency, incurred_on) values (aptest.id('brand_a'), aptest.id('project_a'), 5000, 'USD', public.ap_today());
select aptest.check('a USD cost never counts against a EUR budget', not exists (select 1 from public.automation_events where event_type = 'project.budget_threshold' and entity_id = aptest.id('project_a')));
insert into public.expenses (brand_id, project_id, amount, currency, incurred_on) values (aptest.id('brand_a'), aptest.id('project_a'), 950, 'EUR', public.ap_today());
select aptest.check('a EUR cost at 95% opens the budget alert', exists (select 1 from public.ops_alerts where title = 'Budget at 95.0%: Gala'));

-- ── Monitoring: overdue task, one alert, resolved when done ──────────────────────────────────────────────────
insert into public.tasks (project_id, brand_id, title, due_date) values (aptest.id('project_a'), aptest.id('brand_a'), 'Late playlist', public.ap_today() - 2);
insert into aptest.ids select 'task_late', id from public.tasks where title = 'Late playlist';
select public.ap_tick(true);
select public.ap_tick(true);
select aptest.check('overdue task: exactly one open alert after two scans', (select count(*) from public.ops_alerts where rule = 'task_overdue' and entity_id = aptest.id('task_late')) = 1);
select aptest.check('overdue task: the time event was recorded once', (select count(*) from public.automation_events where event_type = 'task.overdue' and entity_id = aptest.id('task_late')) = 1);
select aptest.check('deadline approaching: alert and event', exists (select 1 from public.ops_alerts where rule = 'project_deadline_soon' and entity_id = aptest.id('project_a'))
  and exists (select 1 from public.automation_events where event_type = 'project.deadline_approaching'));
update public.tasks set status = 'done' where id = aptest.id('task_late');
select public.ap_tick(true);
select aptest.check('a resolved condition resolves its alert', (select status from public.ops_alerts where rule = 'task_overdue' and entity_id = aptest.id('task_late')) = 'resolved');
select aptest.check('the failed execution is a system alert', exists (select 1 from public.ops_alerts where rule = 'automation_failed' and status = 'open'));
insert into aptest.ids select 'alert_dl', id from public.ops_alerts where rule = 'project_deadline_soon' and entity_id = aptest.id('project_a');
select public.ap_set_alert(aptest.id('alert_dl'), 'dismissed');
select aptest.check('an alert can be dismissed', (select status from public.ops_alerts where id = aptest.id('alert_dl')) = 'dismissed');
select public.ap_tick(true);
select aptest.check('a dismissed alert stays dismissed while its condition lasts', (select count(*) from public.ops_alerts where rule = 'project_deadline_soon' and entity_id = aptest.id('project_a')) = 1
  and (select status from public.ops_alerts where id = aptest.id('alert_dl')) = 'dismissed');
select aptest.check('no second notification for a dismissed alert', (select count(*) from public.user_notifications where title like 'Deadline in % days:%' and user_id = aptest.id('admin_a') and source = 'monitor') <= 1);
reset role;
update public.projects set deadline = public.ap_today() + 30 where id = aptest.id('project_a');
set role authenticated;
select public.ap_tick(true);
select aptest.check('the condition ended: the dismissed alert is re-armed', (select resolved_at is not null from public.ops_alerts where id = aptest.id('alert_dl')));
reset role;
update public.projects set deadline = public.ap_today() + 5 where id = aptest.id('project_a');
set role authenticated;
select public.ap_tick(true);
select aptest.check('a new occurrence after re-arming opens a new alert', exists (select 1 from public.ops_alerts where rule = 'project_deadline_soon' and entity_id = aptest.id('project_a') and status = 'open'));
select aptest.must_fail('writing an alert directly', $$ insert into public.ops_alerts (rule, entity_key, category, severity, title) values ('x', 'x', 'crm', 'low', 'x') $$);

-- Invoice overdue: alert, event, and a follow-up draft job (never sent to anyone).
insert into public.automations (brand_id, name, status, definition) values (aptest.id('brand_a'), 'Overdue invoices', 'active',
  '{"trigger":"invoice.overdue","conditions":[{"field":"outstanding","op":"gt","value":"0"}],"actions":[{"type":"notify_admins","title":"Overdue: {name}","category":"finance","priority":"high"},{"type":"followup_draft"}]}');
insert into public.invoices (brand_id, number, issue_date, due_date, amount, currency, status) values (aptest.id('brand_a'), 'AP-1', public.ap_today() - 40, public.ap_today() - 10, 800, 'EUR', 'sent');
select public.ap_tick(true);
select aptest.check('invoice overdue: alert, event, and a draft job', exists (select 1 from public.ops_alerts where rule = 'invoice_overdue' and status = 'open')
  and exists (select 1 from public.automation_jobs where kind = 'followup_draft' and status = 'pending'));
reset role;
set role authenticated;
select aptest.act('admin_b');
select aptest.check('B cannot claim A''s AI jobs', (select count(*) from public.ap_claim_jobs(5)) = 0);
reset role;
set role authenticated;
select aptest.act('admin_a');
select aptest.check('A claims its AI job', (select count(*) from public.ap_claim_jobs(5)) = 1);
select public.ap_complete_job((select id from public.automation_jobs where kind = 'followup_draft'), 'Dear client, a gentle reminder…', null);
select aptest.check('the draft arrives as a notification marked "not sent"', exists (select 1 from public.user_notifications where title like 'Suggested follow-up message (draft, not sent)%'));

-- ── Notifications ────────────────────────────────────────────────────────────────────────────────────────────
update public.user_notifications set read_at = now();
select aptest.check('marking read works', (select count(*) from public.user_notifications where read_at is null) = 0);
select aptest.must_fail('changing a notification''s text', $$ update public.user_notifications set title = 'x' $$);
insert into public.notification_preferences (user_id, muted_categories) values (aptest.id('admin_a'), array['leads']);
reset role;
set role authenticated;
select aptest.act('multi');
select aptest.check('the other admin of A got the same notifications', (select count(*) from public.user_notifications where brand_id = aptest.id('brand_a')) >= 1);
update public.user_notifications set read_at = null;
reset role;
select aptest.check('a user cannot touch another user''s notifications', (select count(*) from public.user_notifications where user_id = aptest.id('admin_a') and read_at is null) = 0);
set role authenticated;
select aptest.act('admin_a');
insert into public.leads (brand_id, title) values (aptest.id('brand_a'), 'Muted lead');
select aptest.check('a muted category is not notified', not exists (select 1 from public.user_notifications where title like '%Muted lead%'));
reset role;
select aptest.check('the unmuted admin still was', exists (select 1 from public.user_notifications where user_id = aptest.id('multi') and title like '%Muted lead%'));
select aptest.check('nobody outside brand A was notified about it', not exists (select 1 from public.user_notifications where title like '%Muted lead%' and user_id in (aptest.id('admin_b'), aptest.id('editor_a'))));

-- ── AI proposals: confirmed actions only, re-checked ─────────────────────────────────────────────────────────
set role authenticated;
select aptest.act('admin_a');
insert into public.assistant_proposals (user_id, brand_id, action_type, target_type, target_id, params, summary)
values (aptest.id('admin_a'), aptest.id('brand_a'), 'assign_lead', 'lead', aptest.id('lead_big'), jsonb_build_object('owner_id', aptest.id('editor_a')), 'Assign the big lead');
select public.ap_confirm_proposal((select id from public.assistant_proposals where summary = 'Assign the big lead'), true);
select aptest.check('confirmed: the lead has its owner', (select owner_id from public.leads where id = aptest.id('lead_big')) = aptest.id('editor_a'));
select aptest.check('the confirmation is audited with confirmed_by', exists (select 1 from public.audit_logs where action = 'assistant.action' and metadata ->> 'confirmed_by' = aptest.id('admin_a')::text));
select aptest.must_fail('confirming twice', $$ select public.ap_confirm_proposal((select id from public.assistant_proposals where summary = 'Assign the big lead'), true) $$);
reset role;
set role authenticated;
select aptest.act('admin_b');
insert into public.leads (brand_id, title) values (aptest.id('brand_b'), 'B lead');
reset role;
insert into aptest.ids select 'lead_b', id from public.leads where title = 'B lead';
set role authenticated;
select aptest.act('admin_a');
insert into public.assistant_proposals (user_id, brand_id, action_type, target_type, target_id, params, summary)
values (aptest.id('admin_a'), aptest.id('brand_a'), 'assign_lead', 'lead', aptest.id('lead_b'), jsonb_build_object('owner_id', aptest.id('admin_a')), 'Grab B lead');
select public.ap_confirm_proposal((select id from public.assistant_proposals where summary = 'Grab B lead'), true);
select aptest.check('a proposal pointing at another brand''s record fails', (select status from public.assistant_proposals where summary = 'Grab B lead') = 'failed');
select aptest.must_fail('a proposal for a brand one does not manage', $$ insert into public.assistant_proposals (user_id, brand_id, action_type, target_type, target_id, summary) values (aptest.id('admin_a'), aptest.id('brand_b'), 'create_task', 'project', aptest.id('lead_b'), 'x') $$);
select aptest.must_fail('a proposal in someone else''s name', $$ insert into public.assistant_proposals (user_id, brand_id, action_type, target_type, target_id, summary) values (aptest.id('multi'), aptest.id('brand_a'), 'create_task', 'project', aptest.id('project_a'), 'x') $$);
reset role;
select aptest.check('the B lead kept no owner', (select owner_id from public.leads where id = aptest.id('lead_b')) is null);

-- ── Knowledge Studio events (global) ─────────────────────────────────────────────────────────────────────────
set role authenticated;
select aptest.act('super');
insert into public.automations (brand_id, name, status, definition) values (null, 'Knowledge failures', 'active',
  '{"trigger":"knowledge.sync_failed","actions":[{"type":"create_alert","title":"Knowledge sync failed","severity":"high","category":"system"}]}');
reset role;
insert into public.knowledge_publications (id, status, requested_by, paths) values (gen_random_uuid(), 'failed', aptest.id('super'), '{}');
insert into public.knowledge_events (kind, publication_id, detail) values ('publish_failed', (select id from public.knowledge_publications limit 1), '{"code":"deploy_failed"}');
select aptest.check('knowledge failure: event, global automation run, super admin notified',
  exists (select 1 from public.automation_events where event_type = 'knowledge.sync_failed')
  and exists (select 1 from public.automation_runs r join public.automations a on a.id = r.automation_id where a.name = 'Knowledge failures' and r.status = 'completed')
  and exists (select 1 from public.user_notifications where user_id = aptest.id('super') and category = 'knowledge'));
set role authenticated;
select aptest.act('admin_a');
select public.ap_tick(true);
select aptest.check('brand admins see no global alert or event', (select count(*) from public.ops_alerts where brand_id is null) = 0 and (select count(*) from public.automation_events where brand_id is null) = 0);
select aptest.act('super');
select aptest.check('the super admin sees the global knowledge alert', exists (select 1 from public.ops_alerts where rule = 'knowledge_sync_failed' and status = 'open'));
reset role;
set role anon;
select aptest.must_fail('anon reads alerts', $$ select count(*) from public.ops_alerts $$);
select aptest.must_fail('anon runs a scan', $$ select public.ap_tick(true) $$);
reset role;
\o
select 'ALL AUTOPILOT DATABASE TESTS PASSED' as result;

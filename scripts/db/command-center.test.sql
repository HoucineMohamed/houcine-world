-- Command Center security and behaviour tests, run against a local PostgreSQL with every migration applied
-- (scripts/db/test-command-center.sh). Each block acts as a signed-in user exactly as Supabase does (role
-- "authenticated" and the user's id as the JWT subject), so row-level security, triggers and functions are the
-- real ones. Any failed expectation stops the run with an error naming it.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null

create schema cctest;
grant usage on schema cctest to authenticated, anon;
create table cctest.ids (name text primary key, id uuid);
grant select on cctest.ids to authenticated;
create function cctest.id(p text) returns uuid language sql stable as $$ select id from cctest.ids where name = p $$;
grant execute on function cctest.id(text) to authenticated;
-- Run a statement and require it to fail.
create function cctest.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'EXPECTED FAILURE did not happen: %', label;
end $$;
create function cctest.check(label text, ok boolean) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'CHECK FAILED: %', label; end if;
end $$;
grant execute on function cctest.must_fail(text, text), cctest.check(text, boolean) to authenticated, anon;
create function cctest.act(p text) returns void language sql as $$ select set_config('request.jwt.claim.sub', cctest.id(p)::text, false) $$;
grant execute on function cctest.act(text) to authenticated;

-- ── Setup (as the database owner): users, a second brand, memberships ──────────────────────────────────────────
insert into cctest.ids select 'brand_a', id from public.brands where slug = 'la-rosa-view';
insert into public.brands (service_id, slug, name) select id, 'test-brand-b', 'Brand B' from public.services where slug = 'studio';
insert into cctest.ids select 'brand_b', id from public.brands where slug = 'test-brand-b';
do $$
declare u text;
begin
  foreach u in array array['super', 'admin_a', 'editor_a', 'viewer_a', 'admin_b', 'multi'] loop
    insert into cctest.ids values (u, gen_random_uuid());
    insert into auth.users (id, email) values (cctest.id(u), u || '@example.com');
  end loop;
end $$;
alter table public.profiles disable trigger trg_profiles_role_guard;
update public.profiles set platform_role = 'super_admin' where id = cctest.id('super');
alter table public.profiles enable trigger trg_profiles_role_guard;
insert into public.brand_admins (user_id, brand_id, role) values
  (cctest.id('admin_a'), cctest.id('brand_a'), 'brand_admin'),
  (cctest.id('editor_a'), cctest.id('brand_a'), 'editor'),
  (cctest.id('viewer_a'), cctest.id('brand_a'), 'viewer'),
  (cctest.id('admin_b'), cctest.id('brand_b'), 'brand_admin'),
  (cctest.id('multi'), cctest.id('brand_a'), 'brand_admin'),
  (cctest.id('multi'), cctest.id('brand_b'), 'brand_admin');
grant insert on cctest.ids to authenticated;

-- ── Brand A admin: CRM, pipeline, conversion ───────────────────────────────────────────────────────────────────
set role authenticated;
select cctest.act('admin_a');
insert into cctest.ids select 'contact_a', public.create_contact(cctest.id('brand_a'), 'Client A', 'person', 'client', 'client.a@example.com', null, null, 'prospect', 'website');
-- Same email again: the same identity, no duplicate.
select cctest.check('create_contact deduplicates by email',
  public.create_contact(cctest.id('brand_a'), 'Client A again', 'person', 'client', 'CLIENT.A@example.com') = cctest.id('contact_a'));
select cctest.check('one identity', (select count(*) from public.contacts where lower(email) = 'client.a@example.com') = 1);
select cctest.must_fail('create a contact for another brand', $$ select public.create_contact(cctest.id('brand_b'), 'X') $$);

insert into public.leads (brand_id, contact_id, title, expected_value, currency, source)
values (cctest.id('brand_a'), cctest.id('contact_a'), 'Wedding set', 1200, 'EUR', 'website');
insert into cctest.ids select 'lead_a', id from public.leads where title = 'Wedding set';
select cctest.must_fail('a lead in a brand without access', $$ insert into public.leads (brand_id, title) values (cctest.id('brand_b'), 'X') $$);
select cctest.must_fail('an amount without a currency', $$ insert into public.leads (brand_id, title, expected_value) values (cctest.id('brand_a'), 'X', 10) $$);
select cctest.must_fail('converting a lead that is not won', $$ select public.convert_lead(cctest.id('lead_a')) $$);
update public.leads set stage = 'contacted' where id = cctest.id('lead_a');
update public.leads set stage = 'won' where id = cctest.id('lead_a');
select cctest.check('every stage is in the history', (select array_agg(to_stage order by id) from public.lead_events where lead_id = cctest.id('lead_a')) = array['new', 'contacted', 'won']);
select cctest.check('won_at is set', (select won_at is not null from public.leads where id = cctest.id('lead_a')));
select cctest.must_fail('stage history is append-only (update)', $$ update public.lead_events set to_stage = 'lost' $$);
select cctest.must_fail('stage history is append-only (insert)', $$ insert into public.lead_events (lead_id, brand_id, to_stage) values (cctest.id('lead_a'), cctest.id('brand_a'), 'won') $$);
insert into cctest.ids select 'project_a', public.convert_lead(cctest.id('lead_a'), 'Wedding 2027', null);
select cctest.check('conversion links the project', (select converted_project_id from public.leads where id = cctest.id('lead_a')) = cctest.id('project_a'));
select cctest.check('the contact became a client', (select status from public.contact_brands where contact_id = cctest.id('contact_a') and brand_id = cctest.id('brand_a')) = 'client');
select cctest.check('the project takes the lead value as budget', (select budget = 1200 and currency = 'EUR' from public.projects where id = cctest.id('project_a')));
select cctest.must_fail('converting twice', $$ select public.convert_lead(cctest.id('lead_a')) $$);
select cctest.must_fail('moving a record to another brand', $$ update public.leads set brand_id = cctest.id('brand_b') where id = cctest.id('lead_a') $$);

-- Tasks take the project's brand, whatever the request says; completion follows status.
insert into public.tasks (project_id, brand_id, title) values (cctest.id('project_a'), cctest.id('brand_b'), 'Playlist');
select cctest.check('task brand comes from the project', (select brand_id from public.tasks where title = 'Playlist') = cctest.id('brand_a'));
update public.tasks set status = 'done' where title = 'Playlist';
select cctest.check('completed_at follows done', (select completed_at is not null from public.tasks where title = 'Playlist'));

-- Finance: currency and amounts are checked.
insert into public.invoices (brand_id, contact_id, project_id, number, issue_date, due_date, amount, currency, status)
values (cctest.id('brand_a'), cctest.id('contact_a'), cctest.id('project_a'), 'A-001', '2026-10-01', '2026-10-31', 1000, 'EUR', 'sent');
insert into cctest.ids select 'invoice_a', id from public.invoices where number = 'A-001';
select cctest.must_fail('a payment in another currency', $$ insert into public.payments (brand_id, invoice_id, amount, currency, received_on) values (cctest.id('brand_a'), cctest.id('invoice_a'), 100, 'USD', '2026-10-05') $$);
insert into public.payments (brand_id, invoice_id, amount, currency, received_on) values (cctest.id('brand_a'), cctest.id('invoice_a'), 400, 'EUR', '2026-10-05');
select cctest.must_fail('overpaying an invoice', $$ insert into public.payments (brand_id, invoice_id, amount, currency, received_on) values (cctest.id('brand_a'), cctest.id('invoice_a'), 700, 'EUR', '2026-10-06') $$);
select cctest.must_fail('an unknown currency', $$ insert into public.expenses (brand_id, amount, currency, incurred_on) values (cctest.id('brand_a'), 10, 'GBP', '2026-10-01') $$);
insert into public.expenses (brand_id, project_id, amount, currency, incurred_on, category) values (cctest.id('brand_a'), cctest.id('project_a'), 150, 'EUR', '2026-10-02', 'equipment');

select cctest.check('the audit trail keeps the old and new stage', (select metadata -> 'old' ->> 'stage' = 'contacted' and metadata -> 'new' ->> 'stage' = 'won' from public.audit_logs where action = 'lead.stage_changed' and entity_id = cctest.id('lead_a') order by created_at desc, id desc limit 1));
select cctest.check('activity is recorded for the brand', (select count(*) from public.audit_logs where brand_id = cctest.id('brand_a') and action in ('lead.stage_changed', 'lead.converted', 'payment.created', 'task.completed')) >= 4);
select cctest.must_fail('audit history cannot be changed', $$ update public.audit_logs set action = 'x' $$);
select cctest.must_fail('audit history cannot be written directly', $$ insert into public.audit_logs (action) values ('x') $$);
select cctest.must_fail('audit history cannot be deleted', $$ delete from public.audit_logs $$);
select public.log_report(cctest.id('brand_a'), 'revenue', '{"from":"2026-10-01"}');
select cctest.must_fail('a global report by a brand admin', $$ select public.log_report(null, 'revenue') $$);
reset role;

-- ── Brand B admin: nothing of brand A, by any identifier ───────────────────────────────────────────────────────
set role authenticated;
select cctest.act('admin_b');
select cctest.check('B sees no A lead', (select count(*) from public.leads) = 0);
select cctest.check('B sees no A contact', (select count(*) from public.contacts) = 0);
select cctest.check('B sees no A project, task, invoice, payment, expense', (select count(*) from public.projects) + (select count(*) from public.tasks) + (select count(*) from public.invoices) + (select count(*) from public.payments) + (select count(*) from public.expenses) = 0);
select cctest.check('B sees no A activity', (select count(*) from public.audit_logs where brand_id = cctest.id('brand_a')) = 0);
select cctest.check('B sees no A stage history', (select count(*) from public.lead_events) = 0);
update public.leads set title = 'hacked' where id = cctest.id('lead_a');
delete from public.projects where id = cctest.id('project_a');
select cctest.must_fail('B links an A contact to brand B', $$ insert into public.contact_brands (contact_id, brand_id) values (cctest.id('contact_a'), cctest.id('brand_b')) $$);
select cctest.must_fail('B uses an A contact on a B lead', $$ insert into public.leads (brand_id, contact_id, title) values (cctest.id('brand_b'), cctest.id('contact_a'), 'X') $$);
select cctest.must_fail('B adds a task to an A project', $$ insert into public.tasks (project_id, brand_id, title) values (cctest.id('project_a'), cctest.id('brand_b'), 'X') $$);
select cctest.must_fail('B records a payment on an A invoice', $$ insert into public.payments (brand_id, invoice_id, amount, currency, received_on) values (cctest.id('brand_b'), cctest.id('invoice_a'), 1, 'EUR', '2026-10-07') $$);
select cctest.must_fail('B converts an A lead', $$ select public.convert_lead(cctest.id('lead_a')) $$);
select cctest.must_fail('B creates a project with an A lead', $$ insert into public.projects (brand_id, lead_id, name) values (cctest.id('brand_b'), cctest.id('lead_a'), 'X') $$);
reset role;
select cctest.check('A data untouched by B', (select title from public.leads where id = cctest.id('lead_a')) = 'Wedding set' and exists (select 1 from public.projects where id = cctest.id('project_a')));

-- ── Roles inside brand A ───────────────────────────────────────────────────────────────────────────────────────
set role authenticated;
select cctest.act('viewer_a');
select cctest.check('a viewer reads the brand''s leads', (select count(*) from public.leads) = 1);
select cctest.must_fail('a viewer cannot create a lead', $$ insert into public.leads (brand_id, title) values (cctest.id('brand_a'), 'X') $$);
select cctest.check('a viewer sees no finance', (select count(*) from public.invoices) + (select count(*) from public.payments) = 0);
select cctest.act('editor_a');
insert into public.leads (brand_id, title) values (cctest.id('brand_a'), 'Editor lead');
select cctest.check('an editor sees no finance', (select count(*) from public.invoices) = 0);
select cctest.must_fail('an editor cannot record an invoice', $$ insert into public.invoices (brand_id, number, issue_date, amount, currency) values (cctest.id('brand_a'), 'E-1', '2026-10-01', 1, 'EUR') $$);
delete from public.leads where title = 'Editor lead';
select cctest.check('an editor cannot delete', (select count(*) from public.leads where title = 'Editor lead') = 1);
reset role;

-- ── Multi-brand admin and super admin ──────────────────────────────────────────────────────────────────────────
set role authenticated;
select cctest.act('admin_b');
insert into public.leads (brand_id, title, expected_value, currency) values (cctest.id('brand_b'), 'Logo design', 300, 'USD');
select cctest.act('multi');
select cctest.check('a two-brand admin sees both brands', (select count(distinct brand_id) from public.leads) = 2);
select cctest.act('super');
select cctest.check('the super admin sees every brand', (select count(*) from public.leads) = 3);
select public.log_report(null, 'ecosystem', '{}');
reset role;

-- ── Signed-out visitors see nothing ────────────────────────────────────────────────────────────────────────────
set role anon;
select cctest.must_fail('anon reads leads', $$ select count(*) from public.leads $$);
reset role;

\o
select 'ALL COMMAND CENTER DATABASE TESTS PASSED' as result;

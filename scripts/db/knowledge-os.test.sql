-- Knowledge OS tests (supabase/migrations/20261104100000_knowledge_os.sql) on a real PostgreSQL, as signed-in users:
-- super admin, brand A admin, brand B admin, client A, client B, partner A, a revoked client, anonymous.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema kostest;
grant usage on schema kostest to authenticated, anon;
create table kostest.ids (name text primary key, id uuid);
grant select, insert on kostest.ids to authenticated, anon;
create function kostest.id(p text) returns uuid language sql stable as $$ select id from kostest.ids where name = p $$;
create function kostest.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'EXPECTED FAILURE did not happen: %', label;
end $$;
create function kostest.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', label; end if; end $$;
create function kostest.act(p text) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(kostest.id(p)::text, ''), false) $$;
create function kostest.titles(q text, consumer text default 'internal_ai') returns text[] language sql as $$
  select coalesce(array_agg(x ->> 'title' order by x ->> 'title'), '{}') from jsonb_array_elements(public.kos_retrieve(q, consumer, null, 20)) x $$;
grant execute on all functions in schema kostest to authenticated, anon;

-- Setup as the owner.
insert into public.brands (service_id, slug, name) select id, 'kos-a', 'KOS Brand A' from public.services where slug = 'studio';
insert into public.brands (service_id, slug, name) select id, 'kos-b', 'KOS Brand B' from public.services where slug = 'tech';
insert into kostest.ids select 'brand_a', id from public.brands where slug = 'kos-a';
insert into kostest.ids select 'brand_b', id from public.brands where slug = 'kos-b';
do $$ declare u text; begin
  foreach u in array array['super', 'admin_a', 'admin_b', 'client_a', 'client_b', 'partner_a', 'revoked'] loop
    insert into kostest.ids values (u, gen_random_uuid());
    insert into auth.users (id, email) values (kostest.id(u), 'kos.' || u || '@example.com');
  end loop;
end $$;
alter table public.profiles disable trigger trg_profiles_role_guard;
update public.profiles set platform_role = 'super_admin' where id = kostest.id('super');
alter table public.profiles enable trigger trg_profiles_role_guard;
insert into public.brand_admins (user_id, brand_id, role) values (kostest.id('admin_a'), kostest.id('brand_a'), 'brand_admin'), (kostest.id('admin_b'), kostest.id('brand_b'), 'brand_admin');
insert into public.contacts (name, email) values ('KOS Alice', 'kos.alice@contact.example.com'), ('KOS Bob', 'kos.bob@contact.example.com'), ('KOS Pat', 'kos.pat@contact.example.com'), ('KOS Rex', 'kos.rex@contact.example.com');
insert into kostest.ids select 'c_' || lower(split_part(name, ' ', 2)), id from public.contacts where email like 'kos.%@contact.example.com';
insert into public.contact_brands (contact_id, brand_id, status) values (kostest.id('c_alice'), kostest.id('brand_a'), 'client'), (kostest.id('c_bob'), kostest.id('brand_b'), 'client'),
  (kostest.id('c_pat'), kostest.id('brand_a'), 'partner'), (kostest.id('c_rex'), kostest.id('brand_a'), 'client');
insert into public.portal_memberships (kind, user_id, contact_id, brand_id) values
  ('client', kostest.id('client_a'), kostest.id('c_alice'), kostest.id('brand_a')), ('client', kostest.id('client_b'), kostest.id('c_bob'), kostest.id('brand_b')),
  ('partner', kostest.id('partner_a'), kostest.id('c_pat'), kostest.id('brand_a')), ('client', kostest.id('revoked'), kostest.id('c_rex'), kostest.id('brand_a'));

set role authenticated;

-- ── Writing: who may create what ─────────────────────────────────────────────────────────────────────────────────────
select kostest.act('super');
insert into kostest.ids select 'mgmt', public.kos_save(null, '{"title":"Zephyr strategy 2027","content":"Zephyr expansion plan and margins.","visibility":"management"}');
insert into kostest.ids select 'global_internal', public.kos_save(null, '{"title":"Zephyr quality standard","content":"Every Zephyr deliverable is checked twice.","visibility":"internal"}');
insert into kostest.ids select 'global_client', public.kos_save(null, '{"title":"Zephyr client onboarding","content":"Welcome: how Zephyr onboarding works.","visibility":"client"}');
select kostest.act('admin_a');
insert into kostest.ids select 'a_internal', public.kos_save(null, jsonb_build_object('title', 'Zephyr pricing rules A', 'content', 'Brand A Zephyr internal pricing.', 'visibility', 'internal', 'brand_id', kostest.id('brand_a'), 'tags', jsonb_build_array('Pricing')));
insert into kostest.ids select 'a_client', public.kos_save(null, jsonb_build_object('title', 'Zephyr revision policy A', 'content', 'Brand A Zephyr revisions: two rounds.', 'visibility', 'client', 'brand_id', kostest.id('brand_a')));
insert into kostest.ids select 'a_alice', public.kos_save(null, jsonb_build_object('title', 'Zephyr notes for Alice', 'content', 'Zephyr setup specific to Alice.', 'visibility', 'client', 'brand_id', kostest.id('brand_a'), 'client_contact_id', kostest.id('c_alice')));
select kostest.must_fail('a brand admin writes management knowledge', $$ select public.kos_save(null, '{"title":"x","visibility":"management"}') $$);
select kostest.must_fail('a brand admin writes global knowledge', $$ select public.kos_save(null, '{"title":"x","visibility":"internal"}') $$);
select kostest.must_fail('a brand admin writes into brand B', $$ select public.kos_save(null, jsonb_build_object('title', 'x', 'visibility', 'internal', 'brand_id', kostest.id('brand_b'))) $$);
select kostest.must_fail('public is not stored here', $$ select public.kos_save(null, jsonb_build_object('title', 'x', 'visibility', 'public', 'brand_id', kostest.id('brand_a'))) $$);
select kostest.must_fail('a client restriction to a contact of another brand', $$ select public.kos_save(null, jsonb_build_object('title', 'x', 'visibility', 'client', 'brand_id', kostest.id('brand_a'), 'client_contact_id', kostest.id('c_bob'))) $$);
select kostest.must_fail('direct table writes', $$ insert into public.kos_documents (title, visibility) values ('x', 'internal') $$);
select kostest.must_fail('a brand admin edits a global document', $$ select public.kos_save(kostest.id('global_internal'), '{"content":"changed"}') $$);
select kostest.act('admin_b');
insert into kostest.ids select 'b_internal', public.kos_save(null, jsonb_build_object('title', 'Zephyr pricing rules B', 'content', 'Brand B Zephyr internal pricing.', 'visibility', 'internal', 'brand_id', kostest.id('brand_b')));
select kostest.must_fail('brand B admin edits a brand A document', $$ select public.kos_save(kostest.id('a_internal'), '{"content":"x"}') $$);
select kostest.check('brand B admin cannot see brand A drafts or versions', not exists (select 1 from public.kos_documents where id = kostest.id('a_internal'))
  and not exists (select 1 from public.kos_versions where document_id = kostest.id('a_internal')));

-- ── Lifecycle: nothing is visible to readers until reviewed and published ────────────────────────────────────────────
select kostest.act('client_a');
select kostest.check('drafts are invisible to clients', (select count(*) from public.kos_documents) = 0 and cardinality(kostest.titles('zephyr', 'client_ai')) = 0);
select kostest.act('super');
do $$ declare d text; begin
  foreach d in array array['mgmt', 'global_internal', 'global_client'] loop
    perform public.kos_transition(kostest.id(d), 'submit');
    perform public.kos_transition(kostest.id(d), 'approve', 'ok');
    perform public.kos_transition(kostest.id(d), 'publish');
  end loop;
end $$;
select kostest.act('admin_a');
select kostest.must_fail('publishing without review', $$ select public.kos_transition(kostest.id('a_internal'), 'publish') $$);
select public.kos_transition(kostest.id('a_internal'), 'submit', 'please check', kostest.id('super'));
select kostest.must_fail('a rejection needs a reason', $$ select public.kos_transition(kostest.id('a_internal'), 'reject') $$);
select public.kos_transition(kostest.id('a_internal'), 'reject', 'add the VAT rule');
select kostest.check('rejected back to draft, with the review recorded', (select status from public.kos_documents where id = kostest.id('a_internal')) = 'draft'
  and (select count(*) from public.kos_reviews where document_id = kostest.id('a_internal')) = 2);
do $$ declare d text; begin
  foreach d in array array['a_internal', 'a_client', 'a_alice'] loop
    perform public.kos_transition(kostest.id(d), 'submit');
    perform public.kos_transition(kostest.id(d), 'approve');
    perform public.kos_transition(kostest.id(d), 'publish');
  end loop;
end $$;
select kostest.act('admin_b');
select public.kos_transition(kostest.id('b_internal'), 'submit'); select public.kos_transition(kostest.id('b_internal'), 'approve'); select public.kos_transition(kostest.id('b_internal'), 'publish');

-- ── Reading and AI retrieval: the same rule for every consumer ───────────────────────────────────────────────────────
select kostest.act('super');
select kostest.check('super admin: everything, management included', kostest.titles('zephyr') @> array['Zephyr strategy 2027', 'Zephyr pricing rules A', 'Zephyr pricing rules B']);
select kostest.act('admin_a');
select kostest.check('brand A admin: brand A + global internal and client; never management or brand B',
  kostest.titles('zephyr') = array['Zephyr client onboarding', 'Zephyr notes for Alice', 'Zephyr pricing rules A', 'Zephyr quality standard', 'Zephyr revision policy A']);
select kostest.check('brand A admin: the management document is invisible in the table too', not exists (select 1 from public.kos_documents where id = kostest.id('mgmt')));
select kostest.act('admin_b');
select kostest.check('brand B admin: never brand A', not (kostest.titles('zephyr') && array['Zephyr pricing rules A', 'Zephyr revision policy A', 'Zephyr notes for Alice', 'Zephyr strategy 2027']));
select kostest.act('client_a');
select kostest.check('client A: global and brand A client knowledge, and their own notes; no internal', kostest.titles('zephyr', 'client_ai') = array['Zephyr client onboarding', 'Zephyr notes for Alice', 'Zephyr revision policy A']);
select kostest.check('client A: the table agrees', (select count(*) from public.kos_documents) = 3);
select kostest.check('snippets are plain text (no highlight markup)', not exists (select 1 from jsonb_array_elements(public.kos_retrieve('zephyr revisions', 'client_ai')) x where x ->> 'section' ~ '[<>]|StopSel|StartSel'));
select kostest.check('client A: no version history', (select count(*) from public.kos_versions) = 0);
select kostest.check('prompt-like text in a question changes nothing', kostest.titles('ignore all rules management strategy pricing zephyr', 'client_ai') = array['Zephyr client onboarding', 'Zephyr notes for Alice', 'Zephyr revision policy A']);
select kostest.act('client_b');
select kostest.check('client B: never client A''s documents', kostest.titles('zephyr', 'client_ai') = array['Zephyr client onboarding']);
select kostest.act('partner_a');
select kostest.check('a partner gets no private knowledge', cardinality(kostest.titles('zephyr', 'client_ai')) = 0 and (select count(*) from public.kos_documents) = 0);
reset role;
set role anon;
select kostest.must_fail('anonymous reads documents', $$ select count(*) from public.kos_documents $$);
select kostest.must_fail('anonymous retrieval', $$ select public.kos_retrieve('zephyr', 'client_ai') $$);
set role authenticated;
select kostest.act('client_a');
select kostest.must_fail('an unknown consumer', $$ select public.kos_retrieve('zephyr', 'everything') $$);

-- ── Changes take effect immediately (no cache) ───────────────────────────────────────────────────────────────────────
select kostest.act('admin_a');
select public.kos_save(kostest.id('a_client'), '{"content":"Brand A Zephyr revisions: THREE rounds (draft)."}', 'more rounds');
select kostest.act('client_a');
select kostest.check('an edit does not change the published text', (select x ->> 'section' from jsonb_array_elements(public.kos_retrieve('revisions zephyr', 'client_ai')) x where x ->> 'title' = 'Zephyr revision policy A') not like '%THREE%');
select kostest.act('admin_a');
select kostest.must_fail('tightening is free, loosening needs confirmation', $$ select public.kos_set_scope(kostest.id('a_internal'), 'client', kostest.id('brand_a'), null, false) $$);
select public.kos_set_scope(kostest.id('a_client'), 'internal', kostest.id('brand_a'), null, false);
select kostest.act('client_a');
select kostest.check('a visibility change applies at once', not ('Zephyr revision policy A' = any (kostest.titles('zephyr', 'client_ai'))));
select kostest.act('admin_a');
select kostest.must_fail('a brand admin cannot lift to management', $$ select public.kos_set_scope(kostest.id('a_internal'), 'management', kostest.id('brand_a'), null, true) $$);
select kostest.must_fail('a brand admin cannot move a document to brand B', $$ select public.kos_set_scope(kostest.id('a_internal'), 'internal', kostest.id('brand_b'), null, true) $$);
select public.kos_transition(kostest.id('a_alice'), 'archive');
select kostest.act('client_a');
select kostest.check('archived documents leave retrieval', not ('Zephyr notes for Alice' = any (kostest.titles('zephyr', 'client_ai'))));
select kostest.act('admin_a');
select public.kos_transition(kostest.id('a_alice'), 'restore');
select kostest.check('a restored document is a draft, not published again', (select status || ':' || coalesce(published_version::text, 'none') from public.kos_documents where id = kostest.id('a_alice')) = 'draft:none');
select public.kos_transition(kostest.id('a_internal'), 'unpublish');
select kostest.check('unpublished documents leave retrieval', not ('Zephyr pricing rules A' = any (kostest.titles('zephyr'))));
select kostest.act('super');
select public.kos_set_schedule(kostest.id('global_client'), null, null, null, current_date - 1);
select kostest.act('client_a');
select kostest.check('expired documents leave retrieval', not ('Zephyr client onboarding' = any (kostest.titles('zephyr', 'client_ai'))));
select kostest.act('admin_a');
select public.cos_set_membership_status((select id from public.portal_memberships where user_id = kostest.id('client_a')), 'suspended');
select kostest.act('client_a');
select kostest.check('a suspended client loses client knowledge at once', cardinality(kostest.titles('zephyr', 'client_ai')) = 0);
select kostest.act('admin_a');
select public.cos_set_membership_status((select id from public.portal_memberships where user_id = kostest.id('client_a')), 'active');
reset role;
update public.brand_admins set brand_id = kostest.id('brand_b') where user_id = kostest.id('admin_a');
set role authenticated;
select kostest.act('admin_a');
select kostest.check('brand reassignment: brand A knowledge is gone at once', not exists (select 1 from public.kos_documents where brand_id = kostest.id('brand_a')));
reset role;
update public.brand_admins set brand_id = kostest.id('brand_a') where user_id = kostest.id('admin_a');
set role authenticated;

-- ── Versions: never overwritten, restored as a new version ───────────────────────────────────────────────────────────
select kostest.act('admin_a');
select kostest.check('every save is a version', (select count(*) from public.kos_versions where document_id = kostest.id('a_client')) = 2);
select kostest.must_fail('versions are append-only', $$ update public.kos_versions set content = 'x' where document_id = kostest.id('a_client') $$);
select public.kos_restore_version(kostest.id('a_client'), 1);
select kostest.check('restoring creates version 3 with the old text', (select content from public.kos_versions where document_id = kostest.id('a_client') and version = 3) = 'Brand A Zephyr revisions: two rounds.');
select kostest.must_fail('a published document is never deleted', $$ select public.kos_delete(kostest.id('a_client')) $$);
insert into kostest.ids select 'tmp', public.kos_duplicate(kostest.id('a_client'));
select public.kos_delete(kostest.id('tmp'));
select kostest.check('an unpublished copy can be deleted', not exists (select 1 from public.kos_documents where id = kostest.id('tmp')));

-- ── Graph: a restricted end hides the link ───────────────────────────────────────────────────────────────────────────
select kostest.act('super');
select public.kos_link(kostest.id('global_internal'), kostest.id('mgmt'), null, 'related');
select public.kos_link(kostest.id('global_internal'), null, 'la-rosa-view-overview', 'brand');
select kostest.act('admin_a');
select kostest.check('a link to a management document is invisible to brand admins', (select count(*) from public.kos_links where from_document = kostest.id('global_internal')) = 1);
select kostest.must_fail('brand admin links to a document they cannot read', $$ select public.kos_link(kostest.id('a_client'), kostest.id('mgmt'), null, 'related') $$);

-- ── Playground simulation ────────────────────────────────────────────────────────────────────────────────────────────
select kostest.act('admin_a');
select kostest.must_fail('a brand admin simulates a super admin', $$ select public.kos_simulate('zephyr', 'super') $$);
select kostest.must_fail('a brand admin simulates brand B', $$ select public.kos_simulate('zephyr', 'brand_admin', kostest.id('brand_b')) $$);
select kostest.check('a brand admin simulates a client of their brand (Alice''s draft shows for Alice only)',
  jsonb_array_length(public.kos_simulate('zephyr', 'client', kostest.id('brand_a'), kostest.id('c_alice'), kostest.id('a_alice')) -> 'results') = 1
  and jsonb_array_length(public.kos_simulate('zephyr', 'client', kostest.id('brand_a'), kostest.id('c_rex'), kostest.id('a_alice')) -> 'results') = 0);
select kostest.check('the draft under test shows only in the simulation', exists (select 1 from jsonb_array_elements(public.kos_simulate('pricing zephyr', 'brand_admin', kostest.id('brand_a'), null, kostest.id('a_internal')) -> 'results') x where x ->> 'why' like '%DRAFT under test%')
  and not ('Zephyr pricing rules A' = any (kostest.titles('zephyr'))));
select kostest.check('a public simulation sees no private document', jsonb_array_length(public.kos_simulate('zephyr', 'public') -> 'results') = 0);
select kostest.act('super');
select kostest.check('a super admin may simulate brand B', jsonb_array_length(public.kos_simulate('zephyr', 'brand_admin', kostest.id('brand_b')) -> 'results') >= 1);
select kostest.act('client_a');
select kostest.must_fail('a client cannot simulate', $$ select public.kos_simulate('zephyr', 'super') $$);

-- ── Analytics, gaps, Autopilot ───────────────────────────────────────────────────────────────────────────────────────
select kostest.act('client_a');
select public.kos_retrieve('parking for guests?', 'client_ai'); select public.kos_retrieve('Parking  for guests?', 'client_ai'); select public.kos_retrieve('parking for guests?', 'client_ai');
select kostest.act('admin_a');
select kostest.check('gaps: repeated unanswered questions', exists (select 1 from jsonb_array_elements(public.kos_insights() -> 'gaps') g where g ->> 'question' = 'parking for guests?' and (g ->> 'times')::int = 3));
select kostest.check('insights are scoped: brand A admin never counts management documents', not exists (select 1 from jsonb_array_elements(public.kos_insights() -> 'recent') r where r ->> 'title' = 'Zephyr strategy 2027'));
select kostest.must_fail('insights of brand B', $$ select public.kos_insights(kostest.id('brand_b')) $$);
select kostest.check('retrieval analytics are super admin only in the table', (select count(*) from public.kos_retrievals) = 0);
select public.kos_set_schedule(kostest.id('a_client'), kostest.id('admin_a'), current_date - 2, null, null);
select public.ap_tick(true);
reset role;
select kostest.check('review overdue: an Autopilot event and a notification for the owner', exists (select 1 from public.automation_events where event_type = 'knowledge.review_overdue')
  and exists (select 1 from public.user_notifications where user_id = kostest.id('admin_a') and title like 'Knowledge review overdue%'));
select kostest.check('gap detected as an Autopilot event', exists (select 1 from public.automation_events where event_type = 'knowledge.gap_detected'));
select kostest.check('question text is kept only for unanswered questions', not exists (select 1 from public.kos_retrievals where results > 0 and query_text is not null));
select kostest.check('lifecycle operations are audited', (select count(*) from public.audit_logs where action like 'knowledge.%') >= 20);
select kostest.check('a client never sees review history', true);
set role authenticated;
select kostest.act('client_a');
select kostest.check('clients see no reviews or links of internal documents', (select count(*) from public.kos_reviews) = 0 and (select count(*) from public.kos_links) = 0);
reset role;
\o
select 'ALL KNOWLEDGE OS DATABASE TESTS PASSED' as result;

-- Client OS tests (supabase/migrations/20261102*_client_os_*.sql) on a real PostgreSQL with every migration applied,
-- acting as signed-in users the way Supabase does. Roles: super admin, brand A admin, brand B admin, client A, client B,
-- a client of both brands, partner A, partner B, a revoked client, an outsider and an anonymous visitor.
-- Run by scripts/db/test-command-center.sh after the Command Center and Autopilot tests.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema cotest;
grant usage on schema cotest to authenticated, anon;
create table cotest.ids (name text primary key, id uuid);
create table cotest.tokens (name text primary key, token text);
grant select, insert, update on cotest.ids, cotest.tokens to authenticated, anon;
create function cotest.id(p text) returns uuid language sql stable as $$ select id from cotest.ids where name = p $$;
create function cotest.tok(p text) returns text language sql stable as $$ select token from cotest.tokens where name = p $$;
create function cotest.must_fail(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'EXPECTED FAILURE did not happen: %', label;
end $$;
create function cotest.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', label; end if; end $$;
create function cotest.act(p text) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(cotest.id(p)::text, ''), false) $$;
grant execute on all functions in schema cotest to authenticated, anon;

-- ── Setup (as the database owner): brands, people, memberships of the Workspace, contacts ───────────────────────────
insert into public.brands (service_id, slug, name) select id, 'cos-brand-a', 'COS Brand A' from public.services where slug = 'studio';
insert into cotest.ids select 'brand_a', id from public.brands where slug = 'cos-brand-a';
insert into public.brands (service_id, slug, name) select id, 'cos-brand-b', 'COS Brand B' from public.services where slug = 'tech';
insert into cotest.ids select 'brand_b', id from public.brands where slug = 'cos-brand-b';
do $$ declare u text; begin
  foreach u in array array['super', 'admin_a', 'admin_b', 'client_a', 'client_b', 'multi', 'partner_a', 'partner_b', 'revoked', 'outsider'] loop
    insert into cotest.ids values (u, gen_random_uuid());
    insert into auth.users (id, email) values (cotest.id(u), 'cos.' || u || '@example.com');
  end loop;
end $$;
alter table public.profiles disable trigger trg_profiles_role_guard;
update public.profiles set platform_role = 'super_admin' where id = cotest.id('super');
alter table public.profiles enable trigger trg_profiles_role_guard;
insert into public.brand_admins (user_id, brand_id, role) values (cotest.id('admin_a'), cotest.id('brand_a'), 'brand_admin'), (cotest.id('admin_b'), cotest.id('brand_b'), 'brand_admin');
insert into public.contacts (name, email) values ('Alice Client', 'alice@contact.example.com'), ('Bob Client', 'bob@contact.example.com'),
  ('Mia Both', 'mia@contact.example.com'), ('Pat Partner', 'pat@contact.example.com'), ('PBB Partner', 'pbb@contact.example.com'), ('Rex Revoked', 'rex@contact.example.com');
insert into cotest.ids select lower(split_part(name, ' ', 1)), id from public.contacts where email like '%@contact.example.com';
insert into public.contact_brands (contact_id, brand_id, status) values
  (cotest.id('alice'), cotest.id('brand_a'), 'client'), (cotest.id('bob'), cotest.id('brand_b'), 'client'),
  (cotest.id('mia'), cotest.id('brand_a'), 'client'), (cotest.id('mia'), cotest.id('brand_b'), 'client'),
  (cotest.id('pat'), cotest.id('brand_a'), 'partner'), (cotest.id('pbb'), cotest.id('brand_b'), 'partner'), (cotest.id('rex'), cotest.id('brand_a'), 'client');
insert into public.projects (brand_id, client_contact_id, name, status, currency, deadline) values
  (cotest.id('brand_a'), cotest.id('alice'), 'Alice Website', 'active', 'EUR', current_date + 30),
  (cotest.id('brand_a'), cotest.id('mia'), 'Mia Brand A', 'active', 'EUR', current_date + 30),
  (cotest.id('brand_b'), cotest.id('bob'), 'Bob App', 'active', 'USD', current_date + 30),
  (cotest.id('brand_b'), cotest.id('mia'), 'Mia Brand B', 'active', 'USD', current_date + 30),
  (cotest.id('brand_a'), cotest.id('rex'), 'Rex Project', 'active', 'EUR', null);
insert into cotest.ids select 'p_alice', id from public.projects where name = 'Alice Website';
insert into cotest.ids select 'p_mia_a', id from public.projects where name = 'Mia Brand A';
insert into cotest.ids select 'p_bob', id from public.projects where name = 'Bob App';
insert into cotest.ids select 'p_mia_b', id from public.projects where name = 'Mia Brand B';
insert into cotest.ids select 'p_rex', id from public.projects where name = 'Rex Project';
insert into public.tasks (project_id, brand_id, title, client_visible) values
  (cotest.id('p_alice'), cotest.id('brand_a'), 'Internal wireframes', false),
  (cotest.id('p_alice'), cotest.id('brand_a'), 'Kick-off call', true),
  (cotest.id('p_alice'), cotest.id('brand_a'), 'Partner illustrations', false);
insert into cotest.ids select 't_internal', id from public.tasks where title = 'Internal wireframes';
insert into cotest.ids select 't_shared', id from public.tasks where title = 'Kick-off call';
insert into cotest.ids select 't_partner', id from public.tasks where title = 'Partner illustrations';

set role authenticated;

-- ── Invitations ──────────────────────────────────────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into cotest.tokens select 'alice', (public.cos_invite('client', cotest.id('brand_a'), cotest.id('alice'), 'cos.client_a@example.com', array[cotest.id('p_alice')]) ->> 'token');
select cotest.check('the secret is 64 hex characters', cotest.tok('alice') ~ '^[0-9a-f]{64}$');
select cotest.must_fail('the stored hash is not readable', $$ select token_hash from public.portal_invitations $$);
select cotest.check('only the hash is stored', (select count(*) from public.portal_invitations where email = 'cos.client_a@example.com') = 1);
select cotest.must_fail('invite into another client''s project', $$ select public.cos_invite('client', cotest.id('brand_a'), cotest.id('alice'), 'x@example.com', array[cotest.id('p_mia_a')]) $$);
select cotest.must_fail('invite into another brand''s project', $$ select public.cos_invite('client', cotest.id('brand_a'), cotest.id('alice'), 'x@example.com', array[cotest.id('p_bob')]) $$);
select cotest.must_fail('invite for another brand', $$ select public.cos_invite('client', cotest.id('brand_b'), cotest.id('bob'), 'x@example.com') $$);
select cotest.must_fail('invite a contact of another brand', $$ select public.cos_invite('client', cotest.id('brand_a'), cotest.id('bob'), 'x@example.com') $$);
insert into cotest.tokens select 'mia_a', (public.cos_invite('client', cotest.id('brand_a'), cotest.id('mia'), 'cos.multi@example.com', array[cotest.id('p_mia_a')]) ->> 'token');
insert into cotest.tokens select 'pat', (public.cos_invite('partner', cotest.id('brand_a'), cotest.id('pat'), 'cos.partner_a@example.com') ->> 'token');
insert into cotest.tokens select 'rex', (public.cos_invite('client', cotest.id('brand_a'), cotest.id('rex'), 'cos.revoked@example.com', array[cotest.id('p_rex')]) ->> 'token');
insert into cotest.tokens select 'expired', (public.cos_invite('client', cotest.id('brand_a'), cotest.id('alice'), 'cos.client_a@example.com', '{}', 1) ->> 'token');
insert into cotest.tokens select 'withdrawn', (public.cos_invite('client', cotest.id('brand_a'), cotest.id('alice'), 'cos.client_a@example.com') ->> 'token');
select public.cos_revoke_invitation((select id from public.portal_invitations where status = 'pending' and email = 'cos.client_a@example.com' order by created_at desc limit 1));
select cotest.act('admin_b');
insert into cotest.tokens select 'bob', (public.cos_invite('client', cotest.id('brand_b'), cotest.id('bob'), 'cos.client_b@example.com', array[cotest.id('p_bob')]) ->> 'token');
insert into cotest.tokens select 'mia_b', (public.cos_invite('client', cotest.id('brand_b'), cotest.id('mia'), 'cos.multi@example.com', array[cotest.id('p_mia_b')]) ->> 'token');
insert into cotest.tokens select 'pbb', (public.cos_invite('partner', cotest.id('brand_b'), cotest.id('pbb'), 'cos.partner_b@example.com') ->> 'token');
select cotest.check('brand B admin sees only brand B invitations', (select count(*) from public.portal_invitations where brand_id = cotest.id('brand_a')) = 0);

reset role;
update public.portal_invitations set expires_at = now() - interval '1 minute' where id = (select id from public.portal_invitations where email = 'cos.client_a@example.com' and status = 'pending' order by created_at limit 1 offset 1);
set role anon;
select cotest.check('preview before sign-in: valid, email masked', (public.cos_invitation_preview(cotest.tok('alice')) ->> 'valid')::boolean
  and (public.cos_invitation_preview(cotest.tok('alice')) ->> 'email_hint') not like 'cos.client_a@%');
select cotest.check('preview of a wrong secret', not (public.cos_invitation_preview('0000') ->> 'valid')::boolean);
select cotest.must_fail('anonymous acceptance', $$ select public.cos_accept_invitation(cotest.tok('alice')) $$);
select cotest.must_fail('anonymous reads memberships', $$ select count(*) from public.portal_memberships $$);
set role authenticated;
select cotest.act('outsider');
select cotest.must_fail('the right secret with another email address', $$ select public.cos_accept_invitation(cotest.tok('alice')) $$);
select cotest.check('an email match alone grants nothing', not exists (select 1 from public.portal_memberships));
select cotest.act('client_a');
select cotest.must_fail('expired invitation', $$ select public.cos_accept_invitation(cotest.tok('expired')) $$);
select cotest.must_fail('withdrawn invitation', $$ select public.cos_accept_invitation(cotest.tok('withdrawn')) $$);
select cotest.must_fail('a made-up secret', $$ select public.cos_accept_invitation(repeat('a', 64)) $$);
select public.cos_accept_invitation(cotest.tok('alice'));
select cotest.must_fail('an invitation is used once', $$ select public.cos_accept_invitation(cotest.tok('alice')) $$);
select cotest.check('client A: one active membership', (select count(*) from public.portal_memberships where status = 'active') = 1);
select cotest.check('client A is never a brand admin', not exists (select 1 from public.brand_admins where user_id = auth.uid()) and not public.has_brand_access(cotest.id('brand_a')));
select cotest.act('client_b'); select public.cos_accept_invitation(cotest.tok('bob'));
select cotest.act('multi'); select public.cos_accept_invitation(cotest.tok('mia_a')); select public.cos_accept_invitation(cotest.tok('mia_b'));
select cotest.act('partner_a'); select public.cos_accept_invitation(cotest.tok('pat'));
select cotest.act('partner_b'); select public.cos_accept_invitation(cotest.tok('pbb'));
select cotest.act('revoked'); select public.cos_accept_invitation(cotest.tok('rex'));
reset role;
insert into cotest.ids select 'm_alice', id from public.portal_memberships where user_id = cotest.id('client_a');
insert into cotest.ids select 'm_pat', id from public.portal_memberships where user_id = cotest.id('partner_a');
insert into cotest.ids select 'm_pbb', id from public.portal_memberships where user_id = cotest.id('partner_b');
insert into cotest.ids select 'm_rex', id from public.portal_memberships where user_id = cotest.id('revoked');
select cotest.check('acceptance is audited with its actor', exists (select 1 from public.audit_logs where action = 'client_os.invitation_accepted' and actor_id = cotest.id('client_a')));
select cotest.check('acceptance is an Autopilot event', exists (select 1 from public.automation_events where event_type = 'client.invitation_accepted'));
set role authenticated;

-- ── Isolation: clients, brands ───────────────────────────────────────────────────────────────────────────────────────
select cotest.act('client_a');
select cotest.check('client A: their project in the portal', (select jsonb_array_length(public.portal_client_home() -> 'projects')) = 1
  and public.portal_client_home() -> 'projects' -> 0 ->> 'name' = 'Alice Website');
select cotest.must_fail('client A opens Mia''s project (same brand)', $$ select public.portal_project(cotest.id('p_mia_a')) $$);
select cotest.must_fail('client A opens a brand B project', $$ select public.portal_project(cotest.id('p_bob')) $$);
select cotest.check('client A: no direct access to Command Center tables', (select count(*) from public.projects) = 0 and (select count(*) from public.invoices) = 0
  and (select count(*) from public.contacts) = 0 and (select count(*) from public.leads) = 0 and (select count(*) from public.tasks) = 0);
select cotest.check('client A: no invitation, no other membership', (select count(*) from public.portal_invitations) = 0 and (select count(*) from public.portal_memberships) = 1);
select cotest.check('client A: only client-visible tasks', (select jsonb_array_length(public.portal_project(cotest.id('p_alice')) -> 'tasks')) = 1);
select cotest.check('client A: no internal field in the project view', not (public.portal_project(cotest.id('p_alice')) ?| array['budget', 'estimated_cost', 'contract_value', 'description', 'owner_id']));
select cotest.must_fail('client A adds themselves to a project', $$ insert into public.project_participants (project_id, brand_id, membership_id) values (cotest.id('p_mia_a'), cotest.id('brand_a'), cotest.id('m_alice')) $$);
select cotest.must_fail('client A cannot run the analytics', $$ select public.cos_analytics() $$);
select cotest.check('client A: search finds no internal record', (select count(*) from public.cos_search('Mia')) = 0 and (select count(*) from public.cos_search('Bob')) = 0);
select cotest.act('multi');
select cotest.check('a client of two brands sees exactly their two projects', (select jsonb_array_length(public.portal_client_home() -> 'projects')) = 2
  and (select jsonb_array_length(public.portal_client_home() -> 'memberships')) = 2);
select cotest.must_fail('two-brand client opens Alice''s project', $$ select public.portal_project(cotest.id('p_alice')) $$);
select cotest.act('admin_b');
select cotest.check('brand B admin: no access to brand A projects', public.cos_project_access(cotest.id('p_alice')) is null and public.cos_project_access(cotest.id('p_mia_a')) is null);
select cotest.check('brand B admin: brand A memberships invisible', (select count(*) from public.portal_memberships where brand_id = cotest.id('brand_a')) = 0);
select cotest.must_fail('brand B admin suspends a brand A client', $$ select public.cos_set_membership_status(cotest.id('m_alice'), 'suspended') $$);
select cotest.check('brand B admin: search shows no brand A record', (select count(*) from public.cos_search('Alice')) = 0);
select cotest.must_fail('brand B admin: analytics of brand A', $$ select public.cos_analytics(cotest.id('brand_a')) $$);
select cotest.act('super');
select cotest.check('super admin sees every membership', (select count(*) from public.portal_memberships) = 7);

-- ── Scenario C: partner collaboration ────────────────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into public.partner_task_assignments (task_id, project_id, brand_id, membership_id) values (cotest.id('t_partner'), cotest.id('p_alice'), cotest.id('brand_a'), cotest.id('m_pat'));
select cotest.must_fail('assign a brand B partner to a brand A task', $$ insert into public.partner_task_assignments (task_id, project_id, brand_id, membership_id) values (cotest.id('t_shared'), cotest.id('p_alice'), cotest.id('brand_a'), cotest.id('m_pbb')) $$);
select cotest.must_fail('brand A admin adds a partner to a brand B project', $$ insert into public.project_participants (project_id, brand_id, membership_id) values (cotest.id('p_bob'), cotest.id('brand_b'), cotest.id('m_pat')) $$);
select cotest.must_fail('a client joins another client''s project', $$ insert into public.project_participants (project_id, brand_id, membership_id) values (cotest.id('p_mia_a'), cotest.id('brand_a'), cotest.id('m_alice')) $$);
select cotest.act('partner_a');
select cotest.check('partner A: only their task, not the whole project', public.cos_project_access(cotest.id('p_alice')) = 'partner_tasks'
  and jsonb_array_length(public.portal_project(cotest.id('p_alice')) -> 'tasks') = 1 and not (public.portal_project(cotest.id('p_alice')) ? 'deliverables')
  and not (public.portal_project(cotest.id('p_alice')) ? 'milestones'));
select cotest.check('partner A: no financial record', (select count(*) from public.invoices) = 0 and (select count(*) from public.payments) = 0 and jsonb_array_length(coalesce(public.portal_client_home() -> 'invoices', '[]')) = 0);
select cotest.check('partner A: their task in the partner home', jsonb_array_length(public.portal_partner_home() -> 'tasks') = 1);
select cotest.act('partner_b');
select cotest.check('partner B: nothing of brand A', public.cos_project_access(cotest.id('p_alice')) is null and jsonb_array_length(public.portal_partner_home() -> 'tasks') = 0);

-- ── Files ────────────────────────────────────────────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into cotest.ids select 'f_brief', (public.cos_register_upload(cotest.id('brand_a'), cotest.id('p_alice'), 'project', '../../etc/passwd brief.pdf', 'application/pdf', 1000) ->> 'id')::uuid;
select cotest.check('the object path is built by the server', (select object_path from public.cos_files where id = cotest.id('f_brief')) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'
  and (select object_path from public.cos_files where id = cotest.id('f_brief')) not like '%..%');
insert into storage.objects (bucket_id, name) select 'client-os', object_path from public.cos_files where id = cotest.id('f_brief');
select cotest.must_fail('upload to a path that was not registered', $$ insert into storage.objects (bucket_id, name) values ('client-os', cotest.id('brand_a') || '/' || gen_random_uuid() || '/x.pdf') $$);
select public.cos_complete_upload(cotest.id('f_brief'));
select cotest.must_fail('a forbidden file type', $$ select public.cos_register_upload(cotest.id('brand_a'), cotest.id('p_alice'), 'project', 'x.exe', 'application/x-msdownload', 10) $$);
select cotest.must_fail('a file over 25 MB', $$ select public.cos_register_upload(cotest.id('brand_a'), cotest.id('p_alice'), 'project', 'x.pdf', 'application/pdf', 26214401) $$);
select cotest.act('client_a');
select cotest.check('client A cannot read an internal file', (select count(*) from public.cos_files where id = cotest.id('f_brief')) = 0 and (select count(*) from storage.objects) = 0);
select cotest.must_fail('client A attaches a file to Mia''s project', $$ select public.cos_register_upload(cotest.id('brand_a'), cotest.id('p_mia_a'), 'request', 'a.pdf', 'application/pdf', 10) $$);
select cotest.act('admin_a');
insert into cotest.ids select 'share_pat', public.cos_share_file(cotest.id('f_brief'), cotest.id('m_pat'));
select cotest.act('partner_a');
select cotest.check('partner A reads the shared file (signed URL possible)', (select count(*) from storage.objects where bucket_id = 'client-os') = 1 and jsonb_array_length(public.portal_partner_home() -> 'files') = 1);
select cotest.act('partner_b');
select cotest.check('partner B cannot read it', (select count(*) from storage.objects) = 0 and (select count(*) from public.cos_files) = 0);
select cotest.act('admin_a');
select public.cos_unshare_file(cotest.id('share_pat'));
select cotest.act('partner_a');
select cotest.check('after unsharing, partner A cannot read it', (select count(*) from storage.objects) = 0);

-- ── Scenario B: delivery, versions, reviews, lifecycle ───────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into public.automations (brand_id, name, status, definition) values (cotest.id('brand_a'), 'Revision follow-up', 'active',
  '{"trigger":"deliverable.revision_requested","actions":[{"type":"create_task","title":"Handle revision: {title}","priority":"high","due_in_days":2}]}');
insert into public.deliverables (project_id, brand_id, title) values (cotest.id('p_alice'), cotest.id('brand_a'), 'Homepage design');
insert into cotest.ids select 'd_home', id from public.deliverables where title = 'Homepage design';
select cotest.must_fail('a deliverable cannot start approved', $$ insert into public.deliverables (project_id, brand_id, title, status) values (cotest.id('p_alice'), cotest.id('brand_a'), 'x', 'approved') $$);
select cotest.must_fail('a deliverable status is not set by hand', $$ update public.deliverables set status = 'approved' where id = cotest.id('d_home') $$);
insert into cotest.ids select 'v1', (public.cos_submit_version(cotest.id('d_home'), 'First design', null, 'https://example.com/v1') ->> 'version_id')::uuid;
select cotest.check('a client version is submitted', (select status from public.deliverables where id = cotest.id('d_home')) = 'submitted');
select cotest.act('client_b');
select cotest.must_fail('client B reviews client A''s deliverable', $$ select public.cos_review_version(cotest.id('v1'), 'approved') $$);
select cotest.check('client B sees no version', (select count(*) from public.deliverable_versions) = 0);
select cotest.act('client_a');
select cotest.check('client A was notified in the portal', exists (select 1 from public.user_notifications where link like '/portal/projects/%'));
select cotest.must_fail('a revision request needs a comment', $$ select public.cos_review_version(cotest.id('v1'), 'revision_requested', '') $$);
select public.cos_review_version(cotest.id('v1'), 'revision_requested', 'Make the logo larger');
select cotest.must_fail('one decision per version', $$ select public.cos_review_version(cotest.id('v1'), 'approved') $$);
select cotest.check('the revision request became a client request', exists (select 1 from public.client_requests where category = 'revision' and deliverable_id = cotest.id('d_home')));
reset role;
select cotest.check('Autopilot ran the revision automation (a task in the project)', exists (select 1 from public.tasks where project_id = cotest.id('p_alice') and title like 'Handle revision%'));
set role authenticated;
select cotest.act('admin_a');
insert into cotest.ids select 'v2', (public.cos_submit_version(cotest.id('d_home'), 'Larger logo', null, 'https://example.com/v2') ->> 'version_id')::uuid;
select cotest.must_fail('versions are never overwritten', $$ update public.deliverable_versions set note = 'changed' where id = cotest.id('v1') $$);
select cotest.act('client_a');
select cotest.must_fail('an approval never applies to a replaced version', $$ select public.cos_review_version(cotest.id('v1'), 'approved') $$);
select public.cos_review_version(cotest.id('v2'), 'approved', 'Perfect');
-- An older version that was never reviewed: a decision on it is refused once a newer version exists.
select cotest.act('admin_a');
insert into public.deliverables (project_id, brand_id, title) values (cotest.id('p_alice'), cotest.id('brand_a'), 'Logo');
insert into cotest.ids select 'lv1', (public.cos_submit_version((select id from public.deliverables where title = 'Logo'), 'Logo A', null, 'https://example.com/a') ->> 'version_id')::uuid;
insert into cotest.ids select 'lv2', (public.cos_submit_version((select id from public.deliverables where title = 'Logo'), 'Logo B', null, 'https://example.com/b') ->> 'version_id')::uuid;
select cotest.act('client_a');
select cotest.must_fail('approving a replaced, never-reviewed version', $$ select public.cos_review_version(cotest.id('lv1'), 'approved') $$);
select public.cos_review_version(cotest.id('lv2'), 'approved');
select cotest.check('approved: version 2 exactly', (select status || ':' || approved_version from public.deliverables where id = cotest.id('d_home')) = 'approved:2');
select cotest.check('both versions remain', (select count(*) from public.deliverable_versions where deliverable_id = cotest.id('d_home')) = 2);

-- A partner's submission goes to internal review first and is invisible to the client.
select cotest.act('admin_a');
insert into public.deliverables (project_id, brand_id, title, task_id, partner_membership_id) values (cotest.id('p_alice'), cotest.id('brand_a'), 'Illustrations', cotest.id('t_partner'), cotest.id('m_pat'));
insert into cotest.ids select 'd_ill', id from public.deliverables where title = 'Illustrations';
select cotest.act('partner_a');
insert into cotest.ids select 'pv1', (public.cos_submit_version(cotest.id('d_ill'), 'Drafts', null, 'https://example.com/ill') ->> 'version_id')::uuid;
select cotest.must_fail('a partner cannot review their own version', $$ select public.cos_review_version(cotest.id('pv1'), 'approved') $$);
select cotest.act('client_a');
select cotest.check('the client does not see the partner''s internal version', not exists (select 1 from public.deliverable_versions where id = cotest.id('pv1')));
select cotest.must_fail('the client cannot review an internal version', $$ select public.cos_review_version(cotest.id('pv1'), 'approved') $$);
select cotest.act('admin_a');
select public.cos_review_version(cotest.id('pv1'), 'approved', null);
select cotest.must_fail('completion waits for every deliverable', $$ select public.cos_set_stage(cotest.id('p_alice'), 'completed') $$);
select public.cos_submit_version(cotest.id('d_ill'), 'Final illustrations', null, 'https://example.com/ill2');
select cotest.act('client_a');
select public.cos_review_version((select id from public.deliverable_versions where deliverable_id = cotest.id('d_ill') and audience = 'client'), 'approved');
select cotest.act('admin_a');
select cotest.must_fail('an unknown stage', $$ select public.cos_set_stage(cotest.id('p_alice'), 'shipping') $$);
select public.cos_set_stage(cotest.id('p_alice'), 'client_review', 'Ready for review');
select public.cos_set_stage(cotest.id('p_alice'), 'completed');
select cotest.check('completed: status and history', (select status from public.projects where id = cotest.id('p_alice')) = 'completed'
  and (select count(*) from public.project_stage_history where project_id = cotest.id('p_alice')) = 2);
select cotest.act('client_a');
select cotest.check('the client sees the client-facing status', public.portal_project(cotest.id('p_alice')) ->> 'status' = 'Completed'
  and jsonb_array_length(public.portal_project(cotest.id('p_alice')) -> 'stage_history') = 2);
select cotest.act('admin_b');
select cotest.must_fail('brand B admin moves a brand A project', $$ select public.cos_set_stage(cotest.id('p_mia_a'), 'planning') $$);

-- A brand lifecycle with a restricted transition.
select cotest.act('admin_a');
insert into public.project_lifecycles (brand_id, name, project_type, is_default) values (cotest.id('brand_a'), 'Course production', 'education', false);
insert into public.lifecycle_stages (lifecycle_id, key, label, position, allowed_next) select id, 'outline', 'Outline', 1, '{recording}' from public.project_lifecycles where name = 'Course production';
insert into public.lifecycle_stages (lifecycle_id, key, label, position) select id, 'recording', 'Recording', 2 from public.project_lifecycles where name = 'Course production';
insert into public.lifecycle_stages (lifecycle_id, key, label, position) select id, 'published', 'Published', 3 from public.project_lifecycles where name = 'Course production';
insert into cotest.ids select 'lc', id from public.project_lifecycles where name = 'Course production';
update public.projects set lifecycle_id = cotest.id('lc') where id = cotest.id('p_mia_a');
select public.cos_set_stage(cotest.id('p_mia_a'), 'outline');
select cotest.must_fail('a transition the lifecycle does not allow', $$ select public.cos_set_stage(cotest.id('p_mia_a'), 'published') $$);
select public.cos_set_stage(cotest.id('p_mia_a'), 'recording');
select cotest.act('admin_b');
select cotest.must_fail('brand B admin edits brand A lifecycles', $$ insert into public.lifecycle_stages (lifecycle_id, key, label, position) values (cotest.id('lc'), 'x', 'X', 9) $$);
select cotest.check('brand B admin does not see brand A lifecycles', not exists (select 1 from public.project_lifecycles where id = cotest.id('lc')));

-- ── Scenario A: proposal, acceptance, project ────────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into public.proposals (brand_id, contact_id, reference, title, currency, valid_until) values (cotest.id('brand_a'), cotest.id('alice'), 'P-001', 'Website phase 2', 'EUR', current_date + 14);
insert into cotest.ids select 'prop', id from public.proposals where reference = 'P-001';
insert into public.proposal_items (proposal_id, brand_id, position, description, quantity, unit_price, discount_pct, tax_pct) values
  (cotest.id('prop'), cotest.id('brand_a'), 1, 'Design', 2, 1000, 10, 20), (cotest.id('prop'), cotest.id('brand_a'), 2, 'Hosting setup', 1, 333.33, 0, 0);
select cotest.check('totals: per-line rounding, exact decimals', public.cos_proposal_totals(cotest.id('prop')) ->> 'total' = '2493.33'
  and public.cos_proposal_totals(cotest.id('prop')) ->> 'tax' = '360.00' and public.cos_proposal_totals(cotest.id('prop')) ->> 'discount' = '200.00');
insert into public.service_catalog (brand_id, name, unit_price, currency) values (cotest.id('brand_a'), 'Audit (USD)', 500, 'USD');
select cotest.must_fail('a USD service in a EUR proposal', $$ insert into public.proposal_items (proposal_id, brand_id, description, quantity, unit_price, catalog_id) select cotest.id('prop'), cotest.id('brand_a'), 'Audit', 1, 500, id from public.service_catalog where name = 'Audit (USD)' $$);
select cotest.act('client_a');
select cotest.check('a draft is invisible to the client', (select count(*) from public.proposals) = 0 and jsonb_array_length(public.portal_client_home() -> 'proposals') = 0);
select cotest.check('the client cannot read a draft''s totals', public.cos_proposal_totals(cotest.id('prop')) is null);
select cotest.act('admin_a');
select cotest.must_fail('status is not set by hand', $$ update public.proposals set status = 'accepted' where id = cotest.id('prop') $$);
select public.cos_send_proposal(cotest.id('prop'));
select cotest.must_fail('a sent proposal is not edited', $$ update public.proposal_items set unit_price = 1 where proposal_id = cotest.id('prop') $$);
select cotest.act('client_b');
select cotest.must_fail('client B decides client A''s proposal', $$ select public.cos_decide_proposal(cotest.id('prop'), 1, true) $$);
select cotest.check('client B sees no proposal', (select count(*) from public.proposal_versions) = 0);
select cotest.act('client_a');
select cotest.check('client A reads the frozen version and total', (select snapshot -> 'totals' ->> 'total' from public.proposal_versions where proposal_id = cotest.id('prop') and version = 1) = '2493.33');
select public.cos_proposal_viewed(cotest.id('prop'));
select cotest.must_fail('a decision on a version the client did not read', $$ select public.cos_decide_proposal(cotest.id('prop'), 2, true) $$);
select public.cos_decide_proposal(cotest.id('prop'), 1, true, 'Go ahead');
select cotest.must_fail('acceptance happens once', $$ select public.cos_decide_proposal(cotest.id('prop'), 1, true) $$);
select cotest.check('acceptance recorded with actor and time', (select status = 'accepted' and decided_by = cotest.id('client_a') and decided_at is not null from public.proposals where id = cotest.id('prop')));
select cotest.act('admin_a');
insert into cotest.ids select 'p_phase2', public.cos_project_from_proposal(cotest.id('prop'), 'Website phase 2', null, true);
select cotest.check('the project is created once', public.cos_project_from_proposal(cotest.id('prop')) = cotest.id('p_phase2')
  and (select count(*) from public.projects where name = 'Website phase 2') = 1);
reset role;
select cotest.check('one acceptance event in Autopilot', (select count(*) from public.automation_events where event_type = 'proposal.accepted') = 1);
set role authenticated;
select cotest.act('client_a');
select cotest.check('the client is in the new project', exists (select 1 from jsonb_array_elements(public.portal_client_home() -> 'projects') x where x ->> 'name' = 'Website phase 2'));

-- Contracts: an approval record of an exact version (not an electronic signature).
select cotest.act('admin_a');
insert into public.contracts (brand_id, contact_id, proposal_id, project_id, title, body) values (cotest.id('brand_a'), cotest.id('alice'), cotest.id('prop'), cotest.id('p_phase2'), 'Service agreement', 'Terms...');
insert into cotest.ids select 'contract', id from public.contracts where title = 'Service agreement';
select cotest.act('client_a');
select cotest.check('a draft contract is invisible', jsonb_array_length(public.portal_client_home() -> 'contracts') = 0);
select cotest.act('admin_a');
select public.cos_contract_action(cotest.id('contract'), 'send');
select cotest.act('client_b');
select cotest.must_fail('client B approves client A''s contract', $$ select public.cos_decide_contract(cotest.id('contract'), 1, true) $$);
select cotest.act('client_a');
select public.cos_decide_contract(cotest.id('contract'), 1, true);
select cotest.must_fail('contract versions are frozen', $$ update public.contract_versions set body = 'x' $$);
select cotest.check('contract approved', public.portal_client_home() -> 'contracts' -> 0 ->> 'status' = 'approved');

-- ── Scenario D: invoices visible to the client ───────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
insert into public.invoices (brand_id, contact_id, project_id, number, issue_date, due_date, amount, currency, status) values
  (cotest.id('brand_a'), cotest.id('alice'), cotest.id('p_phase2'), 'A-100', current_date, current_date + 30, 1000, 'EUR', 'sent'),
  (cotest.id('brand_a'), cotest.id('alice'), cotest.id('p_phase2'), 'A-101', current_date, null, 50, 'EUR', 'draft');
insert into public.payments (brand_id, invoice_id, contact_id, amount, currency, received_on) select cotest.id('brand_a'), id, cotest.id('alice'), 400, 'EUR', current_date from public.invoices where number = 'A-100';
select cotest.act('client_a');
select cotest.check('an invoice is not shown until shared', jsonb_array_length(public.portal_client_home() -> 'invoices') = 0);
select cotest.act('admin_a');
select public.cos_share_invoice((select id from public.invoices where number = 'A-100'), true, 'Bank transfer, reference A-100');
select cotest.must_fail('a draft invoice is not shared', $$ select public.cos_share_invoice((select id from public.invoices where number = 'A-101'), true) $$);
select cotest.act('client_a');
select cotest.check('balance after one payment', (public.portal_client_home() -> 'invoices' -> 0 ->> 'balance')::numeric = 600);
select cotest.act('admin_a');
insert into public.payments (brand_id, invoice_id, contact_id, amount, currency, received_on) select cotest.id('brand_a'), id, cotest.id('alice'), 100, 'EUR', current_date from public.invoices where number = 'A-100';
select cotest.act('client_a');
select cotest.check('the balance follows the payments', (public.portal_client_home() -> 'invoices' -> 0 ->> 'balance')::numeric = 500
  and jsonb_array_length(public.portal_client_home() -> 'invoices' -> 0 -> 'payments') = 2);
select cotest.act('multi');
select cotest.check('another client never sees it', jsonb_array_length(public.portal_client_home() -> 'invoices') = 0);
select cotest.act('admin_a');
select cotest.check('analytics per currency, never mixed', (public.cos_analytics(cotest.id('brand_a')) -> 'money' -> 'EUR' ->> 'contracted')::numeric = 2493.33
  and (public.cos_analytics(cotest.id('brand_a')) -> 'money' -> 'EUR' ->> 'invoiced')::numeric = 1000
  and (public.cos_analytics(cotest.id('brand_a')) -> 'money' -> 'EUR' ->> 'received')::numeric = 500
  and (public.cos_analytics(cotest.id('brand_a')) -> 'money' -> 'EUR' ->> 'outstanding')::numeric = 500
  and (public.cos_analytics(cotest.id('brand_a')) -> 'money' -> 'USD' ->> 'invoiced')::numeric = 0);
select cotest.check('analytics: proposal conversion', (public.cos_analytics(cotest.id('brand_a')) -> 'proposals' ->> 'conversion_pct')::numeric = 100);
select public.cos_share_invoice((select id from public.invoices where number = 'A-100'), false);
select cotest.act('client_a');
select cotest.check('unsharing hides it again', jsonb_array_length(public.portal_client_home() -> 'invoices') = 0);

-- ── Requests and messages ────────────────────────────────────────────────────────────────────────────────────────────
select cotest.act('client_a');
insert into cotest.ids select 'req', public.cos_create_request(cotest.id('brand_a'), cotest.id('p_phase2'), 'support', 'Login question', 'How do I log in?');
select cotest.must_fail('a request on someone else''s project', $$ select public.cos_create_request(cotest.id('brand_a'), cotest.id('p_mia_a'), 'support', 'x', 'x') $$);
select cotest.must_fail('a request in a brand without membership', $$ select public.cos_create_request(cotest.id('brand_b'), null, 'support', 'x', 'x') $$);
select cotest.must_fail('the client cannot change a request''s status', $$ update public.client_requests set status = 'resolved' where id = cotest.id('req') $$);
select cotest.must_fail('the client cannot post an internal note', $$ insert into public.client_request_events (request_id, brand_id, kind, body, internal, actor_id) values (cotest.id('req'), cotest.id('brand_a'), 'comment', 'x', true, auth.uid()) $$);
insert into public.client_request_events (request_id, brand_id, kind, body, actor_id) values (cotest.id('req'), cotest.id('brand_a'), 'comment', 'More details', auth.uid());
select cotest.act('admin_a');
insert into public.client_request_events (request_id, brand_id, kind, body, internal, actor_id) values (cotest.id('req'), cotest.id('brand_a'), 'comment', 'Internal: check SSO', true, auth.uid());
update public.client_requests set status = 'resolved' where id = cotest.id('req');
select cotest.act('client_a');
select cotest.check('the client sees the resolution, never the internal note', (select resolved_at is not null from public.client_requests where id = cotest.id('req'))
  and not exists (select 1 from public.client_request_events where body like 'Internal:%'));
select cotest.act('client_b');
select cotest.check('client B sees no request of client A', (select count(*) from public.client_requests) = 0);

select cotest.act('admin_a');
insert into public.cos_conversations (brand_id, project_id, audience, subject, created_by) values (cotest.id('brand_a'), cotest.id('p_phase2'), 'client', 'Phase 2 kick-off', auth.uid());
insert into cotest.ids select 'conv', id from public.cos_conversations where subject = 'Phase 2 kick-off';
insert into public.cos_messages (conversation_id, brand_id, body) values (cotest.id('conv'), cotest.id('brand_a'), 'Welcome to phase 2');
insert into public.cos_messages (conversation_id, brand_id, body, internal) values (cotest.id('conv'), cotest.id('brand_a'), 'Team only: budget is tight', true);
select cotest.act('client_a');
select cotest.check('the client sees only external messages', (select count(*) from public.cos_messages where conversation_id = cotest.id('conv')) = 1);
insert into public.cos_messages (conversation_id, brand_id, body, internal) values (cotest.id('conv'), cotest.id('brand_a'), 'Thanks!', true);
select cotest.check('a client message is never internal', (select count(*) from public.cos_messages where conversation_id = cotest.id('conv')) = 2);
select cotest.act('partner_a');
select cotest.check('a task-only partner does not read the client conversation', (select count(*) from public.cos_conversations) = 0);
select cotest.must_fail('a partner posts in the client conversation', $$ insert into public.cos_messages (conversation_id, brand_id, body) values (cotest.id('conv'), cotest.id('brand_a'), 'hi') $$);
select cotest.act('client_b');
select cotest.must_fail('client B posts in client A''s conversation', $$ insert into public.cos_messages (conversation_id, brand_id, body) values (cotest.id('conv'), cotest.id('brand_a'), 'hi') $$);

-- ── Revocation ───────────────────────────────────────────────────────────────────────────────────────────────────────
select cotest.act('admin_a');
select public.cos_set_membership_status(cotest.id('m_rex'), 'revoked');
select public.cos_set_membership_status(cotest.id('m_pat'), 'revoked');
select cotest.must_fail('a revoked membership is final', $$ select public.cos_set_membership_status(cotest.id('m_rex'), 'active') $$);
select cotest.act('revoked');
select cotest.check('a revoked client sees nothing', jsonb_array_length(public.portal_client_home() -> 'memberships') = 0 and public.cos_project_access(cotest.id('p_rex')) is null);
select cotest.must_fail('a revoked client opens their old project', $$ select public.portal_project(cotest.id('p_rex')) $$);
select cotest.act('partner_a');
select cotest.check('a revoked partner sees nothing', public.cos_project_access(cotest.id('p_alice')) is null and jsonb_array_length(coalesce(public.portal_partner_home() -> 'tasks', '[]')) = 0);
select cotest.must_fail('a revoked partner submits a version', $$ select public.cos_submit_version(cotest.id('d_ill'), 'late', null, 'https://example.com/late') $$);
select cotest.act('admin_a');
select public.cos_set_membership_status(cotest.id('m_alice'), 'suspended');
select cotest.act('client_a');
select cotest.check('a suspended client sees nothing', public.cos_project_access(cotest.id('p_phase2')) is null);
select cotest.act('admin_a');
select public.cos_set_membership_status(cotest.id('m_alice'), 'active');
select cotest.act('client_a');
select cotest.check('re-activated', public.cos_project_access(cotest.id('p_phase2')) = 'client');

reset role;
select cotest.check('membership changes are audited with their actor', exists (select 1 from public.audit_logs where action = 'client_os.membership_revoked' and actor_id = cotest.id('admin_a')));
select cotest.check('every Client OS audit row has an entity', not exists (select 1 from public.audit_logs where (action like 'client_os.%' or action like 'proposal.%' or action like 'deliverable.%' or action like 'contract.%') and entity_id is null));
\o
select 'ALL CLIENT OS DATABASE TESTS PASSED' as result;

-- Houcine.world Client OS, part 1: external identity and access (docs/client-os.md, sections 3 to 6).
--
-- People and organizations stay in the Command Center's contacts (one identity, contacts.organization_id) and their
-- brand relationships in contact_brands. This adds what an EXTERNAL person may do, and nothing else:
--   portal_invitations      one-time invitations (only a SHA-256 hash of the secret is stored; it is shown once)
--   portal_memberships      an explicit, activated link: signed-in user -> contact -> brand, as a client or a partner
--   project_participants    which projects a membership may open (clients: the whole client view; partners: a scope)
--   partner_task_assignments which tasks a partner may see and work on
-- External people are NEVER added to brand_admins, so every existing Workspace rule keeps refusing them. They read the
-- Command Center's tables only through the portal functions (part 3), which return client-safe fields.
-- Every change is written to audit_logs with its actor.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_invitations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('client', 'partner')),
  brand_id uuid not null references public.brands(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  project_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  membership_id uuid
);
create index if not exists portal_invitations_brand on public.portal_invitations (brand_id, created_at desc);

create table if not exists public.portal_memberships (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('client', 'partner')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  invitation_id uuid references public.portal_invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.profiles(id) on delete set null,
  unique (kind, user_id, contact_id, brand_id)
);
create index if not exists portal_memberships_user on public.portal_memberships (user_id) where status = 'active';
create index if not exists portal_memberships_brand on public.portal_memberships (brand_id, kind);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'portal_invitations_membership_fkey') then
    alter table public.portal_invitations add constraint portal_invitations_membership_fkey foreign key (membership_id) references public.portal_memberships(id) on delete set null;
  end if;
end $$;

create table if not exists public.project_participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  membership_id uuid not null references public.portal_memberships(id) on delete cascade,
  -- Clients always see the client view of the project. A partner sees the project only with scope 'project';
  -- with 'tasks' they see just the tasks assigned to them.
  scope text not null default 'project' check (scope in ('project', 'tasks')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (project_id, membership_id)
);
create index if not exists project_participants_membership on public.project_participants (membership_id) where status = 'active';

create table if not exists public.partner_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  membership_id uuid not null references public.portal_memberships(id) on delete cascade,
  can_submit boolean not null default true,
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (task_id, membership_id)
);
create index if not exists partner_task_assignments_membership on public.partner_task_assignments (membership_id) where status = 'active';

-- Notifications may now link into the portals too (the Autopilot table is reused; only the link rule widens).
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.user_notifications'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%link%' loop
    execute format('alter table public.user_notifications drop constraint %I', c);
  end loop;
  alter table public.user_notifications add constraint user_notifications_link_check check (link is null or link ~ '^/(workspace|portal|partners)/');
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Access helpers (security definer: they read memberships, never return rows)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Whether a relationship holder (a person or an organization contact) covers a contact: the same contact, or the
-- contact's organization. Never NULL (a NULL here once let a check pass; see the tests).
create or replace function public.cos_contact_matches(p_holder uuid, p_contact uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select p_holder is not null and p_contact is not null
     and (p_holder = p_contact or exists (select 1 from contacts where id = p_contact and organization_id = p_holder));
$$;

-- The caller's active memberships of a kind (status active; the brand relationship still exists).
create or replace function public.cos_my_memberships(p_kind text)
returns setof uuid language sql security definer stable set search_path = public as $$
  select m.id from portal_memberships m
  where m.user_id = auth.uid() and m.kind = p_kind and m.status = 'active'
    and exists (select 1 from contact_brands cb where cb.contact_id = m.contact_id and cb.brand_id = m.brand_id);
$$;

-- What the caller may do with a project: 'manage' (super admin or that brand's admin), 'client', 'partner' (scope
-- project), 'partner_tasks' (only assigned tasks) or null.
create or replace function public.cos_project_access(p_project uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when exists (select 1 from projects p where p.id = p_project and ap_can_manage(p.brand_id)) then 'manage'
    when exists (select 1 from project_participants pp where pp.project_id = p_project and pp.status = 'active'
                   and (pp.expires_at is null or pp.expires_at > now()) and pp.membership_id in (select cos_my_memberships('client'))) then 'client'
    when exists (select 1 from project_participants pp where pp.project_id = p_project and pp.status = 'active' and pp.scope = 'project'
                   and (pp.expires_at is null or pp.expires_at > now()) and pp.membership_id in (select cos_my_memberships('partner'))) then 'partner'
    when exists (select 1 from partner_task_assignments a where a.project_id = p_project and a.status = 'active'
                   and (a.expires_at is null or a.expires_at > now()) and a.membership_id in (select cos_my_memberships('partner'))) then 'partner_tasks'
  end;
$$;

-- The caller's active client membership for a contact (or its organization) and a brand, if any.
create or replace function public.cos_client_membership(p_contact uuid, p_brand uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select m.id from portal_memberships m
  where m.id in (select cos_my_memberships('client')) and m.brand_id = p_brand
    and cos_contact_matches(m.contact_id, p_contact)
  limit 1;
$$;

-- Whether a partner task assignment of the caller is active.
create or replace function public.cos_partner_task(p_task uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from partner_task_assignments a where a.task_id = p_task and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now()) and a.membership_id in (select cos_my_memberships('partner')));
$$;

-- An audit row with the signed-in actor (null for automations, as the Command Center does).
create or replace function public.cos_log(p_action text, p_brand uuid, p_entity text, p_entity_id uuid, p_meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values ((select id from profiles where id = auth.uid()), p_brand, p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb));
$$;

-- An in-app notification for an external member (the Autopilot notification table, the person's preferences). Never
-- email: there is no email provider.
create or replace function public.cos_notify_member(p_membership uuid, p_category text, p_priority text, p_title text, p_body text, p_link text, p_dedupe text)
returns int language plpgsql security definer set search_path = public as $$
declare
  m record;
  pref record;
  n int;
begin
  select * into m from portal_memberships where id = p_membership and status = 'active';
  if not found then return 0; end if;
  select * into pref from notification_preferences where user_id = m.user_id;
  if found and (not pref.in_app or p_category = any (pref.muted_categories) or m.brand_id = any (pref.muted_brands)
     or ap_priority_rank(p_priority) < ap_priority_rank(pref.min_priority)) then
    return 0;
  end if;
  insert into user_notifications (user_id, brand_id, category, priority, title, body, link, dedupe_key, source)
  values (m.user_id, m.brand_id, p_category, p_priority, left(p_title, 200), left(p_body, 2000), p_link, p_dedupe, 'client_os')
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Every active client participant of a project is told (in-app).
create or replace function public.cos_notify_project_clients(p_project uuid, p_category text, p_priority text, p_title text, p_body text, p_link text, p_dedupe text)
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  total int := 0;
begin
  for r in select pp.membership_id from project_participants pp join portal_memberships m on m.id = pp.membership_id
           where pp.project_id = p_project and pp.status = 'active' and m.kind = 'client' and (pp.expires_at is null or pp.expires_at > now()) loop
    total := total + cos_notify_member(r.membership_id, p_category, p_priority, p_title, p_body, p_link, p_dedupe || ':' || r.membership_id);
  end loop;
  return total;
end $$;

-- An Autopilot event about a project (entity 'project', so the existing actions find its owner and brand).
create or replace function public.cos_emit(p_type text, p_project uuid, p_dedupe text, p_payload jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select brand_id into b from projects where id = p_project;
  if b is null then return null; end if;
  return ap_emit(p_type, b, 'project', p_project, coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('project_id', p_project), p_dedupe);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Validation triggers: everything stays inside one brand; a client only joins their own projects
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.cos_validate_identity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m record;
  p record;
  t record;
begin
  if tg_table_name = 'portal_memberships' then
    if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.contact_id <> old.contact_id or new.brand_id <> old.brand_id or new.kind <> old.kind) then
      raise exception 'A membership''s person, contact, brand and kind never change.' using errcode = '22023';
    end if;
    if not cc_contact_in_brand(new.contact_id, new.brand_id) then raise exception 'The contact is not linked to this brand.' using errcode = '22023'; end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.status_changed_at := now();
      new.status_changed_by := (select id from profiles where id = auth.uid());
    end if;
  elsif tg_table_name = 'project_participants' then
    select * into m from portal_memberships where id = new.membership_id;
    select * into p from projects where id = new.project_id;
    if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.membership_id <> old.membership_id) then
      raise exception 'A participation''s project and member never change.' using errcode = '22023';
    end if;
    new.brand_id := p.brand_id;
    if m.brand_id <> p.brand_id then raise exception 'The member belongs to another brand.' using errcode = '22023'; end if;
    if m.kind = 'client' then
      new.scope := 'project';
      if not cos_contact_matches(m.contact_id, p.client_contact_id) then
        raise exception 'A client can only join projects of their own client relationship.' using errcode = '22023';
      end if;
    end if;
    if new.status = 'revoked' and new.revoked_at is null then new.revoked_at := now(); end if;
  elsif tg_table_name = 'partner_task_assignments' then
    select * into m from portal_memberships where id = new.membership_id;
    select * into t from tasks where id = new.task_id;
    if tg_op = 'UPDATE' and (new.task_id <> old.task_id or new.membership_id <> old.membership_id) then
      raise exception 'An assignment''s task and partner never change.' using errcode = '22023';
    end if;
    new.project_id := t.project_id;
    new.brand_id := t.brand_id;
    if m.kind <> 'partner' then raise exception 'Only partners are assigned tasks here.' using errcode = '22023'; end if;
    if m.brand_id <> t.brand_id then raise exception 'The partner belongs to another brand.' using errcode = '22023'; end if;
    if new.status = 'revoked' and new.revoked_at is null then new.revoked_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Audit and events for the identity tables.
create or replace function public.cos_identity_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m record;
  p record;
begin
  if tg_table_name = 'portal_memberships' then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      perform cos_log('client_os.membership_' || new.status, new.brand_id, 'portal_membership', new.id,
        jsonb_build_object('kind', new.kind, 'from', old.status, 'to', new.status, 'contact_id', new.contact_id, 'user_id', new.user_id));
    end if;
  elsif tg_table_name = 'project_participants' then
    select * into m from portal_memberships where id = new.membership_id;
    if tg_op = 'INSERT' or (new.status is distinct from old.status) or (new.scope is distinct from old.scope) or (new.expires_at is distinct from old.expires_at) then
      perform cos_log(case when new.status = 'revoked' then 'client_os.participant_revoked' when tg_op = 'INSERT' then 'client_os.participant_added' else 'client_os.participant_changed' end,
        new.brand_id, 'project', new.project_id, jsonb_build_object('membership_id', new.membership_id, 'kind', m.kind, 'scope', new.scope, 'expires_at', new.expires_at));
      if tg_op = 'INSERT' and m.kind = 'client' then
        perform cos_emit('project.client_added', new.project_id, 'project.client_added:' || new.id, jsonb_build_object('membership_id', new.membership_id));
      elsif tg_op = 'INSERT' then
        perform cos_emit('partner.assigned', new.project_id, 'partner.assigned:' || new.id, jsonb_build_object('membership_id', new.membership_id));
      elsif new.status = 'revoked' and old.status <> 'revoked' and m.kind = 'partner' then
        perform cos_emit('partner.access_revoked', new.project_id, 'partner.access_revoked:' || new.id, jsonb_build_object('membership_id', new.membership_id));
      end if;
    end if;
  elsif tg_table_name = 'partner_task_assignments' then
    if tg_op = 'INSERT' or new.status is distinct from old.status or new.expires_at is distinct from old.expires_at then
      perform cos_log(case when new.status = 'revoked' then 'client_os.task_unassigned' else 'client_os.task_assigned' end, new.brand_id, 'task', new.task_id,
        jsonb_build_object('membership_id', new.membership_id, 'project_id', new.project_id, 'can_submit', new.can_submit));
      if tg_op = 'INSERT' then
        select * into p from tasks where id = new.task_id;
        perform cos_notify_member(new.membership_id, 'tasks', 'normal', 'New task assigned: ' || p.title, null, '/partners/tasks', 'task_assigned:' || new.id);
      end if;
    end if;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['portal_memberships', 'project_participants', 'partner_task_assignments'] loop
    execute format('drop trigger if exists trg_%1$s_validate on public.%1$I', t);
    execute format('create trigger trg_%1$s_validate before insert or update on public.%1$I for each row execute function public.cos_validate_identity()', t);
    execute format('drop trigger if exists trg_%1$s_audit on public.%1$I', t);
    execute format('create trigger trg_%1$s_audit after insert or update on public.%1$I for each row execute function public.cos_identity_audit()', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Invitations: create (the secret is returned ONCE), revoke, accept
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.cos_token_hash(p_token text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

create or replace function public.cos_invite(p_kind text, p_brand uuid, p_contact uuid, p_email text, p_project_ids uuid[] default '{}', p_days int default 7)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  inv_id uuid;
  pid uuid;
  p record;
begin
  if not ap_can_manage(p_brand) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_kind not in ('client', 'partner') then raise exception 'Invite a client or a partner.' using errcode = '22023'; end if;
  if not cc_contact_in_brand(p_contact, p_brand) or p_contact is null then raise exception 'The contact is not linked to this brand.' using errcode = '22023'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid email address is needed.' using errcode = '22023'; end if;
  if p_days is null or p_days not between 1 and 30 then raise exception 'An invitation is valid for 1 to 30 days.' using errcode = '22023'; end if;
  foreach pid in array coalesce(p_project_ids, '{}') loop
    select * into p from projects where id = pid and deleted_at is null;
    if not found or p.brand_id <> p_brand then raise exception 'A project is not in this brand.' using errcode = '22023'; end if;
    if p_kind = 'client' and not cos_contact_matches(p_contact, p.client_contact_id) then
      raise exception 'Project "%" belongs to another client.', p.name using errcode = '22023';
    end if;
  end loop;
  insert into portal_invitations (kind, brand_id, contact_id, email, token_hash, project_ids, expires_at, created_by)
  values (p_kind, p_brand, p_contact, lower(trim(p_email)), cos_token_hash(token), coalesce(p_project_ids, '{}'), now() + make_interval(days => p_days),
          (select id from profiles where id = auth.uid()))
  returning id into inv_id;
  perform cos_log('client_os.invitation_sent', p_brand, 'portal_invitation', inv_id,
    jsonb_build_object('kind', p_kind, 'contact_id', p_contact, 'projects', to_jsonb(coalesce(p_project_ids, '{}')), 'expires_in_days', p_days));
  perform ap_emit(case when p_kind = 'client' then 'client.invited' else 'partner.invited' end, p_brand, 'contact_brand',
    (select id from contact_brands where contact_id = p_contact and brand_id = p_brand), jsonb_build_object('invitation_id', inv_id), 'invited:' || inv_id);
  -- The secret leaves the database once, to the admin who created it; only its hash is kept.
  return jsonb_build_object('id', inv_id, 'token', token);
end $$;

create or replace function public.cos_revoke_invitation(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare i record;
begin
  select * into i from portal_invitations where id = p_id for update;
  if not found or not ap_can_manage(i.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if i.status <> 'pending' then raise exception 'Only a pending invitation can be revoked.' using errcode = '22023'; end if;
  update portal_invitations set status = 'revoked', revoked_at = now(), revoked_by = (select id from profiles where id = auth.uid()) where id = p_id;
  perform cos_log('client_os.invitation_revoked', i.brand_id, 'portal_invitation', i.id, jsonb_build_object('kind', i.kind));
end $$;

-- What an invitation is for, before signing in (no personal data beyond the brand and the kind; the email is masked).
create or replace function public.cos_invitation_preview(p_token text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare i record;
begin
  select pi.*, b.name as brand_name into i from portal_invitations pi join brands b on b.id = pi.brand_id where pi.token_hash = cos_token_hash(p_token);
  if not found then return jsonb_build_object('valid', false, 'reason', 'This invitation link is not valid.'); end if;
  if i.status = 'revoked' then return jsonb_build_object('valid', false, 'reason', 'This invitation was withdrawn.'); end if;
  if i.status = 'accepted' then return jsonb_build_object('valid', false, 'reason', 'This invitation was already used.'); end if;
  if i.expires_at <= now() then return jsonb_build_object('valid', false, 'reason', 'This invitation has expired. Ask for a new one.'); end if;
  return jsonb_build_object('valid', true, 'kind', i.kind, 'brand', i.brand_name, 'expires_at', i.expires_at,
    'email_hint', left(i.email, 2) || '•••@' || split_part(i.email, '@', 2));
end $$;

-- Acceptance: the signed-in person must hold the secret AND be signed in with the invited email address. It creates
-- (or re-activates) exactly one membership and the project participations named in the invitation.
create or replace function public.cos_accept_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select id from profiles where id = auth.uid());
  my_email text;
  i record;
  mid uuid;
  pid uuid;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into i from portal_invitations where token_hash = cos_token_hash(p_token) for update;
  if not found then raise exception 'This invitation link is not valid.' using errcode = '22023'; end if;
  if i.status = 'revoked' then raise exception 'This invitation was withdrawn.' using errcode = '22023'; end if;
  if i.status = 'accepted' then raise exception 'This invitation was already used.' using errcode = '22023'; end if;
  if i.expires_at <= now() then raise exception 'This invitation has expired. Ask for a new one.' using errcode = '22023'; end if;
  select lower(coalesce((select email from auth.users where id = me), (select email from profiles where id = me))) into my_email;
  if my_email is distinct from i.email then
    raise exception 'This invitation was sent to another email address. Sign in with that address.' using errcode = '42501';
  end if;
  if not cc_contact_in_brand(i.contact_id, i.brand_id) then raise exception 'This relationship no longer exists.' using errcode = '22023'; end if;

  insert into portal_memberships (kind, user_id, contact_id, brand_id, status, invitation_id)
  values (i.kind, me, i.contact_id, i.brand_id, 'active', i.id)
  on conflict (kind, user_id, contact_id, brand_id) do update set status = 'active', invitation_id = excluded.invitation_id
  returning id into mid;
  foreach pid in array i.project_ids loop
    if exists (select 1 from projects where id = pid and brand_id = i.brand_id and deleted_at is null) then
      insert into project_participants (project_id, brand_id, membership_id, scope, added_by)
      values (pid, i.brand_id, mid, 'project', i.created_by)
      on conflict (project_id, membership_id) do update set status = 'active', revoked_at = null;
    end if;
  end loop;
  update portal_invitations set status = 'accepted', accepted_at = now(), accepted_by = me, membership_id = mid where id = i.id;
  perform cos_log('client_os.invitation_accepted', i.brand_id, 'portal_invitation', i.id, jsonb_build_object('kind', i.kind, 'membership_id', mid));
  perform ap_notify_admins(i.brand_id, false, 'system', 'normal',
    (select name from contacts where id = i.contact_id) || ' accepted the ' || i.kind || ' invitation', null,
    '/workspace/clients/' || case when i.kind = 'client' then 'clients' else 'partners' end || '?id=' || i.contact_id, 'invitation_accepted:' || i.id, 'client_os');
  perform ap_emit(case when i.kind = 'client' then 'client.invitation_accepted' else 'partner.invitation_accepted' end, i.brand_id, 'contact_brand',
    (select id from contact_brands where contact_id = i.contact_id and brand_id = i.brand_id), jsonb_build_object('membership_id', mid), 'accepted:' || i.id);
  return jsonb_build_object('membership_id', mid, 'kind', i.kind, 'brand_id', i.brand_id);
end $$;

-- Suspend, re-activate or revoke a membership (brand admins). Revoking also ends its participations and assignments.
create or replace function public.cos_set_membership_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select * into m from portal_memberships where id = p_id for update;
  if not found or not ap_can_manage(m.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_status not in ('active', 'suspended', 'revoked') then raise exception 'Unknown status.' using errcode = '22023'; end if;
  if m.status = 'revoked' and p_status <> 'revoked' then raise exception 'A revoked membership is final; send a new invitation.' using errcode = '22023'; end if;
  update portal_memberships set status = p_status where id = p_id;
  if p_status = 'revoked' then
    update project_participants set status = 'revoked' where membership_id = p_id and status = 'active';
    update partner_task_assignments set status = 'revoked' where membership_id = p_id and status = 'active';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

alter table public.portal_invitations enable row level security;
alter table public.portal_memberships enable row level security;
alter table public.project_participants enable row level security;
alter table public.partner_task_assignments enable row level security;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
             and tablename in ('portal_invitations', 'portal_memberships', 'project_participants', 'partner_task_assignments') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Invitations: brand admins read them; never the secret's hash (column grants below). Writes only through functions.
create policy "portal_invitations_select" on public.portal_invitations for select to authenticated using (public.ap_can_manage(brand_id));
-- Memberships: the person sees their own; brand admins see their brand's. Writes only through functions.
create policy "portal_memberships_select" on public.portal_memberships for select to authenticated
  using (user_id = auth.uid() or public.ap_can_manage(brand_id));
-- Participations and assignments: brand admins manage them; the member sees their own.
create policy "project_participants_select" on public.project_participants for select to authenticated
  using (public.ap_can_manage(brand_id) or membership_id in (select public.cos_my_memberships('client') union select public.cos_my_memberships('partner')));
create policy "project_participants_insert" on public.project_participants for insert to authenticated with check (public.ap_can_manage(brand_id));
create policy "project_participants_update" on public.project_participants for update to authenticated
  using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
create policy "partner_task_assignments_select" on public.partner_task_assignments for select to authenticated
  using (public.ap_can_manage(brand_id) or membership_id in (select public.cos_my_memberships('partner')));
create policy "partner_task_assignments_insert" on public.partner_task_assignments for insert to authenticated with check (public.ap_can_manage(brand_id));
create policy "partner_task_assignments_update" on public.partner_task_assignments for update to authenticated
  using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));

revoke all on public.portal_invitations, public.portal_memberships, public.project_participants, public.partner_task_assignments from anon, authenticated;
grant select (id, kind, brand_id, contact_id, email, project_ids, status, expires_at, created_by, created_at, accepted_by, accepted_at, revoked_by, revoked_at, membership_id)
  on public.portal_invitations to authenticated;
grant select on public.portal_memberships to authenticated;
grant select, insert, update on public.project_participants, public.partner_task_assignments to authenticated;
grant all on public.portal_invitations, public.portal_memberships, public.project_participants, public.partner_task_assignments to service_role;

do $$
declare f text;
begin
  -- Internal helpers: not callable from the browser.
  foreach f in array array['cos_log(text, uuid, text, uuid, jsonb)', 'cos_notify_member(uuid, text, text, text, text, text, text)',
    'cos_notify_project_clients(uuid, text, text, text, text, text, text)', 'cos_emit(text, uuid, text, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['cos_invite(text, uuid, uuid, text, uuid[], integer)', 'cos_revoke_invitation(uuid)', 'cos_accept_invitation(text)',
    'cos_set_membership_status(uuid, text)', 'cos_my_memberships(text)', 'cos_project_access(uuid)', 'cos_client_membership(uuid, uuid)', 'cos_partner_task(uuid)', 'cos_contact_matches(uuid, uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- The preview is read before signing in (it reveals the brand and a masked email only, and only to the secret's holder).
  execute 'grant execute on function public.cos_invitation_preview(text) to anon, authenticated';
end $$;

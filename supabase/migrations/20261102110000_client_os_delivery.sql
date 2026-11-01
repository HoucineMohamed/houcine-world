-- Houcine.world Client OS, part 2: service delivery (docs/client-os.md, sections 9 to 12).
--   project_lifecycles / lifecycle_stages   configurable stages (global or per brand, per project type), with an
--                                           internal label, a client-facing label, allowed next stages and conditions
--   project_stage_history                   every stage change (append-only)
--   projects.lifecycle_id / stage_key / client_summary, tasks.client_visible   (added columns, nothing removed)
--   deliverables / deliverable_versions / deliverable_reviews   versions are never overwritten; a decision belongs to
--                                           ONE version and is refused on a version that was replaced
--   client_requests / client_request_events requests and their history (internal notes are never shown outside)
--   cos_conversations / cos_messages / cos_message_reads   communication (the brand team chat "messages" is untouched); internal messages are invisible to external people
--   cos_files / cos_file_shares + the private storage bucket "client-os"   files with server-side authorization
--   cos_invoice_shares                      which Command Center invoices a client may see

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Lifecycle
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.project_lifecycles (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  project_type text check (project_type is null or length(project_type) <= 80),
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists project_lifecycles_one_default on public.project_lifecycles (coalesce(brand_id, '00000000-0000-0000-0000-000000000000'::uuid)) where is_default;

create table if not exists public.lifecycle_stages (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.project_lifecycles(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (length(trim(label)) between 1 and 80),
  client_label text check (client_label is null or length(client_label) <= 80),
  position int not null,
  allowed_next text[] not null default '{}',
  requires text[] not null default '{}' check (requires <@ array['tasks_done', 'deliverables_approved', 'proposal_accepted', 'contract_approved']),
  is_final boolean not null default false,
  unique (lifecycle_id, key)
);

alter table public.projects add column if not exists lifecycle_id uuid references public.project_lifecycles(id) on delete set null;
alter table public.projects add column if not exists stage_key text check (stage_key is null or stage_key ~ '^[a-z][a-z0-9_]{0,39}$');
alter table public.projects add column if not exists stage_changed_at timestamptz;
alter table public.projects add column if not exists client_summary text check (client_summary is null or length(client_summary) <= 2000);
alter table public.tasks add column if not exists client_visible boolean not null default false;

create table if not exists public.project_stage_history (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  note text check (note is null or length(note) <= 1000),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_stage_history_project on public.project_stage_history (project_id, created_at);

-- The default lifecycle (global). Brands add their own and mark one as their default.
do $$
declare lid uuid;
begin
  if not exists (select 1 from project_lifecycles where brand_id is null and is_default) then
    insert into project_lifecycles (brand_id, name, is_default) values (null, 'Standard client project', true) returning id into lid;
    insert into lifecycle_stages (lifecycle_id, key, label, client_label, position, requires, is_final) values
      (lid, 'lead', 'Lead', 'Getting started', 1, '{}', false),
      (lid, 'discovery', 'Discovery', 'Getting started', 2, '{}', false),
      (lid, 'proposal', 'Proposal', 'Proposal', 3, '{}', false),
      (lid, 'negotiation', 'Negotiation', 'Proposal', 4, '{}', false),
      (lid, 'contract', 'Contract', 'Agreement', 5, '{proposal_accepted}', false),
      (lid, 'onboarding', 'Onboarding', 'Onboarding', 6, '{}', false),
      (lid, 'planning', 'Planning', 'Planning', 7, '{}', false),
      (lid, 'in_progress', 'In progress', 'In progress', 8, '{}', false),
      (lid, 'internal_review', 'Internal review', 'In progress', 9, '{}', false),
      (lid, 'client_review', 'Client review', 'Your review', 10, '{}', false),
      (lid, 'revision', 'Revision', 'Revisions', 11, '{}', false),
      (lid, 'final_approval', 'Final approval', 'Final approval', 12, '{}', false),
      (lid, 'completed', 'Completed', 'Completed', 13, '{deliverables_approved}', true),
      (lid, 'archived', 'Archived', 'Completed', 14, '{}', true);
  end if;
end $$;

-- The lifecycle a project uses: its own, else its brand's default, else the global default.
create or replace function public.cos_project_lifecycle(p_project uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select coalesce(p.lifecycle_id,
    (select id from project_lifecycles where brand_id = p.brand_id and is_default),
    (select id from project_lifecycles where brand_id is null and is_default))
  from projects p where p.id = p_project;
$$;

-- Move a project to a stage of its lifecycle: allowed transitions and required conditions are checked here.
create or replace function public.cos_set_stage(p_project uuid, p_stage text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p record;
  lid uuid;
  cur record;
  nxt record;
  req text;
  me uuid := (select id from profiles where id = auth.uid());
begin
  select * into p from projects where id = p_project and deleted_at is null for update;
  if not found or not ap_can_manage(p.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  lid := cos_project_lifecycle(p_project);
  select * into nxt from lifecycle_stages where lifecycle_id = lid and key = p_stage;
  if not found then raise exception 'Unknown stage for this project''s lifecycle: %', p_stage using errcode = '22023'; end if;
  if p.stage_key = p_stage then return jsonb_build_object('stage', p_stage, 'changed', false); end if;
  select * into cur from lifecycle_stages where lifecycle_id = lid and key = p.stage_key;
  if found and cardinality(cur.allowed_next) > 0 and not (p_stage = any (cur.allowed_next)) then
    raise exception 'From "%" the project can move to: %.', cur.label, array_to_string(cur.allowed_next, ', ') using errcode = '22023';
  end if;
  foreach req in array nxt.requires loop
    if req = 'tasks_done' and exists (select 1 from tasks where project_id = p_project and status <> 'done') then
      raise exception 'Every task must be done before "%".', nxt.label using errcode = '22023';
    elsif req = 'deliverables_approved' and exists (select 1 from deliverables where project_id = p_project and status <> 'approved') then
      raise exception 'Every deliverable must be approved before "%".', nxt.label using errcode = '22023';
    elsif req = 'proposal_accepted' and not exists (select 1 from proposals where project_id = p_project and status = 'accepted')
          and not exists (select 1 from proposals pr where pr.status = 'accepted' and pr.contact_id = p.client_contact_id and pr.brand_id = p.brand_id) then
      raise exception 'An accepted proposal is needed before "%".', nxt.label using errcode = '22023';
    elsif req = 'contract_approved' and not exists (select 1 from contracts where project_id = p_project and status = 'approved') then
      raise exception 'An approved contract is needed before "%".', nxt.label using errcode = '22023';
    end if;
  end loop;
  update projects set stage_key = p_stage, stage_changed_at = now(), lifecycle_id = lid,
    status = case when nxt.is_final and p_stage <> 'archived' then 'completed' when p.status = 'planned' and nxt.position >= 6 then 'active' else status end,
    completed_at = case when nxt.is_final and p_stage <> 'archived' then coalesce(completed_at, now()) else completed_at end
  where id = p_project;
  insert into project_stage_history (project_id, brand_id, from_stage, to_stage, note, actor_id) values (p_project, p.brand_id, p.stage_key, p_stage, left(p_note, 1000), me);
  perform cos_log('project.stage_changed', p.brand_id, 'project', p_project, jsonb_build_object('from', p.stage_key, 'to', p_stage));
  -- Clients hear about it only when the CLIENT-FACING status changes.
  if coalesce(nxt.client_label, nxt.label) is distinct from coalesce(cur.client_label, cur.label) then
    perform cos_notify_project_clients(p_project, 'projects', 'normal', p.name || ': ' || coalesce(nxt.client_label, nxt.label), null,
      '/portal/projects/' || p_project, 'stage:' || p_project || ':' || p_stage || ':' || extract(epoch from now())::bigint);
    perform cos_emit('project.client_status_changed', p_project, 'client_status:' || p_project || ':' || p_stage || ':' || extract(epoch from now())::bigint,
      jsonb_build_object('stage', p_stage, 'client_status', coalesce(nxt.client_label, nxt.label)));
  end if;
  return jsonb_build_object('stage', p_stage, 'changed', true);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Files (private bucket "client-os"; access decided here, never by a path the browser sends)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.cos_files (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  object_path text not null unique check (object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  file_name text not null check (length(file_name) between 1 and 200),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  purpose text not null check (purpose in ('deliverable', 'request', 'message', 'contract', 'project', 'partner_share')),
  -- internal: brand admins only; client: also the project's clients; partner: partners with access to the project
  -- or an explicit share. The uploader always sees their own file.
  audience text not null default 'internal' check (audience in ('internal', 'client', 'partner')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'revoked')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists cos_files_project on public.cos_files (project_id);

create table if not exists public.cos_file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.cos_files(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  membership_id uuid not null references public.portal_memberships(id) on delete cascade,
  expires_at timestamptz,
  shared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (file_id, membership_id)
);

create or replace function public.cos_allowed_mime(p text) returns boolean language sql immutable as $$
  select p in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'text/plain', 'text/csv',
    'application/zip', 'audio/mpeg', 'audio/wav', 'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation');
$$;

create or replace function public.cos_can_read_file(p_file uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from cos_files f where f.id = p_file and f.status <> 'revoked' and (
      ap_can_manage(f.brand_id)
      or (f.uploaded_by = auth.uid() and f.status = 'pending')
      or (f.status = 'ready' and (
        f.uploaded_by = auth.uid()
        or (f.audience = 'client' and f.project_id is not null and cos_project_access(f.project_id) = 'client')
        or (f.audience = 'partner' and f.project_id is not null and cos_project_access(f.project_id) = 'partner')
        or exists (select 1 from cos_file_shares s where s.file_id = f.id and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
                     and s.membership_id in (select cos_my_memberships('partner') union select cos_my_memberships('client')))))));
$$;

-- Step 1 of an upload: the server checks the person's right to attach a file here and returns the path to upload to.
create or replace function public.cos_register_upload(p_brand uuid, p_project uuid, p_purpose text, p_file_name text, p_mime text, p_size bigint, p_audience text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  access text;
  fid uuid := gen_random_uuid();
  safe text := regexp_replace(regexp_replace(coalesce(p_file_name, 'file'), '[^A-Za-z0-9._-]+', '-', 'g'), '^[.-]+', '');
  aud text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if not cos_allowed_mime(p_mime) then raise exception 'This file type is not accepted.' using errcode = '22023'; end if;
  if p_size is null or p_size < 1 or p_size > 26214400 then raise exception 'Files are limited to 25 MB.' using errcode = '22023'; end if;
  if p_project is not null then
    if not exists (select 1 from projects where id = p_project and brand_id = p_brand) then raise exception 'Not allowed.' using errcode = '42501'; end if;
    access := cos_project_access(p_project);
  elsif ap_can_manage(p_brand) then access := 'manage';
  elsif exists (select 1 from portal_memberships where id in (select cos_my_memberships('client')) and brand_id = p_brand) then access := 'client_relationship';
  end if;
  if access is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  aud := case when access = 'manage' then coalesce(p_audience, 'internal')
              when access in ('client', 'client_relationship') then 'client' else 'partner' end;
  if aud not in ('internal', 'client', 'partner') then raise exception 'Unknown audience.' using errcode = '22023'; end if;
  if access <> 'manage' and p_purpose not in ('deliverable', 'request', 'message') then raise exception 'Not allowed.' using errcode = '42501'; end if;
  safe := left(coalesce(nullif(safe, ''), 'file'), 120);
  insert into cos_files (id, brand_id, project_id, object_path, file_name, mime_type, size_bytes, purpose, audience, uploaded_by)
  values (fid, p_brand, p_project, p_brand || '/' || fid || '/' || safe, left(p_file_name, 200), p_mime, p_size, p_purpose, aud, auth.uid());
  return jsonb_build_object('id', fid, 'path', p_brand || '/' || fid || '/' || safe, 'bucket', 'client-os');
end $$;

-- Step 2: once the object is stored, the file becomes usable (the object must exist under the registered path).
create or replace function public.cos_complete_upload(p_file uuid)
returns void language plpgsql security definer set search_path = public as $$
declare f record;
begin
  select * into f from cos_files where id = p_file for update;
  if not found or f.uploaded_by is distinct from auth.uid() or f.status <> 'pending' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'client-os' and name = f.object_path) then raise exception 'The file was not uploaded.' using errcode = '22023'; end if;
  update cos_files set status = 'ready' where id = p_file;
  perform cos_log('client_os.file_uploaded', f.brand_id, 'file', f.id, jsonb_build_object('purpose', f.purpose, 'audience', f.audience, 'project_id', f.project_id, 'size', f.size_bytes));
end $$;

create or replace function public.cos_revoke_file(p_file uuid)
returns void language plpgsql security definer set search_path = public as $$
declare f record;
begin
  select * into f from cos_files where id = p_file for update;
  if not found or not ap_can_manage(f.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  update cos_files set status = 'revoked', revoked_at = now() where id = p_file;
  perform cos_log('client_os.file_revoked', f.brand_id, 'file', f.id, '{}');
end $$;

create or replace function public.cos_share_file(p_file uuid, p_membership uuid, p_expires timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  f record;
  m record;
  sid uuid;
begin
  select * into f from cos_files where id = p_file;
  select * into m from portal_memberships where id = p_membership;
  if f.id is null or not ap_can_manage(f.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if m.id is null or m.brand_id <> f.brand_id then raise exception 'That person belongs to another brand.' using errcode = '22023'; end if;
  insert into cos_file_shares (file_id, brand_id, membership_id, expires_at, shared_by)
  values (p_file, f.brand_id, p_membership, p_expires, auth.uid())
  on conflict (file_id, membership_id) do update set revoked_at = null, expires_at = excluded.expires_at
  returning id into sid;
  perform cos_log('client_os.file_shared', f.brand_id, 'file', f.id, jsonb_build_object('membership_id', p_membership, 'expires_at', p_expires));
  perform cos_notify_member(p_membership, 'projects', 'normal', 'A file was shared with you: ' || f.file_name, null, '/partners/files', 'file_share:' || sid || ':' || extract(epoch from now())::bigint);
  return sid;
end $$;

create or replace function public.cos_unshare_file(p_share uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from cos_file_shares where id = p_share;
  if not found or not ap_can_manage(s.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  update cos_file_shares set revoked_at = now() where id = p_share;
  perform cos_log('client_os.file_unshared', s.brand_id, 'file', s.file_id, jsonb_build_object('membership_id', s.membership_id));
end $$;

-- The private bucket (25 MB, the accepted types). Storage reads go through cos_can_read_file: a signed URL can only be
-- created for an object the person may read, and it lives 60 seconds (docs/client-os.md section 12).
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('client-os', 'client-os', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'text/plain', 'text/csv',
      'application/zip', 'audio/mpeg', 'audio/wav', 'video/mp4', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
    on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
    drop policy if exists "client_os_objects_insert" on storage.objects;
    drop policy if exists "client_os_objects_select" on storage.objects;
    create policy "client_os_objects_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'client-os' and exists (select 1 from public.cos_files f where f.object_path = name and f.uploaded_by = auth.uid() and f.status = 'pending'));
    create policy "client_os_objects_select" on storage.objects for select to authenticated
      using (bucket_id = 'client-os' and exists (select 1 from public.cos_files f where f.object_path = name and public.cos_can_read_file(f.id)));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Deliverables, versions, reviews
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  description text check (description is null or length(description) <= 4000),
  responsible_id uuid references public.profiles(id) on delete set null,
  partner_membership_id uuid references public.portal_memberships(id) on delete set null,
  due_date date,
  -- Maintained by the version and review functions only.
  status text not null default 'draft' check (status in ('draft', 'internal_review', 'submitted', 'approved', 'revision_requested', 'rejected')),
  current_version int not null default 0,
  approved_version int,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deliverables_project on public.deliverables (project_id);

create table if not exists public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  version int not null,
  -- 'client': shown to the client for review; 'internal': a partner's submission, reviewed by the team first.
  audience text not null check (audience in ('client', 'internal')),
  note text check (note is null or length(note) <= 4000),
  file_id uuid references public.cos_files(id) on delete set null,
  link_url text check (link_url is null or (length(link_url) <= 500 and link_url ~ '^https://')),
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  unique (deliverable_id, version)
);

create table if not exists public.deliverable_reviews (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.deliverable_versions(id) on delete cascade,
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  reviewer_kind text not null check (reviewer_kind in ('client', 'internal')),
  decision text not null check (decision in ('approved', 'rejected', 'revision_requested')),
  comment text check (comment is null or length(comment) <= 4000),
  reviewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (version_id, reviewer_kind)
);

-- Who may see a deliverable and which of its versions.
create or replace function public.cos_can_see_deliverable(p_deliverable uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from deliverables d where d.id = p_deliverable and (
    cos_project_access(d.project_id) in ('manage', 'client', 'partner')
    or (d.partner_membership_id in (select cos_my_memberships('partner')))));
$$;

-- Submit a new version (never replaces an earlier one). A brand admin's version goes to the client; an assigned
-- partner's goes to internal review first.
create or replace function public.cos_submit_version(p_deliverable uuid, p_note text, p_file uuid default null, p_link text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d record;
  manage boolean;
  partner boolean;
  v int;
  vid uuid;
  aud text;
  f record;
begin
  select * into d from deliverables where id = p_deliverable for update;
  if not found then raise exception 'Not allowed.' using errcode = '42501'; end if;
  manage := ap_can_manage(d.brand_id);
  partner := not manage and d.partner_membership_id in (select cos_my_memberships('partner'))
             and (d.task_id is null or exists (select 1 from partner_task_assignments a where a.task_id = d.task_id and a.membership_id = d.partner_membership_id and a.status = 'active' and a.can_submit));
  if not manage and not partner then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if d.status = 'approved' then raise exception 'This deliverable is approved; create a new deliverable for further work.' using errcode = '22023'; end if;
  if p_file is null and nullif(trim(p_link), '') is null and nullif(trim(p_note), '') is null then raise exception 'Attach a file, a link or a note.' using errcode = '22023'; end if;
  if p_file is not null then
    select * into f from cos_files where id = p_file;
    if not found or f.status <> 'ready' or f.project_id is distinct from d.project_id or (f.uploaded_by <> auth.uid() and not manage) then
      raise exception 'That file cannot be attached here.' using errcode = '22023';
    end if;
  end if;
  aud := case when manage then 'client' else 'internal' end;
  v := d.current_version + 1;
  insert into deliverable_versions (deliverable_id, project_id, brand_id, version, audience, note, file_id, link_url, submitted_by)
  values (d.id, d.project_id, d.brand_id, v, aud, left(p_note, 4000), p_file, nullif(trim(p_link), ''), auth.uid()) returning id into vid;
  if p_file is not null and aud = 'client' then update cos_files set audience = 'client' where id = p_file; end if;
  update deliverables set current_version = v, status = case when aud = 'client' then 'submitted' else 'internal_review' end,
    submitted_at = case when aud = 'client' then now() else submitted_at end, updated_at = now() where id = d.id;
  perform cos_log('deliverable.submitted', d.brand_id, 'deliverable', d.id, jsonb_build_object('version', v, 'audience', aud, 'project_id', d.project_id));
  if aud = 'client' then
    perform cos_notify_project_clients(d.project_id, 'projects', 'high', 'Ready for your review: ' || d.title || ' (version ' || v || ')', null,
      '/portal/projects/' || d.project_id || '?deliverable=' || d.id, 'deliverable:' || vid);
    perform cos_emit('deliverable.submitted', d.project_id, 'deliverable.submitted:' || vid, jsonb_build_object('deliverable_id', d.id, 'version', v, 'title', d.title));
  else
    perform ap_notify_admins(d.brand_id, false, 'projects', 'normal', 'Partner submission to review: ' || d.title || ' (version ' || v || ')', null,
      '/workspace/clients/deliverables?id=' || d.id, 'deliverable_internal:' || vid, 'client_os');
  end if;
  return jsonb_build_object('version_id', vid, 'version', v, 'audience', aud);
end $$;

-- A decision on ONE version: a client (approved / revision requested / rejected) on a client version, or a brand admin
-- on a partner's internal version. A decision on a replaced version is refused; there is one decision per version.
create or replace function public.cos_review_version(p_version uuid, p_decision text, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ver record;
  d record;
  kind text;
  latest int;
  rid uuid;
  req uuid;
  mid uuid;
begin
  select * into ver from deliverable_versions where id = p_version;
  if not found then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into d from deliverables where id = ver.deliverable_id for update;
  if ver.audience = 'client' and cos_project_access(d.project_id) = 'client' then kind := 'client';
  elsif ver.audience = 'internal' and ap_can_manage(d.brand_id) then kind := 'internal';
  else raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected', 'revision_requested') then raise exception 'Unknown decision.' using errcode = '22023'; end if;
  if p_decision <> 'approved' and nullif(trim(p_comment), '') is null then raise exception 'Say what needs to change.' using errcode = '22023'; end if;
  select max(version) into latest from deliverable_versions where deliverable_id = d.id and audience = ver.audience;
  if ver.version < latest then raise exception 'Version % was replaced by version %; review the latest version.', ver.version, latest using errcode = '22023'; end if;
  if exists (select 1 from deliverable_reviews where version_id = p_version and reviewer_kind = kind) then raise exception 'This version was already reviewed.' using errcode = '22023'; end if;
  insert into deliverable_reviews (version_id, deliverable_id, brand_id, reviewer_kind, decision, comment, reviewer_id)
  values (p_version, d.id, d.brand_id, kind, p_decision, left(p_comment, 4000), auth.uid()) returning id into rid;
  if kind = 'client' then
    update deliverables set status = p_decision,
      approved_version = case when p_decision = 'approved' then ver.version else approved_version end,
      approved_at = case when p_decision = 'approved' then now() else approved_at end, updated_at = now() where id = d.id;
    perform cos_log('deliverable.' || p_decision, d.brand_id, 'deliverable', d.id, jsonb_build_object('version', ver.version, 'project_id', d.project_id, 'review_id', rid));
    perform ap_notify_admins(d.brand_id, false, 'projects', case when p_decision = 'approved' then 'normal' else 'high' end,
      d.title || ' v' || ver.version || ': ' || replace(p_decision, '_', ' ') || ' by the client', p_comment,
      '/workspace/clients/deliverables?id=' || d.id, 'review:' || rid, 'client_os');
    perform cos_emit(case p_decision when 'approved' then 'deliverable.approved' when 'revision_requested' then 'deliverable.revision_requested' else 'deliverable.rejected' end,
      d.project_id, 'review:' || rid, jsonb_build_object('deliverable_id', d.id, 'version', ver.version, 'title', d.title));
    if p_decision = 'revision_requested' then
      mid := cos_client_membership((select client_contact_id from projects where id = d.project_id), d.brand_id);
      insert into client_requests (brand_id, project_id, membership_id, contact_id, category, title, description, deliverable_id, created_by)
      values (d.brand_id, d.project_id, mid, (select contact_id from portal_memberships where id = mid), 'revision',
              'Revision: ' || d.title || ' (version ' || ver.version || ')', p_comment, d.id, auth.uid()) returning id into req;
    end if;
  else
    -- The team's decision on a partner version: approval does NOT send it to the client by itself; an admin submits a
    -- client version (which can reuse the same file).
    update deliverables set status = case when p_decision = 'approved' then 'draft' else 'revision_requested' end, updated_at = now() where id = d.id;
    perform cos_log('deliverable.internal_' || p_decision, d.brand_id, 'deliverable', d.id, jsonb_build_object('version', ver.version));
    if d.partner_membership_id is not null then
      perform cos_notify_member(d.partner_membership_id, 'projects', 'normal', d.title || ' v' || ver.version || ': ' || replace(p_decision, '_', ' '), p_comment,
        '/partners/tasks', 'review:' || rid);
    end if;
  end if;
  return jsonb_build_object('review_id', rid, 'request_id', req);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Requests
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  membership_id uuid references public.portal_memberships(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  category text not null check (category in ('revision', 'support', 'change', 'new_project', 'information', 'other')),
  title text not null check (length(trim(title)) between 1 and 200),
  description text check (description is null or length(description) <= 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists client_requests_brand on public.client_requests (brand_id, status);

create table if not exists public.client_request_events (
  id bigserial primary key,
  request_id uuid not null references public.client_requests(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('created', 'comment', 'status', 'assigned')),
  body text check (body is null or length(body) <= 4000),
  internal boolean not null default false,
  file_id uuid references public.cos_files(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists client_request_events_request on public.client_request_events (request_id, created_at);

create or replace function public.cos_can_see_request(p_request uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from client_requests r where r.id = p_request and (
    ap_can_manage(r.brand_id) or r.membership_id in (select cos_my_memberships('client'))));
$$;

-- A client opens a request about a relationship (and optionally one of their projects).
create or replace function public.cos_create_request(p_brand uuid, p_project uuid, p_category text, p_title text, p_description text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
  rid uuid;
begin
  select id into mid from portal_memberships where id in (select cos_my_memberships('client')) and brand_id = p_brand limit 1;
  if mid is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_project is not null and coalesce(cos_project_access(p_project), '') <> 'client' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_project is not null and not exists (select 1 from projects where id = p_project and brand_id = p_brand) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  insert into client_requests (brand_id, project_id, membership_id, contact_id, category, title, description, created_by)
  values (p_brand, p_project, mid, (select contact_id from portal_memberships where id = mid), p_category, p_title, p_description, auth.uid()) returning id into rid;
  return rid;
end $$;

create or replace function public.cos_request_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('resolved', 'closed') and new.resolved_at is null then new.resolved_at := now(); end if;
  end if;
  return new;
end $$;

create or replace function public.cos_request_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into client_request_events (request_id, brand_id, kind, body, actor_id) values (new.id, new.brand_id, 'created', new.title, auth.uid());
    perform cos_log('client_request.created', new.brand_id, 'client_request', new.id, jsonb_build_object('category', new.category, 'project_id', new.project_id));
    perform ap_notify_admins(new.brand_id, false, 'projects', case when new.category = 'revision' then 'high' else 'normal' end, 'Client request: ' || new.title, null,
      '/workspace/clients/requests?id=' || new.id, 'request:' || new.id, 'client_os');
    if new.project_id is not null then
      perform cos_emit('client.request_created', new.project_id, 'request:' || new.id, jsonb_build_object('request_id', new.id, 'category', new.category, 'title', new.title));
    end if;
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into client_request_events (request_id, brand_id, kind, body, actor_id) values (new.id, new.brand_id, 'status', new.status, auth.uid());
    perform cos_log('client_request.status_changed', new.brand_id, 'client_request', new.id, jsonb_build_object('from', old.status, 'to', new.status));
    if new.membership_id is not null then
      perform cos_notify_member(new.membership_id, 'projects', 'normal', 'Your request "' || new.title || '" is ' || replace(new.status, '_', ' '), null,
        '/portal/requests?id=' || new.id, 'request_status:' || new.id || ':' || new.status || ':' || extract(epoch from now())::bigint);
    end if;
    if new.status = 'resolved' and new.project_id is not null then
      perform cos_emit('client.request_resolved', new.project_id, 'request_resolved:' || new.id || ':' || extract(epoch from now())::bigint, jsonb_build_object('request_id', new.id));
    end if;
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into client_request_events (request_id, brand_id, kind, body, internal, actor_id) values (new.id, new.brand_id, 'assigned', null, true, auth.uid());
  end if;
  return null;
end $$;

drop trigger if exists trg_client_requests_before on public.client_requests;
create trigger trg_client_requests_before before insert or update on public.client_requests for each row execute function public.cos_request_trigger();
drop trigger if exists trg_client_requests_after on public.client_requests;
create trigger trg_client_requests_after after insert or update on public.client_requests for each row execute function public.cos_request_after_update();

-- Who may change a request: brand admins (status, assignee); the client may only close their own.
create or replace function public.cos_request_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.brand_id <> old.brand_id or new.membership_id is distinct from old.membership_id or new.contact_id is distinct from old.contact_id
     or new.project_id is distinct from old.project_id or new.created_by is distinct from old.created_by then
    raise exception 'A request''s brand, client and project never change.' using errcode = '22023';
  end if;
  if not ap_can_manage(new.brand_id) then
    if new.status <> 'closed' or new.assigned_to is distinct from old.assigned_to or new.title <> old.title or new.description is distinct from old.description then
      raise exception 'Not allowed.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_client_requests_guard on public.client_requests;
create trigger trg_client_requests_guard before update on public.client_requests for each row execute function public.cos_request_guard();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Conversations and messages
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.cos_conversations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  -- client: the team and the client relationship (or the project's clients); partner: the team and the project's
  -- partners; internal: the team only.
  audience text not null check (audience in ('client', 'partner', 'internal')),
  subject text not null check (length(trim(subject)) between 1 and 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (audience = 'internal' or project_id is not null or contact_id is not null)
);
create index if not exists conversations_brand on public.cos_conversations (brand_id, last_message_at desc);

create table if not exists public.cos_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.cos_conversations(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 8000),
  internal boolean not null default false,
  file_id uuid references public.cos_files(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation on public.cos_messages (conversation_id, created_at);

create table if not exists public.cos_message_reads (
  message_id uuid not null references public.cos_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create or replace function public.cos_conversation_access(p_conversation uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when ap_can_manage(c.brand_id) then 'manage'
    when c.audience = 'client' and ((c.project_id is not null and cos_project_access(c.project_id) = 'client')
         or (c.project_id is null and cos_client_membership(c.contact_id, c.brand_id) is not null)) then 'client'
    when c.audience = 'partner' and c.project_id is not null and cos_project_access(c.project_id) in ('partner', 'partner_tasks') then 'partner'
  end
  from cos_conversations c where c.id = p_conversation;
$$;

create or replace function public.cos_message_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
  access text;
  r record;
begin
  select * into c from cos_conversations where id = new.conversation_id;
  access := cos_conversation_access(new.conversation_id);
  if access is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if access <> 'manage' then new.internal := false; end if;
  if c.audience = 'internal' then new.internal := true; end if;
  new.brand_id := c.brand_id;
  new.author_id := (select id from profiles where id = auth.uid());
  if new.file_id is not null and not cos_can_read_file(new.file_id) then raise exception 'That file cannot be attached here.' using errcode = '22023'; end if;
  update cos_conversations set last_message_at = now() where id = c.id;
  if not new.internal then
    if access = 'manage' then
      -- The external side hears about the team's message.
      if c.audience = 'client' then
        for r in select m.id from portal_memberships m where m.kind = 'client' and m.status = 'active' and m.brand_id = c.brand_id and (
                   (c.project_id is not null and exists (select 1 from project_participants pp where pp.project_id = c.project_id and pp.membership_id = m.id and pp.status = 'active'))
                   or (c.project_id is null and m.contact_id = c.contact_id)) loop
          perform cos_notify_member(r.id, 'projects', 'normal', 'New message: ' || c.subject, null, '/portal/cos_messages?c=' || c.id, 'msg:' || c.id || ':' || r.id || ':' || extract(epoch from now())::bigint / 600);
        end loop;
      elsif c.audience = 'partner' then
        for r in select m.id from portal_memberships m where m.kind = 'partner' and m.status = 'active' and m.brand_id = c.brand_id
                   and (exists (select 1 from project_participants pp where pp.project_id = c.project_id and pp.membership_id = m.id and pp.status = 'active')
                     or exists (select 1 from partner_task_assignments a where a.project_id = c.project_id and a.membership_id = m.id and a.status = 'active')) loop
          perform cos_notify_member(r.id, 'projects', 'normal', 'New message: ' || c.subject, null, '/partners/cos_messages?c=' || c.id, 'msg:' || c.id || ':' || r.id || ':' || extract(epoch from now())::bigint / 600);
        end loop;
      end if;
    else
      perform ap_notify_admins(c.brand_id, false, 'projects', 'normal', 'New ' || access || ' message: ' || c.subject, null,
        '/workspace/clients/communications?c=' || c.id, 'msg:' || c.id || ':' || extract(epoch from now())::bigint / 600, 'client_os');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_before on public.cos_messages;
create trigger trg_messages_before before insert on public.cos_messages for each row execute function public.cos_message_trigger();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Invoices shown to clients (the Command Center's invoices; sharing is explicit and revocable)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.cos_invoice_shares (
  invoice_id uuid primary key references public.invoices(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  payment_instructions text check (payment_instructions is null or length(payment_instructions) <= 2000),
  shared_by uuid references public.profiles(id) on delete set null,
  shared_at timestamptz not null default now(),
  revoked_at timestamptz
);

create or replace function public.cos_share_invoice(p_invoice uuid, p_share boolean, p_instructions text default null)
returns void language plpgsql security definer set search_path = public as $$
declare i record;
begin
  select * into i from invoices where id = p_invoice;
  if not found or not ap_can_manage(i.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_share and (i.status <> 'sent' or i.contact_id is null) then raise exception 'Only a sent invoice with a client can be shown to the client.' using errcode = '22023'; end if;
  if p_share then
    insert into cos_invoice_shares (invoice_id, brand_id, payment_instructions, shared_by) values (p_invoice, i.brand_id, p_instructions, auth.uid())
    on conflict (invoice_id) do update set revoked_at = null, payment_instructions = excluded.payment_instructions, shared_at = now(), shared_by = excluded.shared_by;
    for i in select m.id as mid, inv.number from portal_memberships m join invoices inv on inv.id = p_invoice
             where m.kind = 'client' and m.status = 'active' and m.brand_id = inv.brand_id
               and cos_contact_matches(m.contact_id, inv.contact_id) loop
      perform cos_notify_member(i.mid, 'finance', 'normal', 'Invoice ' || i.number || ' is available', null, '/portal/invoices', 'invoice_shared:' || p_invoice);
    end loop;
  else
    update cos_invoice_shares set revoked_at = now() where invoice_id = p_invoice;
  end if;
  perform cos_log(case when p_share then 'invoice.shared_with_client' else 'invoice.unshared' end, (select brand_id from invoices where id = p_invoice), 'invoice', p_invoice, '{}');
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Row-level security and grants
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare t text; p record;
begin
  foreach t in array array['project_lifecycles', 'lifecycle_stages', 'project_stage_history', 'cos_files', 'cos_file_shares', 'deliverables',
    'deliverable_versions', 'deliverable_reviews', 'client_requests', 'client_request_events', 'cos_conversations', 'cos_messages', 'cos_message_reads', 'cos_invoice_shares'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Lifecycles: readable by brand admins (and the global ones by everyone in the Workspace); written by admins of the brand
-- (global ones by super admins).
create policy "project_lifecycles_select" on public.project_lifecycles for select to authenticated
  using ((brand_id is null and public.is_super_admin()) or (brand_id is null and exists (select 1 from public.brand_admins where user_id = auth.uid())) or public.ap_can_manage(brand_id));
create policy "project_lifecycles_write" on public.project_lifecycles for all to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
create policy "lifecycle_stages_select" on public.lifecycle_stages for select to authenticated
  using (exists (select 1 from public.project_lifecycles l where l.id = lifecycle_id));
create policy "lifecycle_stages_write" on public.lifecycle_stages for all to authenticated
  using (exists (select 1 from public.project_lifecycles l where l.id = lifecycle_id and public.ap_can_manage(l.brand_id)))
  with check (exists (select 1 from public.project_lifecycles l where l.id = lifecycle_id and public.ap_can_manage(l.brand_id)));
grant select, insert, update, delete on public.project_lifecycles, public.lifecycle_stages to authenticated;

create policy "project_stage_history_select" on public.project_stage_history for select to authenticated using (public.ap_can_manage(brand_id));
grant select on public.project_stage_history to authenticated;

create policy "cos_files_select" on public.cos_files for select to authenticated using (public.cos_can_read_file(id));
grant select on public.cos_files to authenticated;
create policy "cos_file_shares_select" on public.cos_file_shares for select to authenticated
  using (public.ap_can_manage(brand_id) or membership_id in (select public.cos_my_memberships('partner') union select public.cos_my_memberships('client')));
grant select on public.cos_file_shares to authenticated;

-- Deliverables: admins write (title, description, responsible, partner); status fields only through the functions.
create policy "deliverables_select" on public.deliverables for select to authenticated using (public.cos_can_see_deliverable(id));
create policy "deliverables_insert" on public.deliverables for insert to authenticated
  with check (public.ap_can_manage(brand_id) and status = 'draft' and current_version = 0 and exists (select 1 from public.projects p where p.id = project_id and p.brand_id = brand_id));
create policy "deliverables_update" on public.deliverables for update to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert on public.deliverables to authenticated;
grant update (title, description, responsible_id, partner_membership_id, due_date, task_id) on public.deliverables to authenticated;

-- Versions: the team sees all; a client only client versions; a partner their own deliverable's versions.
create policy "deliverable_versions_select" on public.deliverable_versions for select to authenticated using (
  public.ap_can_manage(brand_id)
  or (audience = 'client' and public.cos_project_access(project_id) in ('client', 'partner'))
  or exists (select 1 from public.deliverables d where d.id = deliverable_id and d.partner_membership_id in (select public.cos_my_memberships('partner'))));
grant select on public.deliverable_versions to authenticated;
create policy "deliverable_reviews_select" on public.deliverable_reviews for select to authenticated using (
  public.ap_can_manage(brand_id)
  or (reviewer_kind = 'client' and public.cos_can_see_deliverable(deliverable_id))
  or (reviewer_kind = 'internal' and exists (select 1 from public.deliverables d where d.id = deliverable_id and d.partner_membership_id in (select public.cos_my_memberships('partner')))));
grant select on public.deliverable_reviews to authenticated;

create policy "client_requests_select" on public.client_requests for select to authenticated using (public.cos_can_see_request(id));
create policy "client_requests_update" on public.client_requests for update to authenticated using (public.cos_can_see_request(id)) with check (public.cos_can_see_request(id));
grant select, update on public.client_requests to authenticated;
create policy "client_request_events_select" on public.client_request_events for select to authenticated
  using (public.ap_can_manage(brand_id) or (not internal and public.cos_can_see_request(request_id)));
create policy "client_request_events_insert" on public.client_request_events for insert to authenticated
  with check (kind = 'comment' and actor_id = auth.uid() and public.cos_can_see_request(request_id)
    and brand_id = (select r.brand_id from public.client_requests r where r.id = request_id)
    and (public.ap_can_manage(brand_id) or not internal)
    and (file_id is null or public.cos_can_read_file(file_id)));
grant select, insert on public.client_request_events to authenticated;
grant usage on sequence public.client_request_events_id_seq to authenticated;

create policy "conversations_select" on public.cos_conversations for select to authenticated using (public.cos_conversation_access(id) is not null);
create policy "conversations_insert" on public.cos_conversations for insert to authenticated
  with check (created_by = auth.uid() and (
    public.ap_can_manage(brand_id)
    or (audience = 'client' and ((project_id is not null and public.cos_project_access(project_id) = 'client' and (select brand_id from public.projects where id = project_id) = brand_id)
         or (project_id is null and public.cos_client_membership(contact_id, brand_id) is not null)))
    or (audience = 'partner' and project_id is not null and public.cos_project_access(project_id) in ('partner', 'partner_tasks') and (select brand_id from public.projects where id = project_id) = brand_id)));
grant select, insert on public.cos_conversations to authenticated;
create policy "messages_select" on public.cos_messages for select to authenticated using (
  public.ap_can_manage(brand_id) or (not internal and public.cos_conversation_access(conversation_id) is not null));
create policy "messages_insert" on public.cos_messages for insert to authenticated with check (public.cos_conversation_access(conversation_id) is not null);
grant select, insert on public.cos_messages to authenticated;
create policy "message_reads_own" on public.cos_message_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.cos_message_reads to authenticated;

create policy "cos_invoice_shares_select" on public.cos_invoice_shares for select to authenticated using (public.ap_can_manage(brand_id));
grant select on public.cos_invoice_shares to authenticated;

-- History tables are append-only.
drop trigger if exists trg_project_stage_history_append_only on public.project_stage_history;
create trigger trg_project_stage_history_append_only before update or delete on public.project_stage_history for each row execute function public.cc_append_only();
drop trigger if exists trg_deliverable_versions_append_only on public.deliverable_versions;
create trigger trg_deliverable_versions_append_only before update or delete on public.deliverable_versions for each row execute function public.cc_append_only();
drop trigger if exists trg_deliverable_reviews_append_only on public.deliverable_reviews;
create trigger trg_deliverable_reviews_append_only before update or delete on public.deliverable_reviews for each row execute function public.cc_append_only();
drop trigger if exists trg_client_request_events_append_only on public.client_request_events;
create trigger trg_client_request_events_append_only before update or delete on public.client_request_events for each row execute function public.cc_append_only();
drop trigger if exists trg_messages_append_only on public.cos_messages;
create trigger trg_messages_append_only before update or delete on public.cos_messages for each row execute function public.cc_append_only();

-- Deliverables keep their brand and project; a partner must belong to the brand.
create or replace function public.cos_deliverable_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.brand_id <> old.brand_id) then raise exception 'A deliverable never moves.' using errcode = '22023'; end if;
  if new.brand_id <> (select brand_id from projects where id = new.project_id) then raise exception 'The project is in another brand.' using errcode = '22023'; end if;
  if new.task_id is not null and not exists (select 1 from tasks where id = new.task_id and project_id = new.project_id) then raise exception 'The task is in another project.' using errcode = '22023'; end if;
  if new.partner_membership_id is not null and not exists (select 1 from portal_memberships where id = new.partner_membership_id and kind = 'partner' and brand_id = new.brand_id) then
    raise exception 'The partner belongs to another brand.' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select id from profiles where id = auth.uid());
    perform cos_log('deliverable.created', new.brand_id, 'deliverable', new.id, jsonb_build_object('project_id', new.project_id));
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_deliverables_guard on public.deliverables;
create trigger trg_deliverables_guard before insert or update on public.deliverables for each row execute function public.cos_deliverable_guard();

do $$
declare f text;
begin
  foreach f in array array['cos_project_lifecycle(uuid)', 'cos_set_stage(uuid, text, text)', 'cos_can_read_file(uuid)',
    'cos_register_upload(uuid, uuid, text, text, text, bigint, text)', 'cos_complete_upload(uuid)', 'cos_revoke_file(uuid)', 'cos_share_file(uuid, uuid, timestamp with time zone)',
    'cos_unshare_file(uuid)', 'cos_can_see_deliverable(uuid)', 'cos_submit_version(uuid, text, uuid, text)', 'cos_review_version(uuid, text, text)',
    'cos_can_see_request(uuid)', 'cos_create_request(uuid, uuid, text, text, text)', 'cos_conversation_access(uuid)', 'cos_share_invoice(uuid, boolean, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

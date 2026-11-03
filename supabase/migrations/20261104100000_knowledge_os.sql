-- Houcine.world Knowledge OS (docs/knowledge-os.md): the PRIVATE half of the organization's knowledge.
--
-- Public knowledge keeps its existing home: Markdown notes in houcine-world-brain/, published by Knowledge Studio to the
-- (public) GitHub repository and compiled into the AI index. Everything that must NOT be public lives here, in Supabase:
--   kos_documents   client / internal / management documents, global or brand-scoped (real brands.id), optionally
--                   restricted to one client contact; owner, review and expiry dates; lifecycle status
--   kos_versions    every saved version (append-only); the published version is the one AI and readers get
--   kos_reviews     review decisions (append-only)
--   kos_links       relations for the graph (to another document or to a public note id)
--   kos_retrievals  retrieval analytics: ids and counts; the question text only when nothing was found (gaps)
-- One access rule (kos_allows) decides every read, for people, search, graph, AI retrieval and the playground;
-- deny by default. Writes go only through the kos_* functions below, which check the editor's rights and audit.

-- ── Tables ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.kos_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text check (description is null or length(description) <= 1000),
  content text not null default '' check (length(content) <= 200000),
  category text check (category is null or length(category) <= 80),
  tags text[] not null default '{}',
  visibility text not null check (visibility in ('client', 'internal', 'management')),
  brand_id uuid references public.brands(id) on delete restrict,
  client_contact_id uuid references public.contacts(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  version int not null default 1,
  published_version int,
  published_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_due date,
  review_interval_days int check (review_interval_days is null or review_interval_days between 7 and 1095),
  expires_on date,
  sources text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A client-specific document belongs to a brand and is client-level.
  check (client_contact_id is null or (visibility = 'client' and brand_id is not null))
);
create index if not exists kos_documents_scope on public.kos_documents (visibility, brand_id, status);

-- array_to_string is not marked immutable; this wrapper is (its result depends only on its argument).
create or replace function public.kos_words(p text[]) returns text language sql immutable as $$ select array_to_string(p, ' ') $$;

create table if not exists public.kos_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kos_documents(id) on delete cascade,
  version int not null,
  title text not null,
  content text not null,
  category text,
  tags text[] not null default '{}',
  summary text check (summary is null or length(summary) <= 500),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(category, '') || ' ' || public.kos_words(tags)), 'B') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'C')) stored,
  unique (document_id, version)
);
create index if not exists kos_versions_search on public.kos_versions using gin (search);

create table if not exists public.kos_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kos_documents(id) on delete cascade,
  version int not null,
  decision text not null check (decision in ('requested', 'approved', 'rejected')),
  comment text check (comment is null or length(comment) <= 2000),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.kos_links (
  id uuid primary key default gen_random_uuid(),
  from_document uuid not null references public.kos_documents(id) on delete cascade,
  to_document uuid references public.kos_documents(id) on delete cascade,
  to_note text check (to_note is null or to_note ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  relation text not null check (relation in ('related', 'procedure', 'policy', 'service', 'faq', 'source', 'project_type', 'brand')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((to_document is null) <> (to_note is null)),
  check (to_document is distinct from from_document)
);
create unique index if not exists kos_links_unique on public.kos_links (from_document, coalesce(to_document::text, to_note), relation);

create table if not exists public.kos_retrievals (
  id bigserial primary key,
  consumer text not null check (consumer in ('client_ai', 'internal_ai', 'autopilot_ai', 'concierge', 'command_ai', 'library')),
  user_id uuid references public.profiles(id) on delete set null,
  brand_ids uuid[] not null default '{}',
  document_ids uuid[] not null default '{}',
  results int not null,
  top_score real,
  query_text text check (query_text is null or length(query_text) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists kos_retrievals_time on public.kos_retrievals (created_at desc);

-- ── The access rule ────────────────────────────────────────────────────────────────────────────────────────────────
-- An identity: {"super": bool, "member_brands": [...], "admin_brands": [...], "client": [{"brand":..,"contacts":[..]}]}.
-- Built from the signed-in person by kos_my_identity(); built from a chosen role only by kos_simulate (super admins
-- outside their own rights; brand admins only inside their brands). Never accepted from a browser or a model.
create or replace function public.kos_allows(p_vis text, p_brand uuid, p_contact uuid, i jsonb)
returns boolean language sql immutable as $$
  select coalesce((i ->> 'super')::boolean, false)
    or (p_vis = 'internal' and (case when p_brand is null then jsonb_array_length(coalesce(i -> 'member_brands', '[]')) > 0
                                     else coalesce(i -> 'member_brands', '[]') ? p_brand::text end))
    or (p_vis = 'client' and p_contact is null and (case when p_brand is null then jsonb_array_length(coalesce(i -> 'member_brands', '[]')) > 0
                                     else coalesce(i -> 'member_brands', '[]') ? p_brand::text end))
    or (p_vis = 'client' and exists (select 1 from jsonb_array_elements(coalesce(i -> 'client', '[]')) e
          where (p_brand is null or e ->> 'brand' = p_brand::text)
            and (p_contact is null or coalesce(e -> 'contacts', '[]') ? p_contact::text)))
    or (p_vis = 'client' and p_contact is not null and coalesce(i -> 'member_brands', '[]') ? p_brand::text);
$$;

create or replace function public.kos_my_identity()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'super', is_super_admin(),
    'member_brands', coalesce((select jsonb_agg(brand_id) from brand_admins where user_id = auth.uid()), '[]'::jsonb),
    'admin_brands', coalesce((select jsonb_agg(brand_id) from brand_admins where user_id = auth.uid() and role = 'brand_admin'), '[]'::jsonb),
    -- A membership on an organization covers that organization's people (as in Client OS).
    'client', coalesce((select jsonb_agg(jsonb_build_object('brand', m.brand_id,
                 'contacts', (select jsonb_agg(c.id) from contacts c where c.id = m.contact_id or c.organization_id = m.contact_id)))
               from portal_memberships m where m.id in (select cos_my_memberships('client'))), '[]'::jsonb));
$$;

-- Who may edit (and therefore read every status and the version history).
create or replace function public.kos_can_edit(p_vis text, p_brand uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select is_super_admin() or (p_vis <> 'management' and p_brand is not null and has_brand_role(p_brand, 'brand_admin'));
$$;

-- Live for readers: a published version, not archived, not expired.
create or replace function public.kos_is_live(p_status text, p_published int, p_expires date)
returns boolean language sql immutable as $$
  select p_published is not null and p_status <> 'archived' and (p_expires is null or p_expires >= (now() at time zone 'Europe/Paris')::date);
$$;

create or replace function public.kos_can_read_doc(d public.kos_documents)
returns boolean language sql security definer stable set search_path = public as $$
  select kos_can_edit(d.visibility, d.brand_id)
      or (kos_is_live(d.status, d.published_version, d.expires_on) and kos_allows(d.visibility, d.brand_id, d.client_contact_id, kos_my_identity()));
$$;

-- ── Row-level security: reads only (writes go through the functions) ──────────────────────────────────────────────
do $$
declare t text; p record;
begin
  foreach t in array array['kos_documents', 'kos_versions', 'kos_reviews', 'kos_links', 'kos_retrievals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;
create policy "kos_documents_select" on public.kos_documents for select to authenticated using (public.kos_can_read_doc(kos_documents));
create policy "kos_versions_select" on public.kos_versions for select to authenticated
  using (exists (select 1 from public.kos_documents d where d.id = document_id and public.kos_can_edit(d.visibility, d.brand_id)));
create policy "kos_reviews_select" on public.kos_reviews for select to authenticated
  using (exists (select 1 from public.kos_documents d where d.id = document_id and public.kos_can_edit(d.visibility, d.brand_id)));
-- A relation is visible only when BOTH ends are readable (a restricted title never leaks through a link).
create policy "kos_links_select" on public.kos_links for select to authenticated using (
  exists (select 1 from public.kos_documents d where d.id = from_document and public.kos_can_read_doc(d))
  and (to_document is null or exists (select 1 from public.kos_documents d where d.id = to_document and public.kos_can_read_doc(d))));
create policy "kos_retrievals_select" on public.kos_retrievals for select to authenticated using (public.is_super_admin());
grant select on public.kos_documents, public.kos_versions, public.kos_reviews, public.kos_links, public.kos_retrievals to authenticated;
drop trigger if exists trg_kos_versions_append_only on public.kos_versions;
create trigger trg_kos_versions_append_only before update or delete on public.kos_versions for each row execute function public.cc_append_only();
drop trigger if exists trg_kos_reviews_append_only on public.kos_reviews;
create trigger trg_kos_reviews_append_only before update or delete on public.kos_reviews for each row execute function public.cc_append_only();
drop trigger if exists trg_kos_retrievals_append_only on public.kos_retrievals;
create trigger trg_kos_retrievals_append_only before update or delete on public.kos_retrievals for each row execute function public.cc_append_only();

-- ── Writes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.kos_require_edit(p_id uuid)
returns public.kos_documents language plpgsql security definer set search_path = public as $$
declare d kos_documents;
begin
  select * into d from kos_documents where id = p_id for update;
  if not found or not kos_can_edit(d.visibility, d.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  return d;
end $$;

-- Create or edit (content and descriptive fields). Every save is a new version; a published document keeps serving its
-- published version until the new one is reviewed and published (an edit never publishes anything).
create or replace function public.kos_save(p_id uuid, p_doc jsonb, p_summary text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  d kos_documents;
  me uuid := (select id from profiles where id = auth.uid());
  vis text := p_doc ->> 'visibility';
  brand uuid := nullif(p_doc ->> 'brand_id', '')::uuid;
  contact uuid := nullif(p_doc ->> 'client_contact_id', '')::uuid;
  v_tags text[] := coalesce((select array_agg(left(lower(trim(t)), 40)) from jsonb_array_elements_text(coalesce(p_doc -> 'tags', '[]')) t where trim(t) <> ''), '{}');
  v_srcs text[] := coalesce((select array_agg(left(trim(s), 300)) from jsonb_array_elements_text(coalesce(p_doc -> 'sources', '[]')) s where trim(s) <> ''), '{}');
begin
  if p_id is null then
    if vis is null or vis not in ('client', 'internal', 'management') then raise exception 'Choose client, internal or management. Public knowledge is published as a note in Knowledge Studio.' using errcode = '22023'; end if;
    if not kos_can_edit(vis, brand) then raise exception 'Not allowed for this visibility and brand.' using errcode = '42501'; end if;
    if contact is not null and not exists (select 1 from contact_brands where contact_id = contact and brand_id = brand) then raise exception 'That client is not linked to this brand.' using errcode = '22023'; end if;
    insert into kos_documents (title, description, content, category, tags, visibility, brand_id, client_contact_id, owner_id, author_id, sources, review_due, expires_on, review_interval_days)
    values (p_doc ->> 'title', p_doc ->> 'description', coalesce(p_doc ->> 'content', ''), p_doc ->> 'category', v_tags, vis, brand, contact,
            coalesce(nullif(p_doc ->> 'owner_id', '')::uuid, me), me, v_srcs, nullif(p_doc ->> 'review_due', '')::date, nullif(p_doc ->> 'expires_on', '')::date, nullif(p_doc ->> 'review_interval_days', '')::int)
    returning * into d;
    insert into kos_versions (document_id, version, title, content, category, tags, summary, author_id) values (d.id, 1, d.title, d.content, d.category, d.tags, coalesce(p_summary, 'Created'), me);
    perform cos_log('knowledge.created', d.brand_id, 'knowledge_document', d.id, jsonb_build_object('visibility', d.visibility, 'client_contact_id', d.client_contact_id));
    return d.id;
  end if;
  d := kos_require_edit(p_id);
  if d.status = 'archived' then raise exception 'Restore the document before editing it.' using errcode = '22023'; end if;
  update kos_documents set title = coalesce(p_doc ->> 'title', title), description = p_doc ->> 'description', content = coalesce(p_doc ->> 'content', content),
    category = p_doc ->> 'category', tags = v_tags, sources = v_srcs, version = d.version + 1, status = 'draft', author_id = me, updated_at = now()
  where id = p_id returning * into d;
  insert into kos_versions (document_id, version, title, content, category, tags, summary, author_id) values (d.id, d.version, d.title, d.content, d.category, d.tags, left(p_summary, 500), me);
  perform cos_log('knowledge.edited', d.brand_id, 'knowledge_document', d.id, jsonb_build_object('version', d.version));
  return d.id;
end $$;

-- Owner, reviewer, review date, interval and expiry.
create or replace function public.kos_set_schedule(p_id uuid, p_owner uuid, p_review_due date, p_interval int, p_expires date)
returns void language plpgsql security definer set search_path = public as $$
declare d kos_documents;
begin
  d := kos_require_edit(p_id);
  if p_owner is not null and not (exists (select 1 from profiles where id = p_owner and platform_role = 'super_admin')
     or (d.brand_id is not null and exists (select 1 from brand_admins where user_id = p_owner and brand_id = d.brand_id and role = 'brand_admin'))) then
    raise exception 'The owner must be able to edit this document.' using errcode = '22023';
  end if;
  update kos_documents set owner_id = p_owner, review_due = p_review_due, review_interval_days = p_interval, expires_on = p_expires, updated_at = now() where id = p_id;
  perform cos_log('knowledge.schedule_changed', d.brand_id, 'knowledge_document', p_id, jsonb_build_object('owner', p_owner, 'review_due', p_review_due, 'expires_on', p_expires));
end $$;

-- Visibility and scope. Making a document LESS restrictive needs p_confirm = true; anything involving management needs
-- a super admin (the edit check does it); a client restriction needs a client of that brand. Never PUBLIC: public
-- knowledge is a reviewed note in Knowledge Studio (kos_promote_to_public prepares it).
create or replace function public.kos_set_scope(p_id uuid, p_visibility text, p_brand uuid, p_contact uuid, p_confirm boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  d kos_documents;
  rank_old int;
  rank_new int;
begin
  d := kos_require_edit(p_id);
  if p_visibility not in ('client', 'internal', 'management') then raise exception 'Unknown visibility.' using errcode = '22023'; end if;
  if not kos_can_edit(p_visibility, p_brand) then raise exception 'Not allowed for that visibility and brand.' using errcode = '42501'; end if;
  if p_contact is not null and (p_visibility <> 'client' or p_brand is null or not exists (select 1 from contact_brands where contact_id = p_contact and brand_id = p_brand)) then
    raise exception 'A client restriction needs client visibility and a client of that brand.' using errcode = '22023';
  end if;
  rank_old := case d.visibility when 'management' then 3 when 'internal' then 2 else 1 end;
  rank_new := case p_visibility when 'management' then 3 when 'internal' then 2 else 1 end;
  if (rank_new < rank_old or (d.brand_id is not null and p_brand is null) or (d.client_contact_id is not null and p_contact is null)) and not p_confirm then
    raise exception 'This makes the document visible to more people: confirm it explicitly.' using errcode = '22023';
  end if;
  update kos_documents set visibility = p_visibility, brand_id = p_brand, client_contact_id = p_contact, updated_at = now() where id = p_id;
  perform cos_log('knowledge.scope_changed', coalesce(p_brand, d.brand_id), 'knowledge_document', p_id,
    jsonb_build_object('from', jsonb_build_object('visibility', d.visibility, 'brand', d.brand_id, 'contact', d.client_contact_id),
                       'to', jsonb_build_object('visibility', p_visibility, 'brand', p_brand, 'contact', p_contact), 'confirmed', p_confirm));
end $$;

create or replace function public.kos_transition(p_id uuid, p_action text, p_comment text default null, p_reviewer uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d kos_documents;
  me uuid := (select id from profiles where id = auth.uid());
  pay jsonb;
begin
  d := kos_require_edit(p_id);
  pay := jsonb_build_object('document_id', d.id, 'title', d.title, 'name', d.title, 'visibility', d.visibility, 'owner_id', d.owner_id, 'version', d.version);
  if p_action = 'submit' then
    if d.status not in ('draft') then raise exception 'Only a draft can be submitted for review.' using errcode = '22023'; end if;
    if p_reviewer is not null and not (exists (select 1 from profiles where id = p_reviewer and platform_role = 'super_admin')
       or (d.visibility <> 'management' and d.brand_id is not null and exists (select 1 from brand_admins where user_id = p_reviewer and brand_id = d.brand_id and role = 'brand_admin'))) then
      raise exception 'The reviewer must be able to edit this document.' using errcode = '22023';
    end if;
    update kos_documents set status = 'in_review', reviewer_id = p_reviewer where id = p_id;
    insert into kos_reviews (document_id, version, decision, comment, actor_id) values (p_id, d.version, 'requested', left(p_comment, 2000), me);
    if p_reviewer is not null then
      perform ap_notify_user(p_reviewer, d.brand_id, 'knowledge', 'normal', 'Knowledge review requested: ' || d.title, p_comment, '/workspace/knowledge/library?id=' || d.id, 'kos_review:' || d.id || ':' || d.version, 'knowledge');
    else
      perform ap_notify_admins(d.brand_id, d.visibility = 'management' or d.brand_id is null, 'knowledge', 'normal', 'Knowledge review requested: ' || d.title, p_comment, '/workspace/knowledge/library?id=' || d.id, 'kos_review:' || d.id || ':' || d.version, 'knowledge');
    end if;
    perform ap_emit('knowledge.review_requested', d.brand_id, 'knowledge_document', d.id, pay, 'kos.review_requested:' || d.id || ':' || d.version);
  elsif p_action in ('approve', 'reject') then
    if d.status <> 'in_review' then raise exception 'This document is not in review.' using errcode = '22023'; end if;
    if p_action = 'reject' and nullif(trim(p_comment), '') is null then raise exception 'Give a reason for the rejection.' using errcode = '22023'; end if;
    update kos_documents set status = case when p_action = 'approve' then 'approved' else 'draft' end where id = p_id;
    insert into kos_reviews (document_id, version, decision, comment, actor_id) values (p_id, d.version, case when p_action = 'approve' then 'approved' else 'rejected' end, left(p_comment, 2000), me);
  elsif p_action = 'publish' then
    if d.status <> 'approved' then raise exception 'Only an approved version can be published.' using errcode = '22023'; end if;
    update kos_documents set status = 'published', published_version = d.version, published_at = now(),
      review_due = coalesce(review_due, case when review_interval_days is not null then current_date + review_interval_days end) where id = p_id;
    perform ap_emit('knowledge.document_published', d.brand_id, 'knowledge_document', d.id, pay, 'kos.published:' || d.id || ':' || d.version);
  elsif p_action = 'unpublish' then
    if d.published_version is null then raise exception 'This document is not published.' using errcode = '22023'; end if;
    update kos_documents set published_version = null, status = case when status = 'published' then 'approved' else status end where id = p_id;
  elsif p_action = 'archive' then
    if d.status = 'archived' then raise exception 'Already archived.' using errcode = '22023'; end if;
    update kos_documents set status = 'archived' where id = p_id;
    perform ap_emit('knowledge.document_archived', d.brand_id, 'knowledge_document', d.id, pay, 'kos.archived:' || d.id || ':' || extract(epoch from now())::bigint);
  elsif p_action = 'restore' then
    if d.status <> 'archived' then raise exception 'Only an archived document can be restored.' using errcode = '22023'; end if;
    -- Restored as a draft and unpublished: it is reviewed and published again explicitly.
    update kos_documents set status = 'draft', published_version = null where id = p_id;
  else
    raise exception 'Unknown action.' using errcode = '22023';
  end if;
  update kos_documents set updated_at = now() where id = p_id;
  perform cos_log('knowledge.' || p_action, d.brand_id, 'knowledge_document', d.id, jsonb_build_object('version', d.version, 'comment', left(p_comment, 200)));
  return jsonb_build_object('status', (select status from kos_documents where id = p_id));
end $$;

-- A previous version comes back as a NEW version (history is never rewritten).
create or replace function public.kos_restore_version(p_id uuid, p_version int)
returns int language plpgsql security definer set search_path = public as $$
declare
  d kos_documents;
  v kos_versions;
begin
  d := kos_require_edit(p_id);
  select * into v from kos_versions where document_id = p_id and version = p_version;
  if not found then raise exception 'Unknown version.' using errcode = '22023'; end if;
  perform kos_save(p_id, jsonb_build_object('title', v.title, 'content', v.content, 'category', v.category, 'tags', to_jsonb(v.tags), 'description', d.description, 'sources', to_jsonb(d.sources)), 'Restored from version ' || p_version);
  return (select version from kos_documents where id = p_id);
end $$;

create or replace function public.kos_duplicate(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d kos_documents;
begin
  d := kos_require_edit(p_id);
  return kos_save(null, jsonb_build_object('title', left('Copy of ' || d.title, 200), 'description', d.description, 'content', d.content, 'category', d.category,
    'tags', to_jsonb(d.tags), 'visibility', d.visibility, 'brand_id', d.brand_id, 'client_contact_id', d.client_contact_id, 'sources', to_jsonb(d.sources)), 'Duplicated from ' || d.id);
end $$;

-- Deleting is only for a document that was never published (history of published knowledge is kept).
create or replace function public.kos_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d kos_documents;
begin
  d := kos_require_edit(p_id);
  if d.published_at is not null then raise exception 'A document that was ever published is archived, not deleted.' using errcode = '22023'; end if;
  perform cos_log('knowledge.deleted', d.brand_id, 'knowledge_document', d.id, jsonb_build_object('title', d.title));
  alter table kos_versions disable trigger trg_kos_versions_append_only;
  alter table kos_reviews disable trigger trg_kos_reviews_append_only;
  delete from kos_documents where id = p_id;
  alter table kos_versions enable trigger trg_kos_versions_append_only;
  alter table kos_reviews enable trigger trg_kos_reviews_append_only;
end $$;

create or replace function public.kos_link(p_from uuid, p_to_document uuid, p_to_note text, p_relation text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  d kos_documents;
  t kos_documents;
  lid uuid;
begin
  d := kos_require_edit(p_from);
  if p_to_document is not null then
    select * into t from kos_documents where id = p_to_document;
    if not found or not kos_can_read_doc(t) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  end if;
  insert into kos_links (from_document, to_document, to_note, relation, created_by) values (p_from, p_to_document, p_to_note, p_relation, auth.uid())
  on conflict do nothing returning id into lid;
  perform cos_log('knowledge.linked', d.brand_id, 'knowledge_document', d.id, jsonb_build_object('to_document', p_to_document, 'to_note', p_to_note, 'relation', p_relation));
  return lid;
end $$;

create or replace function public.kos_unlink(p_link uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l kos_links;
begin
  select * into l from kos_links where id = p_link;
  if not found then raise exception 'Not allowed.' using errcode = '42501'; end if;
  perform kos_require_edit(l.from_document);
  delete from kos_links where id = p_link;
end $$;

-- ── Retrieval: the ONE function every AI consumer uses for private knowledge ──────────────────────────────────────
create or replace function public.kos_query(p_text text) returns tsquery language sql immutable as $$
  select case when count(*) = 0 then null else to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' | ')) end
  from (select distinct w from regexp_split_to_table(lower(coalesce(p_text, '')), '[^[:alnum:]]+') w
        where length(w) >= 3 and w not in ('the', 'and', 'for', 'are', 'what', 'how', 'who', 'with', 'this', 'that', 'les', 'des', 'une', 'pour', 'est', 'qui', 'que') limit 12) x;
$$;

create or replace function public.kos_search_core(p_query text, i jsonb, p_brand_ids uuid[], p_limit int, p_draft uuid)
returns table (document_id uuid, title text, version int, brand_id uuid, brand text, visibility text, category text, section text, score real, updated_at timestamptz, why text)
language sql stable security definer set search_path = public as $$
  with q as (select kos_query(p_query) as tq)
  select d.id, v.title, v.version, d.brand_id, coalesce(b.name, 'All brands'), d.visibility, v.category,
         ts_headline('simple', v.content, q.tq, 'MaxFragments=1,MaxWords=45,MinWords=15,StartSel="",StopSel=""'),
         ts_rank_cd(v.search, q.tq)::real, d.updated_at,
         d.visibility || case when d.client_contact_id is not null then ', this client only' when d.brand_id is null then ', all brands' else ', ' || coalesce(b.name, 'brand') end
           || case when d.id = p_draft then ', DRAFT under test' else ', published v' || d.published_version end
  from q, kos_documents d
  join kos_versions v on v.document_id = d.id and v.version = case when d.id = p_draft then d.version else d.published_version end
  left join brands b on b.id = d.brand_id
  where q.tq is not null and v.search @@ q.tq
    and (d.id = p_draft or kos_is_live(d.status, d.published_version, d.expires_on))
    and kos_allows(d.visibility, d.brand_id, d.client_contact_id, i)
    and (p_brand_ids is null or d.brand_id is null or d.brand_id = any (p_brand_ids))
  order by 9 desc, d.updated_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

-- For the signed-in person (their identity is computed here, never passed in). Logged for analytics.
create or replace function public.kos_retrieve(p_query text, p_consumer text, p_brand_ids uuid[] default null, p_limit int default 5)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  i jsonb := kos_my_identity();
  res jsonb;
  n int;
begin
  if auth.uid() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_consumer not in ('client_ai', 'internal_ai', 'autopilot_ai', 'command_ai', 'library') then raise exception 'Unknown consumer.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb), count(*) into res, n from kos_search_core(left(p_query, 1000), i, p_brand_ids, p_limit, null) r;
  insert into kos_retrievals (consumer, user_id, brand_ids, document_ids, results, top_score, query_text)
  -- The brands the question was asked in (for scoping analytics): the filter, else the asker's own brands.
  values (p_consumer, auth.uid(), coalesce(p_brand_ids, (select coalesce(array_agg(distinct b::uuid), '{}') from (
            select jsonb_array_elements_text(i -> 'member_brands') b union select e ->> 'brand' from jsonb_array_elements(i -> 'client') e) x)), coalesce((select array_agg((x ->> 'document_id')::uuid) from jsonb_array_elements(res) x), '{}'), n,
          (res -> 0 ->> 'score')::real, case when n = 0 then left(lower(regexp_replace(trim(p_query), '\s+', ' ', 'g')), 120) end);
  return res;
end $$;

-- Playground: what a given identity would retrieve. A super admin may simulate anyone; a brand admin only the public,
-- a client of one of their brands, or a brand admin of one of their brands. A simulation grants nothing and is not
-- logged as a retrieval. p_draft (an editor's own document) is searched as if its working version were published.
create or replace function public.kos_simulate(p_query text, p_role text, p_brand uuid default null, p_contact uuid default null, p_draft uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me jsonb := kos_my_identity();
  i jsonb;
  d kos_documents;
begin
  if auth.uid() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not (me ->> 'super')::boolean then
    if p_role = 'super' or jsonb_array_length(me -> 'admin_brands') = 0 then raise exception 'Not allowed to simulate this identity.' using errcode = '42501'; end if;
    if p_role in ('client', 'brand_admin') and (p_brand is null or not (me -> 'admin_brands') ? p_brand::text) then raise exception 'Not allowed to simulate this identity.' using errcode = '42501'; end if;
  end if;
  if p_draft is not null then
    select * into d from kos_documents where id = p_draft;
    if not found or not kos_can_edit(d.visibility, d.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  end if;
  i := case p_role
    when 'public' then '{}'::jsonb
    when 'super' then '{"super": true}'::jsonb
    when 'brand_admin' then jsonb_build_object('member_brands', jsonb_build_array(p_brand), 'admin_brands', jsonb_build_array(p_brand))
    when 'client' then (case when p_contact is not null and exists (select 1 from contact_brands where contact_id = p_contact and brand_id = p_brand and status = 'client')
                        then jsonb_build_object('client', jsonb_build_array(jsonb_build_object('brand', p_brand, 'contacts', jsonb_build_array(p_contact)))) end)
  end;
  if i is null then raise exception 'Choose a role (public, client of a brand with a client contact, brand admin of a brand, super).' using errcode = '22023'; end if;
  return jsonb_build_object('identity', p_role, 'note', case when p_role = 'public' then 'The public sees only published public notes (Knowledge Studio); no private document.' end,
    'results', coalesce((select jsonb_agg(to_jsonb(r)) from kos_search_core(left(p_query, 1000), i, null, 10, p_draft) r), '[]'::jsonb));
end $$;

-- ── Insights (real records only; scope = what the caller may edit) ──────────────────────────────────────────────────
create or replace function public.kos_insights(p_brand uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  sup boolean := is_super_admin();
  brands uuid[];
  today date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_brand is not null and not (sup or has_brand_role(p_brand, 'brand_admin')) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select array_agg(brand_id) into brands from brand_admins where user_id = auth.uid() and role = 'brand_admin';
  if not sup and brands is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  return (with docs as (
      select * from kos_documents d where kos_can_edit(d.visibility, d.brand_id) and (p_brand is null or d.brand_id = p_brand)),
    rets as (select r.* from kos_retrievals r where r.created_at > now() - interval '90 days'
             and (sup or r.brand_ids && brands or exists (select 1 from kos_documents d where d.id = any (r.document_ids) and d.brand_id = any (brands)))),
    uses as (select unnest(document_ids) as id, consumer from rets)
  select jsonb_build_object(
    'total', (select count(*) from docs),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from docs group by 1) x), '{}'),
    'live', (select count(*) from docs where kos_is_live(status, published_version, expires_on)),
    'by_visibility', coalesce((select jsonb_object_agg(visibility, n) from (select visibility, count(*) n from docs group by 1) x), '{}'),
    'by_brand', coalesce((select jsonb_agg(jsonb_build_object('brand_id', brand_id, 'brand', coalesce((select name from brands where id = brand_id), 'All brands'), 'count', n)) from (select brand_id, count(*) n from docs group by 1) x), '[]'),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'updated_at', updated_at, 'status', status) order by updated_at desc) from (select * from docs order by updated_at desc limit 8) x), '[]'),
    'review_overdue', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'review_due', review_due)) from docs where status <> 'archived' and review_due < today), '[]'),
    'expiring', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'expires_on', expires_on)) from docs where status <> 'archived' and expires_on between today - 3650 and today + 30), '[]'),
    'unowned', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title)) from docs where status <> 'archived' and owner_id is null), '[]'),
    'awaiting_review', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title)) from docs where status = 'in_review'), '[]'),
    'retrievals', (select count(*) from rets),
    'answered_pct', (select case when count(*) > 0 then round(100.0 * count(*) filter (where results > 0) / count(*), 1) end from rets),
    'by_consumer', coalesce((select jsonb_object_agg(consumer, n) from (select consumer, count(*) n from rets group by 1) x), '{}'),
    'top_documents', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'title', d.title, 'uses', u.n, 'consumers', u.c)) from (
        select id, count(*) n, array_agg(distinct consumer) c from uses group by id order by count(*) desc limit 10) u join docs d on d.id = u.id), '[]'),
    'unused', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title)) from docs d where kos_is_live(status, published_version, expires_on) and not exists (select 1 from uses where uses.id = d.id)), '[]'),
    'gaps', coalesce((select jsonb_agg(jsonb_build_object('question', query_text, 'times', n, 'last', last)) from (
        select query_text, count(*) n, max(created_at) last from rets where results = 0 and query_text is not null and created_at > now() - interval '30 days'
        group by 1 having count(*) >= 2 order by count(*) desc limit 20) g), '[]'),
    'duplicates', coalesce((select jsonb_agg(jsonb_build_object('a', a.id, 'a_title', a.title, 'b', b.id, 'b_title', b.title)) from docs a join docs b on a.id < b.id
        and a.status <> 'archived' and b.status <> 'archived' and a.brand_id is not distinct from b.brand_id
        and (lower(trim(a.title)) = lower(trim(b.title)) or (select count(*) from (select unnest(regexp_split_to_array(lower(a.title), '[^[:alnum:]]+')) intersect select unnest(regexp_split_to_array(lower(b.title), '[^[:alnum:]]+'))) x)::real
            / greatest((select count(*) from (select unnest(regexp_split_to_array(lower(a.title), '[^[:alnum:]]+')) union select unnest(regexp_split_to_array(lower(b.title), '[^[:alnum:]]+'))) y), 1) >= 0.7)), '[]'),
    'broken_links', coalesce((select jsonb_agg(jsonb_build_object('from', l.from_document, 'from_title', f.title, 'to', l.to_document)) from kos_links l join docs f on f.id = l.from_document
        left join kos_documents t on t.id = l.to_document where l.to_document is not null and (t.id is null or t.status = 'archived')), '[]'),
    'orphans', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title)) from docs d where d.status <> 'archived'
        and not exists (select 1 from kos_links l where l.from_document = d.id or l.to_document = d.id)), '[]'),
    'computed_at', now()));
end $$;

-- ── Autopilot: events and the scheduled scan ────────────────────────────────────────────────────────────────────────
create or replace function public.ap_event_types() returns text[] language sql immutable as $$
  select array['lead.created', 'lead.stage_changed', 'contact.created', 'project.created', 'project.status_changed',
    'task.created', 'task.completed', 'task.overdue', 'project.deadline_approaching', 'milestone.completed',
    'invoice.created', 'invoice.overdue', 'payment.recorded', 'expense.recorded', 'project.budget_threshold',
    'knowledge.publication_completed', 'knowledge.sync_failed',
    'client.invited', 'client.invitation_accepted', 'partner.invited', 'partner.invitation_accepted', 'project.client_added',
    'project.client_status_changed', 'proposal.sent', 'proposal.accepted', 'proposal.rejected', 'deliverable.submitted',
    'deliverable.approved', 'deliverable.revision_requested', 'deliverable.rejected', 'client.request_created',
    'client.request_resolved', 'contract.approved', 'partner.assigned', 'partner.access_revoked',
    -- Knowledge OS (docs/knowledge-os.md section 13)
    'knowledge.review_requested', 'knowledge.review_overdue', 'knowledge.expiring', 'knowledge.document_published',
    'knowledge.document_archived', 'knowledge.duplicate_detected', 'knowledge.gap_detected'];
$$;

create or replace function public.kos_scan()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  today date := (now() at time zone 'Europe/Paris')::date;
  n int := 0;
begin
  for r in select * from kos_documents where status <> 'archived' and review_due < today loop
    if ap_emit('knowledge.review_overdue', r.brand_id, 'knowledge_document', r.id, jsonb_build_object('document_id', r.id, 'title', r.title, 'name', r.title, 'owner_id', r.owner_id, 'visibility', r.visibility, 'review_due', r.review_due),
               'kos.review_overdue:' || r.id || ':' || r.review_due) is not null then
      n := n + 1;
      if r.owner_id is not null then
        perform ap_notify_user(r.owner_id, r.brand_id, 'knowledge', 'normal', 'Knowledge review overdue: ' || r.title, 'Review date ' || r.review_due, '/workspace/knowledge/library?id=' || r.id, 'kos_overdue:' || r.id || ':' || r.review_due, 'knowledge');
      else
        perform ap_notify_admins(r.brand_id, r.brand_id is null or r.visibility = 'management', 'knowledge', 'normal', 'Unowned knowledge review overdue: ' || r.title, null, '/workspace/knowledge/library?id=' || r.id, 'kos_overdue:' || r.id || ':' || r.review_due, 'knowledge');
      end if;
    end if;
  end loop;
  for r in select * from kos_documents where status <> 'archived' and expires_on between today and today + 14 loop
    if ap_emit('knowledge.expiring', r.brand_id, 'knowledge_document', r.id, jsonb_build_object('document_id', r.id, 'title', r.title, 'name', r.title, 'owner_id', r.owner_id, 'expires_on', r.expires_on),
               'kos.expiring:' || r.id || ':' || r.expires_on) is not null then n := n + 1; end if;
  end loop;
  for r in select query_text, count(*) c from kos_retrievals where results = 0 and query_text is not null and created_at > now() - interval '7 days' group by 1 having count(*) >= 3 loop
    if ap_emit('knowledge.gap_detected', null, 'knowledge_gap', null, jsonb_build_object('title', 'Unanswered: ' || r.query_text, 'name', r.query_text, 'times', r.c),
               'kos.gap:' || md5(r.query_text) || ':' || to_char(today, 'IYYY-IW')) is not null then n := n + 1; end if;
  end loop;
  return jsonb_build_object('events', n);
end $$;

-- Monitoring now also runs the knowledge scan (same tick, same rate limit).
create or replace function public.ap_tick(p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s record;
  res jsonb;
begin
  if not (is_super_admin() or exists (select 1 from brand_admins where user_id = auth.uid() and role = 'brand_admin')) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  select * into s from autopilot_state where id = 1 for update;
  if not p_force and s.last_scan_at > now() - interval '2 minutes' then
    return jsonb_build_object('ran', false, 'last_scan_at', s.last_scan_at);
  end if;
  res := ap_scan();
  res := res || jsonb_build_object('knowledge', kos_scan());
  update autopilot_state set last_scan_at = now(), last_scan_by = auth.uid(), last_scan_result = res where id = 1;
  return jsonb_build_object('ran', true, 'last_scan_at', now());
end $$;

do $$
declare f text;
begin
  foreach f in array array['kos_require_edit(uuid)', 'kos_search_core(text, jsonb, uuid[], integer, uuid)', 'kos_scan()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['kos_allows(text, uuid, uuid, jsonb)', 'kos_my_identity()', 'kos_can_edit(text, uuid)', 'kos_is_live(text, integer, date)', 'kos_can_read_doc(kos_documents)',
    'kos_save(uuid, jsonb, text)', 'kos_set_schedule(uuid, uuid, date, integer, date)', 'kos_set_scope(uuid, text, uuid, uuid, boolean)', 'kos_transition(uuid, text, text, uuid)',
    'kos_restore_version(uuid, integer)', 'kos_duplicate(uuid)', 'kos_delete(uuid)', 'kos_link(uuid, uuid, text, text)', 'kos_unlink(uuid)', 'kos_query(text)',
    'kos_retrieve(text, text, uuid[], integer)', 'kos_simulate(text, text, uuid, uuid, uuid)', 'kos_insights(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

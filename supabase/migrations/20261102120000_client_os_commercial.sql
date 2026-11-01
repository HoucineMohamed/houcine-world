-- Houcine.world Client OS, part 3: commercial documents, analytics, search and the portal views
-- (docs/client-os.md, sections 10, 14, 15). Money is numeric(14,2), per currency, never converted or mixed.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Service catalogue
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (description is null or length(description) <= 2000),
  category text check (category is null or length(category) <= 80),
  unit text check (unit is null or length(unit) <= 40),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null check (currency in ('EUR', 'USD')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Proposals
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  reference text not null check (length(trim(reference)) between 1 and 60),
  title text not null check (length(trim(title)) between 1 and 200),
  summary text check (summary is null or length(summary) <= 5000),
  currency text not null check (currency in ('EUR', 'USD')),
  payment_terms text check (payment_terms is null or length(payment_terms) <= 1000),
  delivery_estimate text check (delivery_estimate is null or length(delivery_estimate) <= 300),
  terms text check (terms is null or length(terms) <= 20000),
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'negotiation', 'accepted', 'rejected', 'expired', 'withdrawn')),
  version int not null default 0,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decision_note text check (decision_note is null or length(decision_note) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, reference)
);
create index if not exists proposals_brand_status on public.proposals (brand_id, status);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  position int not null default 0,
  catalog_id uuid references public.service_catalog(id) on delete set null,
  category text check (category is null or length(category) <= 80),
  description text not null check (length(trim(description)) between 1 and 1000),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  tax_pct numeric(5, 2) not null default 0 check (tax_pct between 0 and 100)
);
create index if not exists proposal_items_proposal on public.proposal_items (proposal_id, position);

create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version)
);

create table if not exists public.proposal_events (
  id bigserial primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('created', 'sent', 'viewed', 'comment', 'reopened', 'accepted', 'rejected', 'withdrawn', 'expired', 'project_created')),
  version int,
  body text check (body is null or length(body) <= 4000),
  actor_kind text not null check (actor_kind in ('team', 'client', 'system')),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists proposal_events_proposal on public.proposal_events (proposal_id, created_at);

-- Who may read a proposal: the brand's admins; a client of that relationship once it was sent.
create or replace function public.cos_proposal_access(p_proposal uuid)
returns text language sql security definer stable set search_path = public as $$
  select case when ap_can_manage(p.brand_id) then 'manage'
              when p.status <> 'draft' and p.version > 0 and cos_client_membership(p.contact_id, p.brand_id) is not null then 'client' end
  from proposals p where p.id = p_proposal;
$$;

-- Totals, rounded per line (half up, 2 decimals): gross = qty x price; discount = gross x d%; net = gross - discount;
-- tax = net x t%; total = sum(net) + sum(tax). One currency per proposal.
create or replace function public.cos_proposal_totals(p_proposal uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with l as (
    select round(quantity * unit_price, 2) as gross, round(round(quantity * unit_price, 2) * discount_pct / 100, 2) as disc, tax_pct
    from proposal_items where proposal_id = p_proposal
  ), n as (select gross, disc, gross - disc as net, round((gross - disc) * tax_pct / 100, 2) as tax from l)
  select case when cos_proposal_access(p_proposal) is null then null else jsonb_build_object('currency', (select currency from proposals where id = p_proposal),
    'subtotal', coalesce(sum(gross), 0)::numeric(14, 2), 'discount', coalesce(sum(disc), 0)::numeric(14, 2),
    'net', coalesce(sum(net), 0)::numeric(14, 2), 'tax', coalesce(sum(tax), 0)::numeric(14, 2),
    'total', (coalesce(sum(net), 0) + coalesce(sum(tax), 0))::numeric(14, 2), 'lines', count(*)) end
  from n;
$$;

-- Items and the proposal itself change only while it is a draft or under negotiation.
create or replace function public.cos_proposal_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if tg_table_name = 'proposals' then
    if tg_op = 'INSERT' then
      if not cc_contact_in_brand(new.contact_id, new.brand_id) then raise exception 'The client is not linked to this brand.' using errcode = '22023'; end if;
      new.status := 'draft'; new.version := 0; new.created_by := (select id from profiles where id = auth.uid());
      return new;
    end if;
    if new.brand_id <> old.brand_id or new.contact_id <> old.contact_id then raise exception 'A proposal''s brand and client never change.' using errcode = '22023'; end if;
    -- Status, version and decision fields move only through the proposal functions (they set this flag).
    if coalesce(current_setting('client_os.proposal_fn', true), '') <> 'on' then
      if new.status <> old.status or new.version <> old.version or new.decided_at is distinct from old.decided_at or new.decided_by is distinct from old.decided_by
         or new.sent_at is distinct from old.sent_at or new.viewed_at is distinct from old.viewed_at or new.project_id is distinct from old.project_id then
        raise exception 'Use the proposal actions to change its status.' using errcode = '42501';
      end if;
      if old.status not in ('draft', 'negotiation') then raise exception 'Reopen the proposal before editing it.' using errcode = '22023'; end if;
    end if;
    if new.currency <> old.currency and exists (select 1 from proposal_items where proposal_id = new.id) then
      raise exception 'The currency cannot change once items are added.' using errcode = '22023';
    end if;
    new.updated_at := now();
    return new;
  else
    select * into p from proposals where id = coalesce(new.proposal_id, old.proposal_id);
    if p.status not in ('draft', 'negotiation') then raise exception 'Reopen the proposal before editing its items.' using errcode = '22023'; end if;
    if tg_op <> 'DELETE' then
      new.brand_id := p.brand_id;
      if new.catalog_id is not null and not exists (select 1 from service_catalog where id = new.catalog_id and brand_id = p.brand_id and currency = p.currency) then
        raise exception 'That catalogue service is from another brand or currency.' using errcode = '22023';
      end if;
      return new;
    end if;
    return old;
  end if;
end $$;
drop trigger if exists trg_proposals_guard on public.proposals;
create trigger trg_proposals_guard before insert or update on public.proposals for each row execute function public.cos_proposal_guard();
drop trigger if exists trg_proposal_items_guard on public.proposal_items;
create trigger trg_proposal_items_guard before insert or update or delete on public.proposal_items for each row execute function public.cos_proposal_guard();

create or replace function public.cos_proposal_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into proposal_events (proposal_id, brand_id, kind, actor_kind, actor_id) values (new.id, new.brand_id, 'created', 'team', new.created_by);
  perform cos_log('proposal.created', new.brand_id, 'proposal', new.id, jsonb_build_object('reference', new.reference, 'currency', new.currency, 'contact_id', new.contact_id));
  return null;
end $$;
drop trigger if exists trg_proposals_created on public.proposals;
create trigger trg_proposals_created after insert on public.proposals for each row execute function public.cos_proposal_created();

-- Send (or re-send after negotiation): a new numbered version with a frozen snapshot of the text, items and totals.
create or replace function public.cos_send_proposal(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p record;
  totals jsonb;
  snap jsonb;
  r record;
begin
  select * into p from proposals where id = p_id for update;
  if not found or not ap_can_manage(p.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p.status not in ('draft', 'negotiation') then raise exception 'Only a draft or a proposal under negotiation can be sent.' using errcode = '22023'; end if;
  if not exists (select 1 from proposal_items where proposal_id = p_id) then raise exception 'Add at least one item.' using errcode = '22023'; end if;
  if p.valid_until is null or p.valid_until < ap_today() then raise exception 'Set a validity date in the future.' using errcode = '22023'; end if;
  totals := cos_proposal_totals(p_id);
  snap := jsonb_build_object('reference', p.reference, 'title', p.title, 'summary', p.summary, 'currency', p.currency, 'payment_terms', p.payment_terms,
    'delivery_estimate', p.delivery_estimate, 'terms', p.terms, 'valid_until', p.valid_until, 'totals', totals,
    'items', (select jsonb_agg(jsonb_build_object('description', description, 'category', category, 'quantity', quantity, 'unit_price', unit_price,
      'discount_pct', discount_pct, 'tax_pct', tax_pct) order by position, id) from proposal_items where proposal_id = p_id));
  perform set_config('client_os.proposal_fn', 'on', true);
  update proposals set status = 'sent', version = p.version + 1, sent_at = now(), viewed_at = null where id = p_id;
  perform set_config('client_os.proposal_fn', '', true);
  insert into proposal_versions (proposal_id, brand_id, version, snapshot, created_by) values (p_id, p.brand_id, p.version + 1, snap, auth.uid());
  insert into proposal_events (proposal_id, brand_id, kind, version, actor_kind, actor_id) values (p_id, p.brand_id, 'sent', p.version + 1, 'team', auth.uid());
  perform cos_log('proposal.sent', p.brand_id, 'proposal', p_id, jsonb_build_object('version', p.version + 1, 'total', totals -> 'total', 'currency', p.currency));
  for r in select m.id from portal_memberships m where m.kind = 'client' and m.status = 'active' and m.brand_id = p.brand_id
             and cos_contact_matches(m.contact_id, p.contact_id) loop
    perform cos_notify_member(r.id, 'finance', 'high', 'New proposal: ' || p.title, null, '/portal/proposals?id=' || p_id, 'proposal:' || p_id || ':' || (p.version + 1));
  end loop;
  perform ap_emit('proposal.sent', p.brand_id, 'contact_brand', (select id from contact_brands where contact_id = p.contact_id and brand_id = p.brand_id),
    jsonb_build_object('proposal_id', p_id, 'reference', p.reference, 'title', p.title, 'name', p.title, 'currency', p.currency, 'amount', totals ->> 'total'), 'proposal.sent:' || p_id || ':' || (p.version + 1));
  return jsonb_build_object('version', p.version + 1, 'totals', totals);
end $$;

-- The client opened it (first time per version).
create or replace function public.cos_proposal_viewed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from proposals where id = p_id for update;
  if not found or cos_proposal_access(p_id) <> 'client' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p.status = 'sent' then
    perform set_config('client_os.proposal_fn', 'on', true);
    update proposals set status = 'viewed', viewed_at = now() where id = p_id;
    perform set_config('client_os.proposal_fn', '', true);
    insert into proposal_events (proposal_id, brand_id, kind, version, actor_kind, actor_id) values (p_id, p.brand_id, 'viewed', p.version, 'client', auth.uid());
  end if;
end $$;

-- The client's decision on the version they read. Refused if the proposal changed, expired, or was already decided.
create or replace function public.cos_decide_proposal(p_id uuid, p_version int, p_accept boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p record;
  st text := case when p_accept then 'accepted' else 'rejected' end;
begin
  select * into p from proposals where id = p_id for update;
  if not found or coalesce(cos_proposal_access(p_id), '') <> 'client' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p.status in ('accepted', 'rejected') then raise exception 'This proposal was already %.', p.status using errcode = '22023'; end if;
  if p.status not in ('sent', 'viewed') then raise exception 'This proposal is not open for a decision.' using errcode = '22023'; end if;
  if p.version <> p_version then raise exception 'The proposal changed since you opened it. Read version % first.', p.version using errcode = '22023'; end if;
  if p.valid_until < ap_today() then
    perform set_config('client_os.proposal_fn', 'on', true);
    update proposals set status = 'expired' where id = p_id;
    perform set_config('client_os.proposal_fn', '', true);
    insert into proposal_events (proposal_id, brand_id, kind, version, actor_kind) values (p_id, p.brand_id, 'expired', p.version, 'system');
    return jsonb_build_object('status', 'expired');
  end if;
  perform set_config('client_os.proposal_fn', 'on', true);
  update proposals set status = st, decided_at = now(), decided_by = auth.uid(), decision_note = left(p_note, 2000) where id = p_id;
  perform set_config('client_os.proposal_fn', '', true);
  insert into proposal_events (proposal_id, brand_id, kind, version, body, actor_kind, actor_id) values (p_id, p.brand_id, st, p.version, left(p_note, 4000), 'client', auth.uid());
  perform cos_log('proposal.' || st, p.brand_id, 'proposal', p_id, jsonb_build_object('version', p.version, 'decided_by', auth.uid(), 'reference', p.reference));
  perform ap_notify_admins(p.brand_id, false, 'finance', 'high', 'Proposal ' || p.reference || ' ' || st || ' by the client', p_note,
    '/workspace/clients/proposals?id=' || p_id, 'proposal_decision:' || p_id, 'client_os');
  perform ap_emit('proposal.' || st, p.brand_id, 'contact_brand', (select id from contact_brands where contact_id = p.contact_id and brand_id = p.brand_id),
    jsonb_build_object('proposal_id', p_id, 'reference', p.reference, 'title', p.title, 'name', p.title, 'currency', p.currency, 'amount', cos_proposal_totals(p_id) ->> 'total'),
    'proposal.decision:' || p_id);
  return jsonb_build_object('status', st);
end $$;

-- The team: reopen for negotiation (a new version is sent afterwards), or withdraw.
create or replace function public.cos_proposal_action(p_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from proposals where id = p_id for update;
  if not found or not ap_can_manage(p.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_action = 'reopen' and p.status in ('sent', 'viewed', 'expired', 'rejected') then
    perform set_config('client_os.proposal_fn', 'on', true);
    update proposals set status = 'negotiation', decided_at = null, decided_by = null where id = p_id;
  elsif p_action = 'withdraw' and p.status in ('draft', 'sent', 'viewed', 'negotiation') then
    perform set_config('client_os.proposal_fn', 'on', true);
    update proposals set status = 'withdrawn' where id = p_id;
  else
    raise exception 'This action is not possible now.' using errcode = '22023';
  end if;
  perform set_config('client_os.proposal_fn', '', true);
  insert into proposal_events (proposal_id, brand_id, kind, version, body, actor_kind, actor_id)
  values (p_id, p.brand_id, case when p_action = 'reopen' then 'reopened' else 'withdrawn' end, p.version, left(p_note, 4000), 'team', auth.uid());
  perform cos_log('proposal.' || case when p_action = 'reopen' then 'reopened' else 'withdrawn' end, p.brand_id, 'proposal', p_id, '{}');
end $$;

-- A comment on a sent proposal, by the client or the team.
create or replace function public.cos_proposal_comment(p_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  p record;
  a text := cos_proposal_access(p_id);
begin
  select * into p from proposals where id = p_id;
  if a is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if nullif(trim(p_body), '') is null then raise exception 'Write a comment.' using errcode = '22023'; end if;
  insert into proposal_events (proposal_id, brand_id, kind, version, body, actor_kind, actor_id)
  values (p_id, p.brand_id, 'comment', p.version, left(p_body, 4000), case when a = 'manage' then 'team' else 'client' end, auth.uid());
  if a = 'client' then
    perform ap_notify_admins(p.brand_id, false, 'finance', 'normal', 'Client comment on proposal ' || p.reference, left(p_body, 300),
      '/workspace/clients/proposals?id=' || p_id, 'proposal_comment:' || p_id || ':' || extract(epoch from now())::bigint, 'client_os');
  end if;
end $$;

-- After acceptance, an admin creates the project ONCE (asking again returns the same project). Nothing financial is
-- invented: the proposal stays the record of the agreed amount.
create or replace function public.cos_project_from_proposal(p_id uuid, p_name text default null, p_deadline date default null, p_share_with_client boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p record;
  pid uuid;
  r record;
  lid uuid;
begin
  select * into p from proposals where id = p_id for update;
  if not found or not ap_can_manage(p.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p.status <> 'accepted' then raise exception 'Only an accepted proposal becomes a project.' using errcode = '22023'; end if;
  if p.project_id is not null then return p.project_id; end if;
  lid := coalesce((select id from project_lifecycles where brand_id = p.brand_id and is_default), (select id from project_lifecycles where brand_id is null and is_default));
  insert into projects (brand_id, client_contact_id, lead_id, name, description, owner_id, status, start_date, deadline, currency, lifecycle_id, stage_key, stage_changed_at, created_by)
  values (p.brand_id, p.contact_id, p.lead_id, coalesce(nullif(trim(p_name), ''), p.title), p.summary, auth.uid(), 'active', ap_today(), p_deadline, p.currency, lid,
          case when exists (select 1 from lifecycle_stages where lifecycle_id = lid and key = 'onboarding') then 'onboarding' end, now(), auth.uid())
  returning id into pid;
  perform set_config('client_os.proposal_fn', 'on', true);
  update proposals set project_id = pid where id = p_id;
  perform set_config('client_os.proposal_fn', '', true);
  insert into proposal_events (proposal_id, brand_id, kind, version, actor_kind, actor_id) values (p_id, p.brand_id, 'project_created', p.version, 'team', auth.uid());
  if p_share_with_client then
    for r in select m.id from portal_memberships m where m.kind = 'client' and m.status = 'active' and m.brand_id = p.brand_id
               and cos_contact_matches(m.contact_id, p.contact_id) loop
      insert into project_participants (project_id, brand_id, membership_id, scope, added_by) values (pid, p.brand_id, r.id, 'project', auth.uid()) on conflict do nothing;
    end loop;
  end if;
  perform cos_log('proposal.project_created', p.brand_id, 'project', pid, jsonb_build_object('proposal_id', p_id));
  return pid;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Contracts (approval records, NOT electronic signatures: no signature provider is configured)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  body text not null check (length(body) between 1 and 50000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  proposal_id uuid references public.proposals(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  template_id uuid references public.contract_templates(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  body text not null check (length(body) between 1 and 50000),
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'declined', 'cancelled')),
  version int not null default 0,
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decision_note text check (decision_note is null or length(decision_note) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contracts_brand on public.contracts (brand_id, status);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  version int not null,
  title text not null,
  body text not null,
  body_sha256 text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contract_id, version)
);

create table if not exists public.contract_events (
  id bigserial primary key,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('created', 'sent', 'approved', 'declined', 'cancelled', 'reopened')),
  version int,
  body text check (body is null or length(body) <= 4000),
  actor_kind text not null check (actor_kind in ('team', 'client')),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.cos_contract_access(p_contract uuid)
returns text language sql security definer stable set search_path = public as $$
  select case when ap_can_manage(c.brand_id) then 'manage'
              when c.version > 0 and c.status <> 'draft' and cos_client_membership(c.contact_id, c.brand_id) is not null then 'client' end
  from contracts c where c.id = p_contract;
$$;

create or replace function public.cos_contract_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not cc_contact_in_brand(new.contact_id, new.brand_id) then raise exception 'The client is not linked to this brand.' using errcode = '22023'; end if;
    if new.proposal_id is not null and not exists (select 1 from proposals where id = new.proposal_id and brand_id = new.brand_id and contact_id = new.contact_id) then
      raise exception 'The proposal belongs to another client.' using errcode = '22023';
    end if;
    if new.project_id is not null and not exists (select 1 from projects where id = new.project_id and brand_id = new.brand_id) then raise exception 'The project is in another brand.' using errcode = '22023'; end if;
    new.status := 'draft'; new.version := 0; new.created_by := (select id from profiles where id = auth.uid());
    return new;
  end if;
  if new.brand_id <> old.brand_id or new.contact_id <> old.contact_id then raise exception 'A contract''s brand and client never change.' using errcode = '22023'; end if;
  if coalesce(current_setting('client_os.contract_fn', true), '') <> 'on' then
    if new.status <> old.status or new.version <> old.version or new.decided_at is distinct from old.decided_at or new.sent_at is distinct from old.sent_at then
      raise exception 'Use the contract actions to change its status.' using errcode = '42501';
    end if;
    if old.status <> 'draft' then raise exception 'Reopen the contract before editing it.' using errcode = '22023'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_contracts_guard on public.contracts;
create trigger trg_contracts_guard before insert or update on public.contracts for each row execute function public.cos_contract_guard();

-- Team actions: send (a frozen, hashed version), reopen (back to draft; a later send is a new version), cancel.
create or replace function public.cos_contract_action(p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c record;
  r record;
begin
  select * into c from contracts where id = p_id for update;
  if not found or not ap_can_manage(c.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  perform set_config('client_os.contract_fn', 'on', true);
  if p_action = 'send' and c.status = 'draft' then
    update contracts set status = 'sent', version = c.version + 1, sent_at = now(), decided_at = null, decided_by = null where id = p_id;
    insert into contract_versions (contract_id, brand_id, version, title, body, body_sha256, created_by)
    values (p_id, c.brand_id, c.version + 1, c.title, c.body, encode(sha256(convert_to(c.body, 'UTF8')), 'hex'), auth.uid());
    for r in select m.id from portal_memberships m where m.kind = 'client' and m.status = 'active' and m.brand_id = c.brand_id
               and cos_contact_matches(m.contact_id, c.contact_id) loop
      perform cos_notify_member(r.id, 'finance', 'high', 'Contract to review: ' || c.title, null, '/portal/contracts?id=' || p_id, 'contract:' || p_id || ':' || (c.version + 1));
    end loop;
  elsif p_action = 'reopen' and c.status in ('sent', 'declined') then
    update contracts set status = 'draft' where id = p_id;
  elsif p_action = 'cancel' and c.status in ('draft', 'sent', 'declined') then
    update contracts set status = 'cancelled' where id = p_id;
  else
    perform set_config('client_os.contract_fn', '', true);
    raise exception 'This action is not possible now.' using errcode = '22023';
  end if;
  perform set_config('client_os.contract_fn', '', true);
  insert into contract_events (contract_id, brand_id, kind, version, actor_kind, actor_id)
  values (p_id, c.brand_id, case p_action when 'send' then 'sent' when 'reopen' then 'reopened' else 'cancelled' end,
          case when p_action = 'send' then c.version + 1 else c.version end, 'team', auth.uid());
  perform cos_log('contract.' || p_action, c.brand_id, 'contract', p_id, jsonb_build_object('version', case when p_action = 'send' then c.version + 1 else c.version end));
  return jsonb_build_object('status', (select status from contracts where id = p_id));
end $$;

-- The client's approval (or decline) of the exact version they read. This is an approval record, not a signature.
create or replace function public.cos_decide_contract(p_id uuid, p_version int, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c record;
  st text := case when p_approve then 'approved' else 'declined' end;
begin
  select * into c from contracts where id = p_id for update;
  if not found or coalesce(cos_contract_access(p_id), '') <> 'client' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if c.status <> 'sent' then raise exception 'This contract is not waiting for a decision.' using errcode = '22023'; end if;
  if c.version <> p_version then raise exception 'The contract changed since you opened it. Read version % first.', c.version using errcode = '22023'; end if;
  perform set_config('client_os.contract_fn', 'on', true);
  update contracts set status = st, decided_at = now(), decided_by = auth.uid(), decision_note = left(p_note, 2000) where id = p_id;
  perform set_config('client_os.contract_fn', '', true);
  insert into contract_events (contract_id, brand_id, kind, version, body, actor_kind, actor_id) values (p_id, c.brand_id, st, c.version, left(p_note, 4000), 'client', auth.uid());
  perform cos_log('contract.' || st, c.brand_id, 'contract', p_id, jsonb_build_object('version', c.version, 'body_sha256', (select body_sha256 from contract_versions where contract_id = p_id and version = c.version)));
  perform ap_notify_admins(c.brand_id, false, 'finance', 'high', 'Contract "' || c.title || '" ' || st || ' by the client', p_note, '/workspace/clients/contracts?id=' || p_id, 'contract_decision:' || p_id || ':' || c.version, 'client_os');
  if p_approve and c.project_id is not null then
    perform cos_emit('contract.approved', c.project_id, 'contract.approved:' || p_id || ':' || c.version, jsonb_build_object('contract_id', p_id, 'title', c.title));
  end if;
  return jsonb_build_object('status', st);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare t text; p record;
begin
  foreach t in array array['service_catalog', 'proposals', 'proposal_items', 'proposal_versions', 'proposal_events', 'contract_templates', 'contracts', 'contract_versions', 'contract_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy "service_catalog_all" on public.service_catalog for all to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert, update, delete on public.service_catalog to authenticated;

-- The team edits proposals; a client reads a sent proposal only through its frozen version (proposal_versions).
create policy "proposals_select" on public.proposals for select to authenticated using (public.cos_proposal_access(id) is not null);
create policy "proposals_insert" on public.proposals for insert to authenticated with check (public.ap_can_manage(brand_id));
create policy "proposals_update" on public.proposals for update to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert, update on public.proposals to authenticated;
create policy "proposal_items_select" on public.proposal_items for select to authenticated using (public.ap_can_manage(brand_id));
create policy "proposal_items_write" on public.proposal_items for all to authenticated
  using (public.ap_can_manage(brand_id)) with check (exists (select 1 from public.proposals p where p.id = proposal_id and public.ap_can_manage(p.brand_id)));
grant select, insert, update, delete on public.proposal_items to authenticated;
create policy "proposal_versions_select" on public.proposal_versions for select to authenticated using (public.cos_proposal_access(proposal_id) is not null);
grant select on public.proposal_versions to authenticated;
create policy "proposal_events_select" on public.proposal_events for select to authenticated using (public.cos_proposal_access(proposal_id) is not null);
grant select on public.proposal_events to authenticated;

create policy "contract_templates_all" on public.contract_templates for all to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert, update, delete on public.contract_templates to authenticated;
create policy "contracts_select" on public.contracts for select to authenticated using (public.cos_contract_access(id) = 'manage');
create policy "contracts_insert" on public.contracts for insert to authenticated with check (public.ap_can_manage(brand_id));
create policy "contracts_update" on public.contracts for update to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert, update on public.contracts to authenticated;
create policy "contract_versions_select" on public.contract_versions for select to authenticated using (public.cos_contract_access(contract_id) is not null);
grant select on public.contract_versions to authenticated;
create policy "contract_events_select" on public.contract_events for select to authenticated using (public.cos_contract_access(contract_id) is not null);
grant select on public.contract_events to authenticated;

drop trigger if exists trg_proposal_versions_append_only on public.proposal_versions;
create trigger trg_proposal_versions_append_only before update or delete on public.proposal_versions for each row execute function public.cc_append_only();
drop trigger if exists trg_proposal_events_append_only on public.proposal_events;
create trigger trg_proposal_events_append_only before update or delete on public.proposal_events for each row execute function public.cc_append_only();
drop trigger if exists trg_contract_versions_append_only on public.contract_versions;
create trigger trg_contract_versions_append_only before update or delete on public.contract_versions for each row execute function public.cc_append_only();
drop trigger if exists trg_contract_events_append_only on public.contract_events;
create trigger trg_contract_events_append_only before update or delete on public.contract_events for each row execute function public.cc_append_only();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Autopilot: the new event types (the rest of Autopilot is unchanged)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_event_types() returns text[] language sql immutable as $$
  select array['lead.created', 'lead.stage_changed', 'contact.created', 'project.created', 'project.status_changed',
    'task.created', 'task.completed', 'task.overdue', 'project.deadline_approaching', 'milestone.completed',
    'invoice.created', 'invoice.overdue', 'payment.recorded', 'expense.recorded', 'project.budget_threshold',
    'knowledge.publication_completed', 'knowledge.sync_failed',
    -- Client OS (docs/client-os.md section 14)
    'client.invited', 'client.invitation_accepted', 'partner.invited', 'partner.invitation_accepted', 'project.client_added',
    'project.client_status_changed', 'proposal.sent', 'proposal.accepted', 'proposal.rejected', 'deliverable.submitted',
    'deliverable.approved', 'deliverable.revision_requested', 'deliverable.rejected', 'client.request_created',
    'client.request_resolved', 'contract.approved', 'partner.assigned', 'partner.access_revoked'];
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Analytics (database-side; scope = the brands the caller manages; money per currency, never mixed)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.cos_analytics(p_brand uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  scope uuid[];
  today date := ap_today();
  res jsonb;
begin
  if p_brand is not null then
    if not ap_can_manage(p_brand) then raise exception 'Not allowed.' using errcode = '42501'; end if;
    scope := array[p_brand];
  elsif is_super_admin() then
    select array_agg(id) into scope from brands where deleted_at is null;
  else
    select array_agg(brand_id) into scope from brand_admins where user_id = auth.uid() and role = 'brand_admin';
  end if;
  if scope is null then raise exception 'Not allowed.' using errcode = '42501'; end if;

  with cb as (select * from contact_brands where brand_id = any (scope) and status = 'client'),
  pr as (select * from projects where brand_id = any (scope) and deleted_at is null),
  props as (select p.*, (cos_proposal_totals(p.id) ->> 'total')::numeric as total from proposals p where p.brand_id = any (scope)),
  inv as (select i.*, coalesce((select sum(amount) from payments x where x.invoice_id = i.id), 0) as paid from invoices i where i.brand_id = any (scope) and i.status = 'sent'),
  client_projects as (select client_contact_id, brand_id, count(*) as n, max(created_at) as last_at, min(created_at) as first_at from pr where client_contact_id is not null group by 1, 2)
  select jsonb_build_object(
    'scope_brands', cardinality(scope),
    'clients', jsonb_build_object(
      'total', (select count(*) from cb),
      'active', (select count(*) from cb where exists (select 1 from pr where pr.client_contact_id = cb.contact_id and pr.brand_id = cb.brand_id and pr.status = 'active')),
      'new_by_month', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'count', n) order by m) from (
          select to_char(date_trunc('month', became_client_at), 'YYYY-MM') as m, count(*) as n from cb where became_client_at >= date_trunc('month', today) - interval '11 months' group by 1) x), '[]'::jsonb),
      'by_brand', coalesce((select jsonb_agg(jsonb_build_object('brand_id', brand_id, 'brand', (select name from brands where id = brand_id), 'count', n)) from (
          select brand_id, count(*) as n from cb group by 1) x), '[]'::jsonb),
      'with_project', (select count(*) from client_projects),
      'repeat', (select count(*) from client_projects where n >= 2),
      'retained', (select count(*) from client_projects where first_at < now() - interval '12 months' and last_at >= now() - interval '12 months'),
      'eligible_for_retention', (select count(*) from client_projects where first_at < now() - interval '12 months')),
    'projects', jsonb_build_object(
      'active', (select count(*) from pr where status = 'active'),
      'completed', (select count(*) from pr where status = 'completed'),
      'delayed', (select count(*) from pr where status in ('planned', 'active', 'on_hold') and deadline < today),
      'awaiting_approval', (select count(distinct project_id) from deliverables where brand_id = any (scope) and status = 'submitted'),
      'avg_delivery_days', (select round(avg(extract(epoch from (completed_at - coalesce(start_date::timestamptz, created_at))) / 86400)::numeric, 1)
                            from pr where status = 'completed' and completed_at is not null),
      'completed_measured', (select count(*) from pr where status = 'completed' and completed_at is not null),
      'avg_approval_hours', (select round(avg(extract(epoch from (r.created_at - v.submitted_at)) / 3600)::numeric, 1)
                             from deliverable_reviews r join deliverable_versions v on v.id = r.version_id where r.brand_id = any (scope) and r.reviewer_kind = 'client'),
      'approvals_measured', (select count(*) from deliverable_reviews where brand_id = any (scope) and reviewer_kind = 'client')),
    'proposals', jsonb_build_object(
      'open', (select count(*) from props where status in ('sent', 'viewed', 'negotiation')),
      'accepted', (select count(*) from props where status = 'accepted'),
      'rejected', (select count(*) from props where status = 'rejected'),
      'expired', (select count(*) from props where status = 'expired' or (status in ('sent', 'viewed') and valid_until < today)),
      'conversion_pct', (select case when count(*) filter (where status in ('accepted', 'rejected')) > 0
                          then round(100.0 * count(*) filter (where status = 'accepted') / count(*) filter (where status in ('accepted', 'rejected')), 1) end from props)),
    -- Money, one entry per currency.
    'money', coalesce((select jsonb_object_agg(cur, jsonb_build_object(
        'expected', (select coalesce(sum(total), 0) from props where currency = cur and status in ('sent', 'viewed', 'negotiation')),
        'contracted', (select coalesce(sum(total), 0) from props where currency = cur and status = 'accepted'),
        'invoiced', (select coalesce(sum(amount), 0) from inv where currency = cur),
        'received', (select coalesce(sum(amount), 0) from payments where brand_id = any (scope) and currency = cur),
        'outstanding', (select coalesce(sum(greatest(amount - paid, 0)), 0) from inv where currency = cur),
        'overdue', (select coalesce(sum(greatest(amount - paid, 0)), 0) from inv where currency = cur and due_date < today))) from unnest(array['EUR', 'USD']) cur), '{}'::jsonb),
    'revenue_by_client', coalesce((select jsonb_agg(x order by x ->> 'currency', (x ->> 'received')::numeric desc) from (
        select jsonb_build_object('contact_id', contact_id, 'client', (select name from contacts where id = contact_id), 'currency', currency, 'received', sum(amount)) as x
        from payments where brand_id = any (scope) and contact_id is not null group by contact_id, currency order by sum(amount) desc limit 20) y), '[]'::jsonb),
    'revenue_by_brand', coalesce((select jsonb_agg(jsonb_build_object('brand_id', brand_id, 'brand', (select name from brands where id = brand_id), 'currency', currency, 'received', s)) from (
        select brand_id, currency, sum(amount) as s from payments where brand_id = any (scope) group by 1, 2) y), '[]'::jsonb),
    'contracted_by_category', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'currency', currency, 'amount', s)) from (
        select coalesce(i.category, 'Uncategorized') as category, p.currency, sum(round(round(i.quantity * i.unit_price, 2) * (1 - i.discount_pct / 100), 2)) as s
        from proposal_items i join proposals p on p.id = i.proposal_id where p.brand_id = any (scope) and p.status = 'accepted' group by 1, 2) y), '[]'::jsonb),
    'computed_at', now()
  ) into res;
  return res;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Search (SECURITY INVOKER: every table's own row-level security filters the results)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.cos_search(p_q text, p_kinds text[] default null, p_limit int default 20, p_offset int default 0)
returns table (kind text, id uuid, brand_id uuid, title text, subtitle text, updated_at timestamptz)
language sql stable security invoker set search_path = public as $$
  with q as (select '%' || replace(replace(replace(lower(trim(coalesce(p_q, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat)
  select * from (
    select 'client'::text, c.id, cb.brand_id, c.name, coalesce(c.email, c.kind), c.updated_at from contacts c join contact_brands cb on cb.contact_id = c.id, q
      where c.deleted_at is null and cb.status in ('client', 'prospect') and (lower(c.name) like q.pat or lower(coalesce(c.email, '')) like q.pat)
    union all
    select 'partner', c.id, cb.brand_id, c.name, coalesce(c.email, c.kind), c.updated_at from contacts c join contact_brands cb on cb.contact_id = c.id, q
      where c.deleted_at is null and cb.status = 'partner' and (lower(c.name) like q.pat or lower(coalesce(c.email, '')) like q.pat)
    union all
    select 'organization', c.id, null::uuid, c.name, 'organization', c.updated_at from contacts c, q where c.kind = 'organization' and c.deleted_at is null and lower(c.name) like q.pat
    union all
    select 'project', p.id, p.brand_id, p.name, p.status, p.updated_at from projects p, q where p.deleted_at is null and lower(p.name) like q.pat
    union all
    select 'proposal', p.id, p.brand_id, p.reference || ' · ' || p.title, p.status, p.updated_at from proposals p, q where lower(p.reference || ' ' || p.title) like q.pat
    union all
    select 'contract', c.id, c.brand_id, c.title, c.status, c.updated_at from contracts c, q where lower(c.title) like q.pat
    union all
    select 'deliverable', d.id, d.brand_id, d.title, d.status, d.updated_at from deliverables d, q where lower(d.title) like q.pat
    union all
    select 'request', r.id, r.brand_id, r.title, r.status, r.updated_at from client_requests r, q where lower(r.title) like q.pat
  ) s(kind, id, brand_id, title, subtitle, updated_at)
  where length(trim(coalesce(p_q, ''))) >= 2 and (p_kinds is null or s.kind = any (p_kinds))
  order by s.updated_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Portal views (security definer; each returns ONLY client-safe or partner-safe fields of authorized records)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- One project as a client or a partner sees it.
create or replace function public.portal_project(p_project uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  access text := cos_project_access(p_project);
  p record;
  lid uuid;
  st record;
  done int;
  total int;
begin
  if access is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into p from projects where id = p_project and deleted_at is null;
  if not found then raise exception 'Not allowed.' using errcode = '42501'; end if;
  lid := cos_project_lifecycle(p_project);
  select * into st from lifecycle_stages where lifecycle_id = lid and key = p.stage_key;
  select count(*) filter (where status = 'done'), count(*) into done, total from tasks where project_id = p_project and (access = 'manage' or client_visible);
  if access = 'partner_tasks' then
    return jsonb_build_object('id', p.id, 'name', p.name, 'brand', (select name from brands where id = p.brand_id), 'access', access,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date,
                 'can_submit', a.can_submit, 'expires_at', a.expires_at) order by t.due_date nulls last)
               from tasks t join partner_task_assignments a on a.task_id = t.id
               where t.project_id = p_project and a.status = 'active' and (a.expires_at is null or a.expires_at > now()) and a.membership_id in (select cos_my_memberships('partner'))), '[]'::jsonb));
  end if;
  return jsonb_build_object(
    'id', p.id, 'name', p.name, 'brand_id', p.brand_id, 'brand', (select name from brands where id = p.brand_id), 'access', access,
    'summary', p.client_summary,
    'status', case when p.status = 'completed' then 'Completed' when p.status = 'cancelled' then 'Cancelled' else coalesce(st.client_label, st.label,
                case p.status when 'planned' then 'Getting started' when 'on_hold' then 'Paused' else 'In progress' end) end,
    'start_date', p.start_date, 'deadline', p.deadline,
    'progress', jsonb_build_object('done', done, 'total', total),
    'manager', (select coalesce(full_name, 'Project manager') from profiles where id = p.owner_id),
    'milestones', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'due_date', m.due_date, 'completed', m.completed_at is not null) order by m.due_date nulls last)
                  from milestones m where m.project_id = p_project), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'due_date', t.due_date) order by t.due_date nulls last)
             from tasks t where t.project_id = p_project and t.client_visible), '[]'::jsonb),
    'deliverables', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'description', d.description, 'status', d.status, 'due_date', d.due_date,
               'approved_version', d.approved_version,
               'versions', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'note', v.note, 'file_id', v.file_id, 'link_url', v.link_url,
                    'file_name', (select file_name from cos_files where id = v.file_id), 'mime_type', (select mime_type from cos_files where id = v.file_id), 'submitted_at', v.submitted_at,
                    'review', (select jsonb_build_object('decision', r.decision, 'comment', r.comment, 'at', r.created_at) from deliverable_reviews r where r.version_id = v.id and r.reviewer_kind = 'client'))
                    order by v.version desc) from deliverable_versions v where v.deliverable_id = d.id and v.audience = 'client'), '[]'::jsonb))
               order by d.created_at) from deliverables d where d.project_id = p_project and d.current_version > 0
                 and exists (select 1 from deliverable_versions v where v.deliverable_id = d.id and v.audience = 'client')), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.file_name, 'mime_type', f.mime_type, 'size', f.size_bytes, 'created_at', f.created_at) order by f.created_at desc)
             from cos_files f where f.project_id = p_project and f.status = 'ready' and f.purpose = 'project' and cos_can_read_file(f.id)), '[]'::jsonb),
    'stage_history', case when access = 'client' then coalesce((select jsonb_agg(jsonb_build_object('status', coalesce(s.client_label, s.label), 'at', h.created_at) order by h.created_at)
             from project_stage_history h join lifecycle_stages s on s.lifecycle_id = lid and s.key = h.to_stage where h.project_id = p_project), '[]'::jsonb) end);
end $$;

-- The client's home: their relationships, projects, pending approvals, proposals, contracts, invoices and requests.
create or replace function public.portal_client_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  ms uuid[];
begin
  select array_agg(id) into ms from cos_my_memberships('client') id;
  if ms is null then return jsonb_build_object('memberships', '[]'::jsonb); end if;
  return jsonb_build_object(
    'memberships', (select jsonb_agg(jsonb_build_object('id', m.id, 'brand_id', m.brand_id, 'brand', b.name, 'contact', c.name)) from portal_memberships m
                     join brands b on b.id = m.brand_id join contacts c on c.id = m.contact_id where m.id = any (ms)),
    'projects', coalesce((select jsonb_agg(portal_project(pp.project_id) order by pp.created_at desc) from (select distinct on (project_id) project_id, created_at from project_participants
                  where membership_id = any (ms) and status = 'active' and (expires_at is null or expires_at > now())) pp
                  where exists (select 1 from projects where id = pp.project_id and deleted_at is null)), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'reference', p.reference, 'title', p.title, 'brand', (select name from brands where id = p.brand_id),
                   'status', case when p.status in ('sent', 'viewed') and p.valid_until < ap_today() then 'expired' else p.status end, 'version', p.version,
                   'valid_until', p.valid_until, 'currency', p.currency, 'total', (v.snapshot -> 'totals' ->> 'total'), 'sent_at', p.sent_at) order by p.sent_at desc)
                 from proposals p join proposal_versions v on v.proposal_id = p.id and v.version = p.version
                 where p.status <> 'draft' and cos_proposal_access(p.id) = 'client'), '[]'::jsonb),
    'contracts', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', v.title, 'brand', (select name from brands where id = c.brand_id), 'status', c.status,
                   'version', c.version, 'sent_at', c.sent_at, 'decided_at', c.decided_at) order by c.sent_at desc)
                 from contracts c join contract_versions v on v.contract_id = c.id and v.version = c.version where cos_contract_access(c.id) = 'client'), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number, 'brand', (select name from brands where id = i.brand_id),
                   'issue_date', i.issue_date, 'due_date', i.due_date, 'currency', i.currency, 'amount', i.amount,
                   'paid', coalesce((select sum(amount) from payments x where x.invoice_id = i.id), 0),
                   'balance', i.amount - coalesce((select sum(amount) from payments x where x.invoice_id = i.id), 0),
                   'payments', coalesce((select jsonb_agg(jsonb_build_object('amount', x.amount, 'currency', x.currency, 'received_on', x.received_on) order by x.received_on)
                                from payments x where x.invoice_id = i.id), '[]'::jsonb),
                   'instructions', s.payment_instructions, 'description', i.description) order by i.issue_date desc)
                 from invoices i join cos_invoice_shares s on s.invoice_id = i.id and s.revoked_at is null
                 where i.status = 'sent' and exists (select 1 from portal_memberships m where m.id = any (ms) and m.brand_id = i.brand_id
                   and cos_contact_matches(m.contact_id, i.contact_id))), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'category', r.category, 'status', r.status, 'brand_id', r.brand_id,
                   'project_id', r.project_id, 'created_at', r.created_at, 'resolved_at', r.resolved_at) order by r.created_at desc)
                 from client_requests r where r.membership_id = any (ms)), '[]'::jsonb));
end $$;

-- A partner's home: collaborations (project scope), assigned tasks, shared files.
create or replace function public.portal_partner_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare ms uuid[];
begin
  select array_agg(id) into ms from cos_my_memberships('partner') id;
  if ms is null then return jsonb_build_object('memberships', '[]'::jsonb); end if;
  return jsonb_build_object(
    'memberships', (select jsonb_agg(jsonb_build_object('id', m.id, 'brand_id', m.brand_id, 'brand', b.name, 'contact', c.name)) from portal_memberships m
                     join brands b on b.id = m.brand_id join contacts c on c.id = m.contact_id where m.id = any (ms)),
    'collaborations', coalesce((select jsonb_agg(jsonb_build_object('project_id', p.id, 'name', p.name, 'brand', (select name from brands where id = p.brand_id),
                   'scope', pp.scope, 'deadline', p.deadline, 'expires_at', pp.expires_at) order by p.name)
                 from project_participants pp join projects p on p.id = pp.project_id
                 where pp.membership_id = any (ms) and pp.status = 'active' and (pp.expires_at is null or pp.expires_at > now()) and p.deleted_at is null), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date,
                   'project_id', t.project_id, 'project', (select name from projects where id = t.project_id), 'can_submit', a.can_submit, 'expires_at', a.expires_at,
                   'deliverables', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'status', d.status, 'current_version', d.current_version))
                                   from deliverables d where d.task_id = t.id and d.partner_membership_id = a.membership_id), '[]'::jsonb)) order by t.due_date nulls last)
                 from partner_task_assignments a join tasks t on t.id = a.task_id
                 where a.membership_id = any (ms) and a.status = 'active' and (a.expires_at is null or a.expires_at > now())), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.file_name, 'mime_type', f.mime_type, 'size', f.size_bytes, 'project_id', f.project_id,
                   'expires_at', s.expires_at, 'shared_at', s.created_at) order by s.created_at desc)
                 from cos_file_shares s join cos_files f on f.id = s.file_id
                 where s.membership_id = any (ms) and s.revoked_at is null and (s.expires_at is null or s.expires_at > now()) and f.status = 'ready'), '[]'::jsonb),
    'agreements', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', v.title, 'status', c.status, 'version', c.version))
                 from contracts c join contract_versions v on v.contract_id = c.id and v.version = c.version
                 where c.status <> 'draft' and exists (select 1 from portal_memberships m where m.id = any (ms) and m.contact_id = c.contact_id and m.brand_id = c.brand_id)), '[]'::jsonb));
end $$;

-- Partners read their agreement's frozen text through this (contracts with their own contact).
create or replace function public.portal_partner_agreement(p_contract uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'title', v.title, 'body', v.body, 'version', v.version, 'status', c.status, 'body_sha256', v.body_sha256)
  from contracts c join contract_versions v on v.contract_id = c.id and v.version = c.version
  where c.id = p_contract and c.status <> 'draft'
    and exists (select 1 from portal_memberships m where m.id in (select cos_my_memberships('partner')) and m.contact_id = c.contact_id and m.brand_id = c.brand_id);
$$;

do $$
declare f text;
begin
  foreach f in array array['cos_proposal_totals(uuid)', 'cos_proposal_access(uuid)', 'cos_send_proposal(uuid)', 'cos_proposal_viewed(uuid)',
    'cos_decide_proposal(uuid, integer, boolean, text)', 'cos_proposal_action(uuid, text, text)', 'cos_proposal_comment(uuid, text)',
    'cos_project_from_proposal(uuid, text, date, boolean)', 'cos_contract_access(uuid)', 'cos_contract_action(uuid, text)',
    'cos_decide_contract(uuid, integer, boolean, text)', 'cos_analytics(uuid)', 'cos_search(text, text[], integer, integer)',
    'portal_project(uuid)', 'portal_client_home()', 'portal_partner_home()', 'portal_partner_agreement(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

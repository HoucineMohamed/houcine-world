-- Houcine.world Command Center (docs/command-center.md): one operational data model for CRM, leads, projects, tasks
-- and finance, scoped by the EXISTING brand authorization (brand_admins + is_super_admin / has_brand_access /
-- has_brand_role). Nothing existing is dropped or rewritten; existing rows are untouched.
--
-- Access, enforced here by row-level security (the browser and the AI analyst both go through it):
--   read operational records (contacts, leads, projects, tasks...)  any role on the brand, or super admin
--   create / change them                                             editor or higher on the brand, or super admin
--   delete them                                                       brand_admin on the brand, or super admin
--   finance (invoices, payments, expenses): read and write            brand_admin on the brand, or super admin
-- Every change is written to public.audit_logs by triggers (the browser cannot write or change audit_logs); a change
-- made by an Autopilot automation (setting autopilot.run) is marked "automated" with no human actor.
-- Lead stage changes are kept in the append-only public.lead_events; conversion rates are counted from it.
--
-- Written to run more than once (if not exists / drop ... if exists), like the other migrations.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Whether a given user (not only the caller) is a super admin or a member of the brand: used to validate owners,
-- assignees and project members.
create or replace function public.cc_user_in_brand(p_user_id uuid, p_brand_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select p_user_id is null
      or exists (select 1 from brand_admins where user_id = p_user_id and brand_id = p_brand_id)
      or exists (select 1 from profiles where id = p_user_id and platform_role = 'super_admin' and deleted_at is null);
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- CRM: one identity per contact (person or organization), separate brand relationships
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'person' check (kind in ('person', 'organization')),
  entity_type text not null default 'client' check (entity_type in
    ('client', 'prospect', 'partner', 'artist', 'dj', 'supplier', 'venue', 'organization', 'business', 'other')),
  name text not null check (length(trim(name)) between 1 and 200),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or length(phone) <= 40),
  organization_id uuid references public.contacts(id) on delete set null,
  website text check (website is null or length(website) <= 300),
  notes text check (notes is null or length(notes) <= 5000),
  tags text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- One identity per email address (case-insensitive); contacts without an email are not deduplicated.
create unique index if not exists contacts_email_unique on public.contacts (lower(email)) where email is not null and deleted_at is null;

create table if not exists public.contact_brands (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  status text not null default 'prospect' check (status in ('prospect', 'client', 'partner', 'supplier', 'inactive')),
  source text check (source is null or length(source) <= 120),
  notes text check (notes is null or length(notes) <= 5000),
  became_client_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, brand_id)
);
create index if not exists contact_brands_brand on public.contact_brands (brand_id, status);

-- Whether the caller may see a contact's identity: super admin, or linked to a brand the caller can access.
create or replace function public.can_see_contact(p_contact_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select is_super_admin() or exists (
    select 1 from contact_brands cb where cb.contact_id = p_contact_id and has_brand_access(cb.brand_id));
$$;

-- Whether a contact is linked to a brand (used to validate every record that names a contact).
create or replace function public.cc_contact_in_brand(p_contact_id uuid, p_brand_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select p_contact_id is null or exists (select 1 from contact_brands where contact_id = p_contact_id and brand_id = p_brand_id);
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Leads and the pipeline
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  booking_id uuid unique references public.bookings(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  stage text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  expected_value numeric(14, 2) check (expected_value is null or expected_value >= 0),
  currency text check (currency in ('EUR', 'USD')),
  source text check (source is null or length(source) <= 120),
  owner_id uuid references public.profiles(id) on delete set null,
  next_follow_up date,
  notes text check (notes is null or length(notes) <= 5000),
  lost_reason text check (lost_reason is null or length(lost_reason) <= 500),
  won_at timestamptz,
  lost_at timestamptz,
  converted_project_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((expected_value is null) = (currency is null))
);
create index if not exists leads_brand_stage on public.leads (brand_id, stage) where deleted_at is null;
create index if not exists leads_brand_created on public.leads (brand_id, created_at);

-- Every stage a lead enters, written only by the trigger below (append-only): the source of conversion rates.
create table if not exists public.lead_events (
  id bigserial primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lead_events_brand_time on public.lead_events (brand_id, created_at);
create index if not exists lead_events_lead on public.lead_events (lead_id);

-- Calls, emails, meetings, notes and follow-ups with a contact, for one brand.
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  project_id uuid,
  kind text not null default 'note' check (kind in ('call', 'email', 'meeting', 'message', 'note', 'follow_up')),
  summary text not null check (length(trim(summary)) between 1 and 5000),
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists interactions_brand_time on public.interactions (brand_id, occurred_at desc);
create index if not exists interactions_contact on public.interactions (contact_id);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Projects, members, milestones, tasks and deliverables
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  client_contact_id uuid references public.contacts(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (description is null or length(description) <= 5000),
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  start_date date,
  deadline date,
  currency text check (currency in ('EUR', 'USD')),
  budget numeric(14, 2) check (budget is null or budget >= 0),
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  contract_value numeric(14, 2) check (contract_value is null or contract_value >= 0),
  contract_signed_on date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Amounts need a currency; a contract value counts as contracted only with its signing date.
  check (currency is not null or (budget is null and estimated_cost is null and contract_value is null)),
  check ((contract_value is null) = (contract_signed_on is null)),
  check (deadline is null or start_date is null or deadline >= start_date)
);
create index if not exists projects_brand_status on public.projects (brand_id, status) where deleted_at is null;
create index if not exists projects_brand_deadline on public.projects (brand_id, deadline) where deleted_at is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_converted_project_fkey') then
    alter table public.leads add constraint leads_converted_project_fkey foreign key (converted_project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'interactions_project_fkey') then
    alter table public.interactions add constraint interactions_project_fkey foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end $$;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member', 'reviewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists milestones_project on public.milestones (project_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 300),
  kind text not null default 'task' check (kind in ('task', 'deliverable')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project on public.tasks (project_id, status);
create index if not exists tasks_brand_due on public.tasks (brand_id, due_date) where status <> 'done';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Finance: invoices (invoiced revenue), payments (received revenue), expenses. Currencies are never mixed.
-- Payment status of an invoice is DERIVED from its payments, never stored.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  number text not null check (length(trim(number)) between 1 and 60),
  issue_date date not null,
  due_date date,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'USD')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'void')),
  category text check (category is null or length(category) <= 80),
  description text check (description is null or length(description) <= 2000),
  source text check (source is null or length(source) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, number),
  check (due_date is null or due_date >= issue_date)
);
create index if not exists invoices_brand_issue on public.invoices (brand_id, issue_date);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'USD')),
  received_on date not null,
  method text check (method is null or length(method) <= 60),
  category text check (category is null or length(category) <= 80),
  description text check (description is null or length(description) <= 2000),
  source text check (source is null or length(source) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_brand_received on public.payments (brand_id, received_on);
create index if not exists payments_invoice on public.payments (invoice_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'USD')),
  incurred_on date not null,
  category text check (category is null or length(category) <= 80),
  vendor text check (vendor is null or length(vendor) <= 200),
  description text check (description is null or length(description) <= 2000),
  status text not null default 'recorded' check (status in ('recorded', 'void')),
  source text check (source is null or length(source) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_brand_incurred on public.expenses (brand_id, incurred_on);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Validation: every link stays inside one brand; a record never moves to another brand
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.cc_validate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb;
  pbrand uuid;
  inv record;
  paid numeric;
  contact uuid;
  proj uuid;
  lead uuid;
begin
  -- Records that belong to a project take the project's brand (whatever the request said).
  if tg_table_name in ('milestones', 'tasks', 'project_members') then
    select brand_id into pbrand from projects where id = new.project_id;
    if not found then raise exception 'Unknown project.' using errcode = '23503'; end if;
    new.brand_id := pbrand;
  end if;
  if tg_op = 'UPDATE' and new.brand_id is distinct from old.brand_id then
    raise exception 'A record cannot be moved to another brand.' using errcode = '42501';
  end if;

  -- Fields are read through a JSON copy, because each table has its own columns.
  j := to_jsonb(new);
  contact := coalesce(j ->> 'client_contact_id', j ->> 'contact_id')::uuid;
  proj := (j ->> 'project_id')::uuid;
  lead := (j ->> 'lead_id')::uuid;

  if tg_table_name in ('leads', 'projects', 'invoices', 'payments', 'interactions') and not cc_contact_in_brand(contact, new.brand_id) then
    raise exception 'This contact is not linked to the record''s brand.' using errcode = '42501';
  end if;
  if not cc_user_in_brand(coalesce(j ->> 'owner_id', j ->> 'assignee_id', case when tg_table_name = 'project_members' then j ->> 'user_id' end)::uuid, new.brand_id) then
    raise exception 'This person has no access to the record''s brand.' using errcode = '42501';
  end if;
  if tg_table_name in ('invoices', 'payments', 'expenses', 'interactions') and proj is not null
     and not exists (select 1 from projects where id = proj and brand_id = new.brand_id) then
    raise exception 'The project belongs to another brand.' using errcode = '42501';
  end if;
  if tg_table_name in ('projects', 'interactions') and lead is not null
     and not exists (select 1 from leads where id = lead and brand_id = new.brand_id) then
    raise exception 'The lead belongs to another brand.' using errcode = '42501';
  end if;

  if tg_table_name = 'tasks' then
    if new.milestone_id is not null and not exists (select 1 from milestones where id = new.milestone_id and project_id = new.project_id) then
      raise exception 'The milestone belongs to another project.' using errcode = '42501';
    end if;
    -- Completion time follows the status.
    if new.status = 'done' and new.completed_at is null then new.completed_at := now(); end if;
    if new.status <> 'done' then new.completed_at := null; end if;
  elsif tg_table_name = 'projects' then
    if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
    if new.status <> 'completed' then new.completed_at := null; end if;
  elsif tg_table_name = 'payments' and j ->> 'invoice_id' is not null then
    select brand_id, currency, amount, status into inv from invoices where id = (j ->> 'invoice_id')::uuid;
    if not found or inv.brand_id <> new.brand_id then
      raise exception 'The invoice belongs to another brand.' using errcode = '42501';
    end if;
    if inv.currency <> new.currency then
      raise exception 'A payment must be in the invoice''s currency (%).', inv.currency using errcode = '22023';
    end if;
    if inv.status = 'void' then raise exception 'This invoice is void.' using errcode = '22023'; end if;
    select coalesce(sum(amount), 0) into paid from payments where invoice_id = (j ->> 'invoice_id')::uuid and id <> new.id;
    if paid + new.amount > inv.amount then
      raise exception 'Payments would exceed the invoice amount (% %).', inv.amount, inv.currency using errcode = '22023';
    end if;
  elsif tg_table_name = 'contact_brands' then
    if new.status = 'client' and new.became_client_at is null then new.became_client_at := now(); end if;
  end if;
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Activity and audit: every change is written to audit_logs (append-only for users: no write policy)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Fields whose old and new values are kept in the audit trail (others are listed by name only, so private
-- contact details are not copied into the log).
create or replace function public.cc_audit_value_keys()
returns text[] language sql immutable as $$
  select array['stage', 'status', 'kind', 'priority', 'amount', 'currency', 'expected_value', 'budget', 'estimated_cost',
               'contract_value', 'contract_signed_on', 'deadline', 'start_date', 'due_date', 'issue_date', 'received_on',
               'incurred_on', 'invoice_id', 'project_id', 'contact_id', 'client_contact_id', 'owner_id', 'assignee_id',
               'number', 'brand_id'];
$$;

create or replace function public.cc_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  rec jsonb := coalesce(n, o);
  changed text[];
  meta jsonb;
  k text;
  actor uuid := (select id from profiles where id = auth.uid());
  run text := nullif(current_setting('autopilot.run', true), '');
  entity text := case tg_table_name
    when 'contacts' then 'contact' when 'contact_brands' then 'contact_brand' when 'leads' then 'lead'
    when 'interactions' then 'interaction' when 'projects' then 'project' when 'project_members' then 'project_member'
    when 'milestones' then 'milestone' when 'tasks' then 'task' when 'invoices' then 'invoice'
    when 'payments' then 'payment' when 'expenses' then 'expense' else tg_table_name end;
  verb text := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into changed from jsonb_each(n) e
      where key not in ('updated_at') and (o -> key) is distinct from (n -> key);
    if changed is null then return new; end if;
    meta := jsonb_build_object('changed', to_jsonb(changed), 'old', '{}'::jsonb, 'new', '{}'::jsonb);
    foreach k in array changed loop
      if k = any (cc_audit_value_keys()) then
        meta := jsonb_set(meta, array['old', k], coalesce(o -> k, 'null'::jsonb), true);
        meta := jsonb_set(meta, array['new', k], coalesce(n -> k, 'null'::jsonb), true);
      end if;
    end loop;
    if 'stage' = any (changed) then verb := 'stage_changed'; end if;
    if 'status' = any (changed) and tg_table_name in ('projects', 'tasks', 'invoices') then verb := 'status_changed'; end if;
    if tg_table_name = 'tasks' and n ->> 'status' = 'done' and o ->> 'status' <> 'done' then
      verb := case when n ->> 'kind' = 'deliverable' then 'delivered' else 'completed' end;
    end if;
  else
    meta := '{}'::jsonb;
    for k in select unnest(cc_audit_value_keys()) loop
      if rec ? k and rec -> k <> 'null'::jsonb then meta := jsonb_set(meta, array[k], rec -> k, true); end if;
    end loop;
  end if;
  if run is not null then meta := meta || jsonb_build_object('automated', true, 'automation_run', run); actor := null; end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (actor, (rec ->> 'brand_id')::uuid, entity || '.' || verb, entity,
          case when rec ? 'id' and (rec ->> 'id') ~ '^[0-9a-f-]{36}$' then (rec ->> 'id')::uuid end,
          meta || case when tg_table_name in ('project_members', 'milestones', 'tasks') then jsonb_build_object('project_id', rec -> 'project_id') else '{}'::jsonb end);
  return coalesce(new, old);
end $$;

-- Lead stage history (append-only), written on every new lead and every stage change.
create or replace function public.cc_lead_stage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.stage is not distinct from old.stage then return new; end if;
  if new.stage = 'won' then new.won_at := coalesce(new.won_at, now()); new.lost_at := null; end if;
  if new.stage = 'lost' then new.lost_at := coalesce(new.lost_at, now()); new.won_at := null; end if;
  if new.stage not in ('won', 'lost') then new.won_at := null; new.lost_at := null; end if;
  return new;
end $$;

create or replace function public.cc_lead_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.stage is not distinct from old.stage then return null; end if;
  insert into lead_events (lead_id, brand_id, from_stage, to_stage, actor_id)
  values (new.id, new.brand_id, case when tg_op = 'UPDATE' then old.stage end, new.stage, (select id from profiles where id = auth.uid()));
  return null;
end $$;

create or replace function public.cc_append_only()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only.', tg_table_name using errcode = '42501';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['contacts', 'contact_brands', 'leads', 'projects', 'milestones', 'tasks', 'invoices', 'payments', 'expenses'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$I', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['contact_brands', 'leads', 'interactions', 'projects', 'project_members', 'milestones', 'tasks', 'invoices', 'payments', 'expenses'] loop
    execute format('drop trigger if exists trg_%1$s_validate on public.%1$I', t);
    execute format('create trigger trg_%1$s_validate before insert or update on public.%1$I for each row execute function public.cc_validate()', t);
  end loop;
  foreach t in array array['contacts', 'contact_brands', 'leads', 'interactions', 'projects', 'project_members', 'milestones', 'tasks', 'invoices', 'payments', 'expenses'] loop
    execute format('drop trigger if exists trg_%1$s_audit on public.%1$I', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$I for each row execute function public.cc_audit()', t);
  end loop;
end $$;

drop trigger if exists trg_leads_stage on public.leads;
create trigger trg_leads_stage before insert or update on public.leads for each row execute function public.cc_lead_stage();
drop trigger if exists trg_leads_event on public.leads;
create trigger trg_leads_event after insert or update on public.leads for each row execute function public.cc_lead_event();
drop trigger if exists trg_lead_events_append_only on public.lead_events;
create trigger trg_lead_events_append_only before update or delete on public.lead_events for each row execute function public.cc_append_only();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
  ops text[] := array['contact_brands', 'leads', 'interactions', 'projects', 'project_members', 'milestones', 'tasks'];
  fin text[] := array['invoices', 'payments', 'expenses'];
begin
  foreach t in array ops || fin || array['contacts', 'lead_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
  end loop;
  foreach t in array ops loop
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (public.is_super_admin() or public.has_brand_access(brand_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (public.is_super_admin() or public.has_brand_role(brand_id, ''editor''))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (public.is_super_admin() or public.has_brand_role(brand_id, ''editor'')) with check (public.is_super_admin() or public.has_brand_role(brand_id, ''editor''))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin''))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array fin loop
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin''))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin''))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin'')) with check (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin''))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (public.is_super_admin() or public.has_brand_role(brand_id, ''brand_admin''))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- contact_brands: linking a contact to a brand also requires being able to see that contact already (no linking an
-- unknown id to discover someone else's contact).
drop policy if exists "contact_brands_insert" on public.contact_brands;
create policy "contact_brands_insert" on public.contact_brands for insert to authenticated
  with check (public.is_super_admin() or (public.has_brand_role(brand_id, 'editor') and public.can_see_contact(contact_id)));

-- contacts: identities are visible through a brand link; created only by create_contact (below); edited by an
-- editor of any linked brand; removed (soft delete) by the super admin only.
create policy "contacts_select" on public.contacts for select to authenticated using (public.can_see_contact(id));
create policy "contacts_update" on public.contacts for update to authenticated
  using (public.is_super_admin() or exists (select 1 from public.contact_brands cb where cb.contact_id = contacts.id and public.has_brand_role(cb.brand_id, 'editor')))
  with check (public.is_super_admin() or exists (select 1 from public.contact_brands cb where cb.contact_id = contacts.id and public.has_brand_role(cb.brand_id, 'editor')));
grant select, update on public.contacts to authenticated;

-- lead_events: read with the brand; written only by the trigger.
create policy "lead_events_select" on public.lead_events for select to authenticated using (public.is_super_admin() or public.has_brand_access(brand_id));
grant select on public.lead_events to authenticated;

grant all on public.contacts, public.contact_brands, public.leads, public.lead_events, public.interactions, public.projects,
  public.project_members, public.milestones, public.tasks, public.invoices, public.payments, public.expenses to service_role;
grant usage on sequence public.lead_events_id_seq to service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Server-side operations (each checks the caller's rights itself)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Create a contact for a brand, or link the existing identity with the same email (no duplicate identities).
create or replace function public.create_contact(
  p_brand_id uuid, p_name text, p_kind text default 'person', p_entity_type text default 'client',
  p_email text default null, p_phone text default null, p_organization_id uuid default null,
  p_status text default 'prospect', p_source text default null, p_notes text default null, p_tags text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  email_clean text := nullif(lower(trim(p_email)), '');
begin
  if not (is_super_admin() or has_brand_role(p_brand_id, 'editor')) then
    raise exception 'Not allowed for this brand.' using errcode = '42501';
  end if;
  if p_organization_id is not null and not can_see_contact(p_organization_id) then
    raise exception 'Unknown organization.' using errcode = '42501';
  end if;
  if email_clean is not null then
    select id into cid from contacts where lower(email) = email_clean and deleted_at is null;
  end if;
  if cid is null then
    insert into contacts (kind, entity_type, name, email, phone, organization_id, notes, tags, created_by)
    values (p_kind, p_entity_type, trim(p_name), email_clean, nullif(trim(p_phone), ''), p_organization_id,
            nullif(trim(p_notes), ''), coalesce(p_tags, '{}'), (select id from profiles where id = auth.uid()))
    returning id into cid;
  end if;
  insert into contact_brands (contact_id, brand_id, status, source, created_by)
  values (cid, p_brand_id, p_status, nullif(trim(p_source), ''), (select id from profiles where id = auth.uid()))
  on conflict (contact_id, brand_id) do nothing;
  return cid;
end $$;

-- Turn a WON lead into a project (and its contact into a client of the brand). The only way a lead is "converted".
create or replace function public.convert_lead(p_lead_id uuid, p_project_name text default null, p_deadline date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  l record;
  pid uuid;
begin
  select * into l from leads where id = p_lead_id and deleted_at is null for update;
  if not found then raise exception 'Unknown lead.' using errcode = '42501'; end if;
  if not (is_super_admin() or has_brand_role(l.brand_id, 'editor')) then
    raise exception 'Not allowed for this brand.' using errcode = '42501';
  end if;
  if l.stage <> 'won' then raise exception 'Only a won lead can be converted.' using errcode = '22023'; end if;
  if l.converted_project_id is not null then raise exception 'This lead is already converted.' using errcode = '22023'; end if;
  insert into projects (brand_id, client_contact_id, lead_id, name, owner_id, status, currency, budget, deadline, created_by)
  values (l.brand_id, l.contact_id, l.id, coalesce(nullif(trim(p_project_name), ''), l.title), l.owner_id, 'planned',
          l.currency, l.expected_value, p_deadline, (select id from profiles where id = auth.uid()))
  returning id into pid;
  update leads set converted_project_id = pid where id = l.id;
  if l.contact_id is not null then
    update contact_brands set status = 'client' where contact_id = l.contact_id and brand_id = l.brand_id and status <> 'client';
  end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values ((select id from profiles where id = auth.uid()), l.brand_id, 'lead.converted', 'lead', l.id, jsonb_build_object('project_id', pid));
  return pid;
end $$;

-- Record that a report or export was generated (who, which scope, which report), for the activity history.
create or replace function public.log_report(p_brand_id uuid, p_report text, p_params jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_brand_id is null and not is_super_admin() then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_brand_id is not null and not (is_super_admin() or has_brand_access(p_brand_id)) then
    raise exception 'Not allowed for this brand.' using errcode = '42501';
  end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, metadata)
  values ((select id from profiles where id = auth.uid()), p_brand_id, 'report.generated', 'report',
          jsonb_build_object('report', left(p_report, 80)) || coalesce(p_params, '{}'::jsonb));
end $$;

revoke all on function public.create_contact(uuid, text, text, text, text, text, uuid, text, text, text, text[]) from public, anon;
revoke all on function public.convert_lead(uuid, text, date) from public, anon;
revoke all on function public.log_report(uuid, text, jsonb) from public, anon;
grant execute on function public.create_contact(uuid, text, text, text, text, text, uuid, text, text, text, text[]) to authenticated;
grant execute on function public.convert_lead(uuid, text, date) to authenticated;
grant execute on function public.log_report(uuid, text, jsonb) to authenticated;
revoke all on function public.cc_user_in_brand(uuid, uuid) from public, anon;
revoke all on function public.cc_contact_in_brand(uuid, uuid) from public, anon;
grant execute on function public.cc_user_in_brand(uuid, uuid), public.cc_contact_in_brand(uuid, uuid), public.can_see_contact(uuid) to authenticated;

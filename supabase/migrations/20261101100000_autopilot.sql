-- Houcine.world Autopilot (docs/autopilot.md): events, automations (trigger -> conditions -> actions), the execution
-- engine, deterministic monitoring with alerts, per-user notifications, AI action proposals and AI jobs. Built on the
-- Command Center tables (20261031100000_command_center.sql), Knowledge Studio's activity log and the EXISTING brand
-- authorization. Nothing existing is dropped.
--
-- Access (row-level security):
--   brand records (automations, runs, events, alerts, jobs)   brand_admin of the brand, or super admin
--   global records (brand_id null)                           super admin only
--   notifications and preferences                            their own user only
-- The engine runs inside the database (security definer functions), so it cannot be bypassed from the browser:
--   * record events run their automations at once, each automation in its own protected step (a failure is logged
--     and never blocks the change that caused it, nor the other automations);
--   * time-based events and monitoring come from ap_scan(), started by ap_tick() (an admin opening Autopilot, "Run
--     now", or an optional schedule: docs/autopilot.md).
-- Every automated action is written to audit_logs with "automated": true; confirmed AI proposals with "confirmed_by".

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.automation_events (
  id bigserial primary key,
  brand_id uuid references public.brands(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  occurred_at timestamptz not null default now(),
  dispatched_at timestamptz,
  dispatch_error text
);
create index if not exists automation_events_brand_time on public.automation_events (brand_id, occurred_at desc);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text check (description is null or length(description) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  definition jsonb not null,
  version int not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automations_brand_status on public.automations (brand_id, status);

create table if not exists public.automation_versions (
  id bigserial primary key,
  automation_id uuid not null references public.automations(id) on delete cascade,
  version int not null,
  definition jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (automation_id, version)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  version int not null,
  event_id bigint not null references public.automation_events(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled', 'awaiting_approval', 'skipped')),
  attempts int not null default 0,
  conditions_result jsonb,
  error text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  -- Idempotency: one execution per automation and event, whatever happens.
  unique (automation_id, event_id)
);
create index if not exists automation_runs_brand_time on public.automation_runs (brand_id, created_at desc);
create index if not exists automation_runs_status on public.automation_runs (status);

create table if not exists public.automation_run_actions (
  id bigserial primary key,
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  position int not null,
  action_type text not null,
  status text not null check (status in ('completed', 'failed', 'skipped')),
  result jsonb,
  error text,
  attempt int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists automation_run_actions_run on public.automation_run_actions (run_id, position);

create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  rule text not null,
  entity_key text not null,
  category text not null check (category in ('projects', 'crm', 'finance', 'system')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  suggested_action text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  responsible_id uuid references public.profiles(id) on delete set null,
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles(id) on delete set null,
  source text not null default 'monitor' check (source in ('monitor', 'automation', 'assistant'))
);
-- One open alert per condition: a condition still true never makes a second alert.
create unique index if not exists ops_alerts_one_open on public.ops_alerts (rule, entity_key) where status = 'open';
create index if not exists ops_alerts_brand_status on public.ops_alerts (brand_id, status, detected_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  category text not null check (category in ('leads', 'projects', 'tasks', 'finance', 'automations', 'alerts', 'system', 'knowledge')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  title text not null,
  body text,
  link text check (link is null or link ~ '^/workspace/'),
  source text not null default 'automation',
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists user_notifications_user_time on public.user_notifications (user_id, created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  muted_categories text[] not null default '{}',
  muted_brands uuid[] not null default '{}',
  min_priority text not null default 'low' check (min_priority in ('urgent', 'high', 'normal', 'low')),
  in_app boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  kind text not null check (kind in ('ai_summary', 'followup_draft')),
  run_id uuid references public.automation_runs(id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  attempts int not null default 0,
  result text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index if not exists automation_jobs_status on public.automation_jobs (status, created_at);

create table if not exists public.assistant_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  action_type text not null check (action_type in ('create_task', 'assign_lead', 'notify_owner', 'create_alert')),
  target_type text not null check (target_type in ('project', 'lead', 'task', 'invoice')),
  target_id uuid not null,
  params jsonb not null default '{}'::jsonb,
  summary text not null,
  status text not null default 'proposed' check (status in ('proposed', 'executed', 'rejected', 'failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.autopilot_state (
  id int primary key default 1 check (id = 1),
  last_scan_at timestamptz,
  last_scan_by uuid,
  last_scan_result jsonb
);
insert into public.autopilot_state (id) values (1) on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Whether the caller may manage Autopilot records of a brand (null brand = global: super admin only).
create or replace function public.ap_can_manage(p_brand_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select case when p_brand_id is null then is_super_admin() else is_super_admin() or has_brand_role(p_brand_id, 'brand_admin') end;
$$;

create or replace function public.ap_today() returns date language sql stable as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

create or replace function public.ap_event_types() returns text[] language sql immutable as $$
  select array['lead.created', 'lead.stage_changed', 'contact.created', 'project.created', 'project.status_changed',
    'task.created', 'task.completed', 'task.overdue', 'project.deadline_approaching', 'milestone.completed',
    'invoice.created', 'invoice.overdue', 'payment.recorded', 'expense.recorded', 'project.budget_threshold',
    'knowledge.publication_completed', 'knowledge.sync_failed'];
$$;

create or replace function public.ap_action_types() returns text[] language sql immutable as $$
  select array['create_task', 'notify_admins', 'notify_owner', 'create_followup', 'set_status', 'add_activity',
    'create_alert', 'queue_assignment', 'ai_summary', 'followup_draft'];
$$;

create or replace function public.ap_condition_fields() returns text[] language sql immutable as $$
  select array['status', 'from_status', 'to_status', 'stage', 'from_stage', 'to_stage', 'priority', 'kind', 'currency',
    'amount', 'outstanding', 'budget', 'actual_cost', 'budget_use_pct', 'days_overdue', 'days_to_deadline', 'progress_pct',
    'owner_id', 'assignee_id', 'unassigned', 'category', 'source', 'brand_id'];
$$;

-- Refuses anything that is not a known trigger, condition or action (no code, no query, no free-form step).
create or replace function public.ap_validate_definition(d jsonb)
returns void language plpgsql immutable as $$
declare
  c jsonb;
  a jsonb;
begin
  if jsonb_typeof(d) <> 'object' then raise exception 'The automation definition must be an object.' using errcode = '22023'; end if;
  if not (d ->> 'trigger' = any (ap_event_types())) then raise exception 'Unknown trigger: %', coalesce(d ->> 'trigger', 'none') using errcode = '22023'; end if;
  if coalesce(d ->> 'match', 'all') not in ('all', 'any') then raise exception 'Conditions must match "all" or "any".' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(d -> 'conditions', '[]')) <> 'array' or jsonb_array_length(coalesce(d -> 'conditions', '[]')) > 10 then
    raise exception 'At most 10 conditions.' using errcode = '22023';
  end if;
  for c in select * from jsonb_array_elements(coalesce(d -> 'conditions', '[]')) loop
    if not (c ->> 'field' = any (ap_condition_fields())) then raise exception 'Unknown condition field: %', c ->> 'field' using errcode = '22023'; end if;
    if not (c ->> 'op' in ('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'not_empty', 'in')) then raise exception 'Unknown condition operator: %', c ->> 'op' using errcode = '22023'; end if;
    if length(coalesce(c ->> 'value', '')) > 200 then raise exception 'A condition value is too long.' using errcode = '22023'; end if;
  end loop;
  if jsonb_typeof(d -> 'actions') <> 'array' or jsonb_array_length(d -> 'actions') not between 1 and 8 then
    raise exception 'An automation needs 1 to 8 actions.' using errcode = '22023';
  end if;
  for a in select * from jsonb_array_elements(d -> 'actions') loop
    if a ->> 'type' = 'send_email' then raise exception 'Email is not available: no email provider is configured for Autopilot.' using errcode = '22023'; end if;
    if not (a ->> 'type' = any (ap_action_types())) then raise exception 'Unknown action: %', a ->> 'type' using errcode = '22023'; end if;
    if length(coalesce(a ->> 'title', '') || coalesce(a ->> 'message', '')) > 500 then raise exception 'An action text is too long.' using errcode = '22023'; end if;
    -- Categories, severities and priorities are checked when saving, so a run never fails on them later.
    if a ->> 'type' in ('create_alert', 'queue_assignment') and a ? 'category' and not (a ->> 'category' in ('projects', 'crm', 'finance', 'system')) then
      raise exception 'Unknown alert category: %', a ->> 'category' using errcode = '22023';
    end if;
    if a ->> 'type' in ('notify_admins', 'notify_owner') and a ? 'category' and not (a ->> 'category' in ('leads', 'projects', 'tasks', 'finance', 'automations', 'alerts', 'system', 'knowledge')) then
      raise exception 'Unknown notification category: %', a ->> 'category' using errcode = '22023';
    end if;
    if a ? 'severity' and not (a ->> 'severity' in ('critical', 'high', 'medium', 'low', 'info')) then raise exception 'Unknown severity: %', a ->> 'severity' using errcode = '22023'; end if;
    if a ? 'priority' and not (a ->> 'priority' = any (case when a ->> 'type' = 'create_task' then array['low', 'medium', 'high', 'urgent'] else array['urgent', 'high', 'normal', 'low'] end)) then
      raise exception 'Unknown priority: %', a ->> 'priority' using errcode = '22023';
    end if;
    if a ->> 'type' = 'set_status' and not (coalesce(a ->> 'to', '') in ('on_hold', 'active', 'in_progress', 'blocked', 'todo', 'contacted', 'qualified')) then
      raise exception 'This status change is not allowed: %', a ->> 'to' using errcode = '22023';
    end if;
  end loop;
end $$;

-- A small text template: {name}, {title}, {status}, {amount}, {currency}, {days_overdue}... from the event payload.
create or replace function public.ap_fill(t text, p jsonb)
returns text language plpgsql immutable as $$
declare
  k text;
  out text := coalesce(t, '');
begin
  for k in select jsonb_object_keys(p) loop
    out := replace(out, '{' || k || '}', coalesce(p ->> k, ''));
  end loop;
  return left(out, 500);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Event payloads (the facts conditions are evaluated on), always read from the record itself
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_project_cost(p_project uuid, p_currency text)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from expenses where project_id = p_project and currency = p_currency and status <> 'void';
$$;

create or replace function public.ap_payload(p_entity text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  base jsonb := '{}'::jsonb;
  cost numeric;
  paid numeric;
  done int;
  total int;
begin
  if p_entity = 'lead' then
    select * into r from leads where id = p_id;
    if not found then return null; end if;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'lead', 'entity_id', r.id, 'name', r.title, 'title', r.title,
      'stage', r.stage, 'owner_id', r.owner_id, 'unassigned', r.owner_id is null, 'currency', r.currency, 'amount', r.expected_value,
      'source', r.source, 'contact_id', r.contact_id, 'link', 'crm?tab=pipeline&lead=' || r.id);
  elsif p_entity = 'project' then
    select * into r from projects where id = p_id;
    if not found then return null; end if;
    cost := case when r.currency is not null then ap_project_cost(r.id, r.currency) end;
    select count(*) filter (where status = 'done'), count(*) into done, total from tasks where project_id = r.id;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'project', 'entity_id', r.id, 'project_id', r.id, 'name', r.name, 'title', r.name,
      'status', r.status, 'priority', r.priority, 'owner_id', r.owner_id, 'deadline', r.deadline,
      'days_to_deadline', case when r.deadline is not null then r.deadline - ap_today() end,
      'currency', r.currency, 'budget', r.budget, 'actual_cost', cost,
      'budget_use_pct', case when r.budget > 0 and cost is not null then round(cost * 100 / r.budget, 1) end,
      'progress_pct', case when total > 0 then round(done * 100.0 / total, 1) end, 'link', 'projects?id=' || r.id);
  elsif p_entity = 'task' then
    select t.*, p.owner_id as project_owner, p.name as project_name into r from tasks t join projects p on p.id = t.project_id where t.id = p_id;
    if not found then return null; end if;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'task', 'entity_id', r.id, 'project_id', r.project_id, 'name', r.title, 'title', r.title,
      'project', r.project_name, 'status', r.status, 'kind', r.kind, 'priority', r.priority, 'assignee_id', r.assignee_id, 'owner_id', r.project_owner,
      'due_date', r.due_date, 'days_overdue', case when r.due_date < ap_today() and r.status <> 'done' then ap_today() - r.due_date else 0 end,
      'link', 'projects?id=' || r.project_id);
  elsif p_entity = 'milestone' then
    select m.*, p.owner_id as project_owner, p.name as project_name into r from milestones m join projects p on p.id = m.project_id where m.id = p_id;
    if not found then return null; end if;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'milestone', 'entity_id', r.id, 'project_id', r.project_id, 'name', r.title, 'title', r.title,
      'project', r.project_name, 'owner_id', r.project_owner, 'link', 'projects?id=' || r.project_id);
  elsif p_entity = 'invoice' then
    select * into r from invoices where id = p_id;
    if not found then return null; end if;
    select coalesce(sum(amount), 0) into paid from payments where invoice_id = r.id;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'invoice', 'entity_id', r.id, 'name', r.number, 'title', 'Invoice ' || r.number,
      'status', r.status, 'currency', r.currency, 'amount', r.amount, 'outstanding', case when r.status = 'sent' then r.amount - paid else 0 end,
      'due_date', r.due_date, 'days_overdue', case when r.status = 'sent' and r.due_date < ap_today() and r.amount - paid > 0 then ap_today() - r.due_date else 0 end,
      'category', r.category, 'contact_id', r.contact_id, 'project_id', r.project_id, 'link', 'finance?tab=invoices');
  elsif p_entity = 'payment' then
    select * into r from payments where id = p_id;
    if not found then return null; end if;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'payment', 'entity_id', r.id, 'name', 'Payment', 'title', 'Payment',
      'currency', r.currency, 'amount', r.amount, 'category', r.category, 'invoice_id', r.invoice_id, 'contact_id', r.contact_id, 'project_id', r.project_id,
      'link', 'finance?tab=payments');
  elsif p_entity = 'expense' then
    select * into r from expenses where id = p_id;
    if not found then return null; end if;
    base := jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'expense', 'entity_id', r.id, 'name', coalesce(r.vendor, 'Expense'), 'title', 'Expense',
      'currency', r.currency, 'amount', r.amount, 'category', r.category, 'project_id', r.project_id, 'status', r.status, 'link', 'finance?tab=expenses');
    if r.project_id is not null then
      -- Budget use in the project's own currency only (currencies are never mixed).
      return base || coalesce((select jsonb_build_object('budget', p.budget, 'actual_cost', ap_project_cost(p.id, p.currency), 'owner_id', p.owner_id,
        'budget_use_pct', case when p.budget > 0 and p.currency = r.currency then round(ap_project_cost(p.id, p.currency) * 100 / p.budget, 1) end)
        from projects p where p.id = r.project_id), '{}'::jsonb);
    end if;
    return base;
  elsif p_entity = 'contact_brand' then
    select cb.*, c.name as contact_name into r from contact_brands cb join contacts c on c.id = cb.contact_id where cb.id = p_id;
    if not found then return null; end if;
    return jsonb_build_object('brand_id', r.brand_id, 'entity_type', 'contact', 'entity_id', r.contact_id, 'name', r.contact_name, 'title', r.contact_name,
      'status', r.status, 'source', r.source, 'link', 'crm?id=' || r.contact_id);
  end if;
  return null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Notifications and alerts
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_priority_rank(p text) returns int language sql immutable as $$
  select case p when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end;
$$;

-- In-app notification for one user, if they may see the brand and their preferences allow it. Returns 1 if created.
create or replace function public.ap_notify_user(p_user uuid, p_brand uuid, p_category text, p_priority text, p_title text, p_body text, p_link text, p_dedupe text, p_source text)
returns int language plpgsql security definer set search_path = public as $$
declare
  pref record;
  n int;
begin
  if p_user is null then return 0; end if;
  -- Never notify someone who cannot see the brand's data.
  if p_brand is null then
    if not exists (select 1 from profiles where id = p_user and platform_role = 'super_admin' and deleted_at is null) then return 0; end if;
  elsif not cc_user_in_brand(p_user, p_brand) then
    return 0;
  end if;
  select * into pref from notification_preferences where user_id = p_user;
  if found and (not pref.in_app or p_category = any (pref.muted_categories) or (p_brand is not null and p_brand = any (pref.muted_brands))
     or ap_priority_rank(p_priority) < ap_priority_rank(pref.min_priority)) then
    return 0;
  end if;
  insert into user_notifications (user_id, brand_id, category, priority, title, body, link, dedupe_key, source)
  values (p_user, p_brand, p_category, p_priority, left(p_title, 200), left(p_body, 2000), p_link, p_dedupe, p_source)
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- The brand's admins (role brand_admin) and, when asked or for global records, the super admins.
create or replace function public.ap_admins(p_brand uuid, p_include_central boolean)
returns setof uuid language sql stable security definer set search_path = public as $$
  select user_id from brand_admins where p_brand is not null and brand_id = p_brand and role = 'brand_admin'
  union
  select id from profiles where (p_include_central or p_brand is null) and platform_role = 'super_admin' and deleted_at is null;
$$;

create or replace function public.ap_notify_admins(p_brand uuid, p_include_central boolean, p_category text, p_priority text, p_title text, p_body text, p_link text, p_dedupe text, p_source text)
returns int language plpgsql security definer set search_path = public as $$
declare
  u uuid;
  n int := 0;
begin
  for u in select * from ap_admins(p_brand, p_include_central) loop
    n := n + ap_notify_user(u, p_brand, p_category, p_priority, p_title, p_body, p_link, p_dedupe, p_source);
  end loop;
  return n;
end $$;

create or replace function public.ap_brand_link(p_brand uuid, p_path text) returns text language sql immutable as $$
  select case when p_path is null then null when p_brand is null then '/workspace/command/' || p_path else '/workspace/' || p_brand || '/command/' || p_path end;
$$;

-- Open an alert unless the same condition already has an open one. Returns the alert id when it is new.
create or replace function public.ap_open_alert(p_rule text, p_key text, p_brand uuid, p_category text, p_severity text, p_title text, p_description text,
  p_entity_type text, p_entity_id uuid, p_suggested text, p_responsible uuid, p_source text, p_link text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
begin
  -- A monitoring alert a person dismissed stays dismissed while its condition lasts (no new alert, no new
  -- notification); the scan re-arms it when the condition ends (resolved_at set on the dismissed alert).
  if p_rule not like 'automation:%' and p_rule not like 'assistant:%' then
    update ops_alerts set last_seen_at = now()
    where id = (select id from ops_alerts where rule = p_rule and entity_key = p_key and status = 'dismissed' and resolved_at is null order by dismissed_at desc limit 1)
    returning id into aid;
    if aid is not null then return null; end if;
  end if;
  insert into ops_alerts (rule, entity_key, brand_id, category, severity, title, description, entity_type, entity_id, suggested_action, responsible_id, source)
  values (p_rule, p_key, p_brand, p_category, p_severity, left(p_title, 200), left(p_description, 2000), p_entity_type, p_entity_id, left(p_suggested, 500), p_responsible, p_source)
  on conflict (rule, entity_key) where status = 'open' do update set last_seen_at = now()
  returning (case when xmax = 0 then id end) into aid;
  if aid is not null and p_severity in ('critical', 'high', 'medium') then
    perform ap_notify_admins(p_brand, p_severity = 'critical', case p_category when 'projects' then 'projects' when 'crm' then 'leads' when 'finance' then 'finance' else 'system' end,
      case p_severity when 'critical' then 'urgent' when 'high' then 'high' else 'normal' end,
      p_title, p_description, coalesce(p_link, case when p_brand is null then '/workspace/autopilot/monitoring' else '/workspace/' || p_brand || '/autopilot/monitoring' end),
      'alert:' || aid, 'monitor');
  end if;
  return aid;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The execution engine
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_eval_condition(c jsonb, p jsonb)
returns boolean language plpgsql immutable as $$
declare
  v text := p ->> (c ->> 'field');
  want text := c ->> 'value';
  op text := c ->> 'op';
begin
  if op = 'is_empty' then return v is null or v = '' or v = 'false'; end if;
  if op = 'not_empty' then return v is not null and v <> '' and v <> 'false'; end if;
  if v is null then return false; end if;
  if op = 'eq' then return lower(v) = lower(want); end if;
  if op = 'neq' then return lower(v) <> lower(want); end if;
  if op = 'in' then return lower(v) = any (string_to_array(lower(replace(want, ' ', '')), ',')); end if;
  -- Numeric comparisons only when both sides are numbers (never a text comparison of amounts).
  if v !~ '^-?\d+(\.\d+)?$' or want !~ '^-?\d+(\.\d+)?$' then return false; end if;
  return case op when 'gt' then v::numeric > want::numeric when 'gte' then v::numeric >= want::numeric
    when 'lt' then v::numeric < want::numeric when 'lte' then v::numeric <= want::numeric else false end;
end $$;

-- One action. Every action stays inside the event's brand and record; returns a short result.
create or replace function public.ap_do_action(p_run uuid, a jsonb, ev jsonb, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t text := a ->> 'type';
  brand uuid := (ev ->> 'brand_id')::uuid;
  ent uuid := (ev ->> 'entity_id')::uuid;
  proj uuid := (p ->> 'project_id')::uuid;
  owner uuid := (p ->> 'owner_id')::uuid;
  link text := ap_brand_link(brand, p ->> 'link');
  title text := ap_fill(coalesce(a ->> 'title', a ->> 'message'), p);
  n int;
  new_id uuid;
begin
  if t = 'create_task' then
    if proj is null then raise exception 'This event has no project to add a task to.'; end if;
    insert into tasks (project_id, brand_id, title, kind, priority, due_date, assignee_id)
    values (proj, brand, coalesce(nullif(title, ''), 'Follow up: ' || coalesce(p ->> 'name', '')), 'task', coalesce(a ->> 'priority', 'medium'),
            case when a ? 'due_in_days' then ap_today() + (a ->> 'due_in_days')::int end,
            case when a ->> 'assign' = 'owner' and cc_user_in_brand(owner, brand) then owner end)
    returning id into new_id;
    return jsonb_build_object('task_id', new_id);
  elsif t in ('notify_admins', 'notify_owner') then
    if t = 'notify_owner' then
      n := ap_notify_user(owner, brand, coalesce(a ->> 'category', 'automations'), coalesce(a ->> 'priority', 'normal'),
        coalesce(nullif(title, ''), p ->> 'title'), a ->> 'body', link, 'run:' || p_run || ':' || (a ->> 'position'), 'automation');
      if owner is null then return jsonb_build_object('notified', 0, 'note', 'No owner on this record.'); end if;
    else
      n := ap_notify_admins(brand, coalesce((a ->> 'include_central')::boolean, false), coalesce(a ->> 'category', 'automations'), coalesce(a ->> 'priority', 'normal'),
        coalesce(nullif(title, ''), p ->> 'title'), ap_fill(a ->> 'body', p), link, 'run:' || p_run || ':' || (a ->> 'position'), 'automation');
    end if;
    return jsonb_build_object('notified', n);
  elsif t = 'create_followup' then
    if p ->> 'entity_type' <> 'lead' then raise exception 'A CRM follow-up needs a lead event.'; end if;
    insert into interactions (brand_id, lead_id, contact_id, kind, summary)
    values (brand, ent, (p ->> 'contact_id')::uuid, 'follow_up', coalesce(nullif(title, ''), 'Follow up on ' || coalesce(p ->> 'name', 'this lead')));
    if a ? 'due_in_days' then update leads set next_follow_up = ap_today() + (a ->> 'due_in_days')::int where id = ent; end if;
    return jsonb_build_object('followup', true);
  elsif t = 'set_status' then
    if p ->> 'entity_type' = 'project' and a ->> 'to' in ('on_hold', 'active') then update projects set status = a ->> 'to' where id = ent and brand_id = brand;
    elsif p ->> 'entity_type' = 'task' and a ->> 'to' in ('in_progress', 'blocked', 'todo') then update tasks set status = a ->> 'to' where id = ent and brand_id = brand;
    elsif p ->> 'entity_type' = 'lead' and a ->> 'to' in ('contacted', 'qualified') then update leads set stage = a ->> 'to' where id = ent and brand_id = brand;
    else raise exception 'This status change does not apply to a % event.', p ->> 'entity_type';
    end if;
    return jsonb_build_object('status', a ->> 'to');
  elsif t = 'add_activity' then
    insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
    values (null, brand, 'autopilot.note', p ->> 'entity_type', ent, jsonb_build_object('automated', true, 'run_id', p_run, 'note', title));
    return jsonb_build_object('activity', true);
  elsif t in ('create_alert', 'queue_assignment') then
    new_id := ap_open_alert(case when t = 'queue_assignment' then 'lead_unassigned' else 'automation:' || (a ->> 'automation_id') end,
      coalesce(ent::text, 'event:' || (ev ->> 'id')), brand,
      coalesce(a ->> 'category', case when t = 'queue_assignment' then 'crm' when p ->> 'entity_type' in ('invoice', 'payment', 'expense') then 'finance' when p ->> 'entity_type' in ('lead', 'contact') then 'crm' else 'projects' end),
      coalesce(a ->> 'severity', 'medium'),
      coalesce(nullif(title, ''), case when t = 'queue_assignment' then 'Lead waiting for an owner: ' || coalesce(p ->> 'name', '') else p ->> 'title' end),
      ap_fill(a ->> 'body', p), p ->> 'entity_type', ent,
      case when t = 'queue_assignment' then 'Assign an owner in CRM.' else a ->> 'suggested_action' end, owner, 'automation', link);
    return jsonb_build_object('alert_id', new_id, 'already_open', new_id is null);
  elsif t in ('ai_summary', 'followup_draft') then
    insert into automation_jobs (brand_id, kind, run_id, input)
    values (brand, t, p_run, jsonb_build_object('payload', p, 'instruction', left(coalesce(a ->> 'instruction', ''), 500), 'notify', coalesce(a ->> 'notify', 'admins')))
    returning id into new_id;
    return jsonb_build_object('job_id', new_id, 'note', 'Queued for the AI (written by the next Autopilot run).');
  end if;
  raise exception 'Unknown action %', t;
end $$;

-- Run (or re-run) an execution: conditions, approval, then each action in its own protected step. Successful actions
-- are never repeated on a retry.
create or replace function public.ap_execute(p_run uuid, p_force boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  r record;
  e record;
  d jsonb;
  p jsonb;
  c jsonb;
  a jsonb;
  results jsonb := '[]'::jsonb;
  ok boolean;
  pass boolean;
  i int := 0;
  failed int := 0;
  res jsonb;
begin
  select * into r from automation_runs where id = p_run for update;
  if not found then return 'missing'; end if;
  select * into e from automation_events where id = r.event_id;
  select definition into d from automation_versions where automation_id = r.automation_id and version = r.version;
  -- The record's facts now (or the event's own facts for events without a record, like knowledge events).
  p := coalesce(ap_payload(e.entity_type, e.entity_id), '{}'::jsonb) || e.payload;
  update automation_runs set status = 'running', started_at = coalesce(started_at, now()), attempts = attempts + 1 where id = p_run;

  if r.conditions_result is null or not p_force then
    pass := coalesce(d ->> 'match', 'all') = 'all';
    for c in select * from jsonb_array_elements(coalesce(d -> 'conditions', '[]')) loop
      ok := ap_eval_condition(c, p);
      results := results || jsonb_build_object('field', c ->> 'field', 'op', c ->> 'op', 'value', c ->> 'value', 'actual', p -> (c ->> 'field'), 'ok', ok);
      if coalesce(d ->> 'match', 'all') = 'all' then pass := pass and ok; else pass := pass or ok; end if;
    end loop;
    if jsonb_array_length(coalesce(d -> 'conditions', '[]')) = 0 then pass := true; end if;
    update automation_runs set conditions_result = jsonb_build_object('passed', pass, 'checks', results) where id = p_run;
    if not pass then
      update automation_runs set status = 'skipped', completed_at = now() where id = p_run;
      return 'skipped';
    end if;
    if coalesce((d ->> 'requires_approval')::boolean, false) and r.approved_by is null then
      update automation_runs set status = 'awaiting_approval' where id = p_run;
      perform ap_notify_admins(r.brand_id, false, 'automations', 'high', 'An automation is waiting for approval', null,
        case when r.brand_id is null then '/workspace/autopilot/executions' else '/workspace/' || r.brand_id || '/autopilot/executions' end, 'approval:' || p_run, 'automation');
      return 'awaiting_approval';
    end if;
  end if;

  -- Automated actions are marked in the activity history (audit_logs metadata "automated_by").
  perform set_config('autopilot.run', p_run::text, true);
  for a in select * from jsonb_array_elements(d -> 'actions') loop
    i := i + 1;
    if exists (select 1 from automation_run_actions where run_id = p_run and position = i and status = 'completed') then continue; end if;
    begin
      res := ap_do_action(p_run, a || jsonb_build_object('position', i, 'automation_id', r.automation_id), to_jsonb(e), p);
      insert into automation_run_actions (run_id, position, action_type, status, result, attempt) values (p_run, i, a ->> 'type', 'completed', res, r.attempts + 1);
      insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
      values (null, r.brand_id, 'autopilot.action', 'automation_run', p_run, jsonb_build_object('automated', true, 'automation_id', r.automation_id, 'action', a ->> 'type', 'result', res));
    exception when others then
      failed := failed + 1;
      insert into automation_run_actions (run_id, position, action_type, status, error, attempt) values (p_run, i, a ->> 'type', 'failed', left(sqlerrm, 500), r.attempts + 1);
    end;
  end loop;
  perform set_config('autopilot.run', '', true);
  update automation_runs set status = case when failed > 0 then 'failed' else 'completed' end, completed_at = now(),
    error = case when failed > 0 then failed || ' action(s) failed' end where id = p_run;
  return case when failed > 0 then 'failed' else 'completed' end;
end $$;

-- Every active automation listening to this event type, for its brand (or global ones), runs once.
create or replace function public.ap_dispatch(p_event bigint)
returns int language plpgsql security definer set search_path = public as $$
declare
  e record;
  w record;
  rid uuid;
  n int := 0;
  depth int;
begin
  select * into e from automation_events where id = p_event;
  -- Automations that change records can trigger other automations: at most 3 levels, never a loop.
  depth := coalesce(nullif(current_setting('autopilot.depth', true), ''), '0')::int;
  if depth >= 3 then
    update automation_events set dispatch_error = 'Not run: automations triggered each other more than 3 levels deep.' where id = p_event;
    return 0;
  end if;
  perform set_config('autopilot.depth', (depth + 1)::text, true);
  for w in select * from automations where status = 'active' and definition ->> 'trigger' = e.event_type
           and (brand_id is null or brand_id = e.brand_id) order by created_at loop
    insert into automation_runs (automation_id, version, event_id, brand_id)
    values (w.id, w.version, e.id, coalesce(e.brand_id, w.brand_id))
    on conflict (automation_id, event_id) do nothing
    returning id into rid;
    if rid is null then continue; end if;
    n := n + 1;
    begin
      perform ap_execute(rid);
    exception when others then
      update automation_runs set status = 'failed', error = left(sqlerrm, 500), completed_at = now() where id = rid;
    end;
  end loop;
  perform set_config('autopilot.depth', depth::text, true);
  update automation_events set dispatched_at = now() where id = p_event;
  return n;
end $$;

-- Record an event once (by its dedupe key) and run its automations. Never raises: Autopilot must not break the
-- change that caused the event.
create or replace function public.ap_emit(p_type text, p_brand uuid, p_entity text, p_entity_id uuid, p_payload jsonb, p_dedupe text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  eid bigint;
begin
  insert into automation_events (brand_id, event_type, entity_type, entity_id, payload, dedupe_key)
  values (p_brand, p_type, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb), p_dedupe)
  on conflict (dedupe_key) do nothing returning id into eid;
  if eid is null then return null; end if;
  begin
    perform ap_dispatch(eid);
  exception when others then
    update automation_events set dispatch_error = left(sqlerrm, 500) where id = eid;
  end;
  return eid;
exception when others then
  return null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Event sources: the Command Center tables and Knowledge Studio's activity log
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_on_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  rid uuid := (n ->> 'id')::uuid;
  b uuid := (n ->> 'brand_id')::uuid;
  pl jsonb;
begin
  if tg_table_name = 'leads' then
    if tg_op = 'INSERT' then perform ap_emit('lead.created', b, 'lead', rid, '{}', 'lead.created:' || rid);
    elsif n ->> 'stage' is distinct from o ->> 'stage' then
      perform ap_emit('lead.stage_changed', b, 'lead', rid, jsonb_build_object('from_stage', o ->> 'stage', 'to_stage', n ->> 'stage'),
        'lead.stage:' || rid || ':' || (select max(lead_events.id) from lead_events where lead_events.lead_id = rid));
    end if;
  elsif tg_table_name = 'contact_brands' and tg_op = 'INSERT' then
    perform ap_emit('contact.created', b, 'contact_brand', rid, '{}', 'contact.created:' || rid);
  elsif tg_table_name = 'projects' then
    if tg_op = 'INSERT' then perform ap_emit('project.created', b, 'project', rid, '{}', 'project.created:' || rid);
    elsif n ->> 'status' is distinct from o ->> 'status' then
      perform ap_emit('project.status_changed', b, 'project', rid, jsonb_build_object('from_status', o ->> 'status', 'to_status', n ->> 'status'),
        'project.status:' || rid || ':' || (n ->> 'status') || ':' || extract(epoch from now()));
    end if;
  elsif tg_table_name = 'tasks' then
    if tg_op = 'INSERT' then perform ap_emit('task.created', b, 'task', rid, '{}', 'task.created:' || rid);
    elsif n ->> 'status' = 'done' and o ->> 'status' <> 'done' then
      perform ap_emit('task.completed', b, 'task', rid, '{}', 'task.completed:' || rid || ':' || (n ->> 'completed_at'));
    end if;
  elsif tg_table_name = 'milestones' and tg_op = 'UPDATE' and n ->> 'completed_at' is not null and o ->> 'completed_at' is null then
    perform ap_emit('milestone.completed', b, 'milestone', rid, '{}', 'milestone.completed:' || rid || ':' || (n ->> 'completed_at'));
  elsif tg_table_name = 'invoices' and tg_op = 'INSERT' then
    perform ap_emit('invoice.created', b, 'invoice', rid, '{}', 'invoice.created:' || rid);
  elsif tg_table_name = 'payments' and tg_op = 'INSERT' then
    perform ap_emit('payment.recorded', b, 'payment', rid, '{}', 'payment.recorded:' || rid);
  elsif tg_table_name = 'expenses' and tg_op = 'INSERT' then
    perform ap_emit('expense.recorded', b, 'expense', rid, '{}', 'expense.recorded:' || rid);
    -- A project's costs changed: the budget event, with the use in the project's own currency.
    if n ->> 'project_id' is not null then
      pl := ap_payload('expense', rid);
      if pl ->> 'budget_use_pct' is not null then
        perform ap_emit('project.budget_threshold', b, 'project', (n ->> 'project_id')::uuid, jsonb_build_object('budget_use_pct', pl -> 'budget_use_pct', 'expense_id', rid),
          'project.budget:' || (n ->> 'project_id') || ':' || rid);
      end if;
    end if;
  end if;
  return null;
exception when others then
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['leads', 'contact_brands', 'projects', 'tasks', 'milestones', 'invoices', 'payments', 'expenses'] loop
    execute format('drop trigger if exists trg_%1$s_autopilot on public.%1$I', t);
    execute format('create trigger trg_%1$s_autopilot after insert or update on public.%1$I for each row execute function public.ap_on_change()', t);
  end loop;
end $$;

create or replace function public.ap_on_knowledge_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'index_live' then
    perform ap_emit('knowledge.publication_completed', null, 'knowledge_publication', new.publication_id, jsonb_build_object('title', 'Knowledge published', 'name', 'Knowledge publication', 'link', null),
      'knowledge.live:' || new.id);
    perform ap_notify_admins(null, true, 'knowledge', 'normal', 'Knowledge published: the AI now uses it', null, '/workspace/knowledge/activity', 'knowledge.live:' || new.id, 'system');
  elsif new.kind = 'publish_failed' then
    perform ap_emit('knowledge.sync_failed', null, 'knowledge_publication', new.publication_id,
      jsonb_build_object('title', 'Knowledge synchronization failed', 'name', 'Knowledge publication', 'status', coalesce(new.detail ->> 'code', 'failed')),
      'knowledge.failed:' || new.id);
    perform ap_notify_admins(null, true, 'knowledge', 'high', 'Knowledge synchronization failed', coalesce(new.detail ->> 'code', ''), '/workspace/knowledge/review', 'knowledge.failed:' || new.id, 'system');
  end if;
  return null;
exception when others then
  return null;
end $$;
drop trigger if exists trg_knowledge_events_autopilot on public.knowledge_events;
create trigger trg_knowledge_events_autopilot after insert on public.knowledge_events for each row execute function public.ap_on_knowledge_event();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Automations: validation and versions
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_automation_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform ap_validate_definition(new.definition);
  if tg_op = 'UPDATE' then
    if new.brand_id is distinct from old.brand_id then raise exception 'An automation cannot move to another brand.' using errcode = '42501'; end if;
    if new.definition is distinct from old.definition then new.version := old.version + 1; else new.version := old.version; end if;
  else
    new.version := 1;
    new.created_by := (select id from profiles where id = auth.uid());
  end if;
  new.updated_by := (select id from profiles where id = auth.uid());
  new.updated_at := now();
  return new;
end $$;

create or replace function public.ap_automation_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.version <> old.version then
    insert into automation_versions (automation_id, version, definition, created_by) values (new.id, new.version, new.definition, new.updated_by)
    on conflict (automation_id, version) do nothing;
  end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (new.updated_by, new.brand_id, 'automation.' || case when tg_op = 'INSERT' then 'created' when new.status is distinct from old.status then new.status else 'updated' end,
          'automation', new.id, jsonb_build_object('version', new.version, 'status', new.status, 'name', new.name));
  return null;
end $$;

drop trigger if exists trg_automations_guard on public.automations;
create trigger trg_automations_guard before insert or update on public.automations for each row execute function public.ap_automation_guard();
drop trigger if exists trg_automations_version on public.automations;
create trigger trg_automations_version after insert or update on public.automations for each row execute function public.ap_automation_version();
drop trigger if exists trg_automation_versions_append_only on public.automation_versions;
create trigger trg_automation_versions_append_only before update or delete on public.automation_versions for each row execute function public.cc_append_only();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Monitoring: deterministic rules, one open alert per condition, resolved when the condition ends
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_scan()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  today date := ap_today();
  r record;
  opened int := 0;
  resolved int := 0;
  events int := 0;
  aid uuid;
  rules text[] := array['task_overdue', 'project_overdue', 'project_deadline_soon', 'project_no_milestones', 'budget_overrun',
    'lead_unassigned', 'lead_no_followup', 'lead_stagnant', 'client_attention', 'invoice_overdue', 'expense_spike',
    'automation_failed', 'job_failed', 'knowledge_sync_failed'];
begin
  create temp table if not exists ap_found (rule text, entity_key text) on commit drop;
  delete from ap_found;

  -- Projects
  for r in select t.id, t.brand_id, t.title, t.kind, t.due_date, t.project_id, p.name as project, p.owner_id, t.assignee_id
           from tasks t join projects p on p.id = t.project_id
           where t.status <> 'done' and t.due_date < today and p.deleted_at is null and p.status not in ('completed', 'cancelled') loop
    insert into ap_found values ('task_overdue', r.id::text);
    aid := ap_open_alert('task_overdue', r.id::text, r.brand_id, 'projects', case when r.kind = 'deliverable' then 'high' else 'medium' end,
      (case when r.kind = 'deliverable' then 'Overdue deliverable: ' else 'Overdue task: ' end) || r.title, 'Due ' || r.due_date || ' in project ' || r.project || '.',
      'task', r.id, 'Complete it or move its due date.', coalesce(r.assignee_id, r.owner_id), 'monitor', ap_brand_link(r.brand_id, 'projects?id=' || r.project_id));
    if aid is not null then opened := opened + 1; end if;
    if ap_emit('task.overdue', r.brand_id, 'task', r.id, '{}', 'task.overdue:' || r.id || ':' || r.due_date) is not null then events := events + 1; end if;
  end loop;
  for r in select id, brand_id, name, deadline, priority, owner_id from projects
           where deleted_at is null and status not in ('completed', 'cancelled') and deadline < today loop
    insert into ap_found values ('project_overdue', r.id::text);
    if ap_open_alert('project_overdue', r.id::text, r.brand_id, 'projects', case when r.priority in ('high', 'urgent') then 'critical' else 'high' end,
      'Project past its deadline: ' || r.name, 'Deadline ' || r.deadline || '.', 'project', r.id, 'Agree a new deadline or close the project.', r.owner_id, 'monitor',
      ap_brand_link(r.brand_id, 'projects?id=' || r.id)) is not null then opened := opened + 1; end if;
  end loop;
  for r in select id, brand_id, name, deadline, owner_id from projects
           where deleted_at is null and status not in ('completed', 'cancelled') and deadline between today and today + 7 loop
    insert into ap_found values ('project_deadline_soon', r.id::text);
    if ap_open_alert('project_deadline_soon', r.id::text, r.brand_id, 'projects', 'medium', 'Deadline in ' || (r.deadline - today) || ' days: ' || r.name,
      'Deadline ' || r.deadline || '.', 'project', r.id, 'Check the open tasks.', r.owner_id, 'monitor', ap_brand_link(r.brand_id, 'projects?id=' || r.id)) is not null then opened := opened + 1; end if;
    if ap_emit('project.deadline_approaching', r.brand_id, 'project', r.id, '{}', 'project.deadline:' || r.id || ':' || r.deadline) is not null then events := events + 1; end if;
  end loop;
  for r in select p.id, p.brand_id, p.name, p.owner_id from projects p
           where p.deleted_at is null and p.status = 'active' and p.created_at < now() - interval '3 days'
             and not exists (select 1 from milestones m where m.project_id = p.id) loop
    insert into ap_found values ('project_no_milestones', r.id::text);
    perform ap_open_alert('project_no_milestones', r.id::text, r.brand_id, 'projects', 'low', 'Active project without milestones: ' || r.name, null,
      'project', r.id, 'Add milestones so progress can be followed.', r.owner_id, 'monitor', ap_brand_link(r.brand_id, 'projects?id=' || r.id));
  end loop;
  for r in select p.id, p.brand_id, p.name, p.budget, p.currency, p.owner_id, ap_project_cost(p.id, p.currency) as cost from projects p
           where p.deleted_at is null and p.budget > 0 and p.currency is not null and ap_project_cost(p.id, p.currency) > p.budget loop
    insert into ap_found values ('budget_overrun', r.id::text);
    if ap_open_alert('budget_overrun', r.id::text, r.brand_id, 'finance', 'high', 'Costs above budget: ' || r.name,
      'Recorded costs ' || r.cost || ' ' || r.currency || ' against a budget of ' || r.budget || ' ' || r.currency || '.', 'project', r.id,
      'Review the costs or the budget.', r.owner_id, 'monitor', ap_brand_link(r.brand_id, 'finance?project=' || r.id)) is not null then opened := opened + 1; end if;
  end loop;

  -- CRM
  for r in select id, brand_id, title from leads where deleted_at is null and stage not in ('won', 'lost') and owner_id is null loop
    insert into ap_found values ('lead_unassigned', r.id::text);
    if ap_open_alert('lead_unassigned', r.id::text, r.brand_id, 'crm', 'medium', 'Lead waiting for an owner: ' || r.title, null, 'lead', r.id,
      'Assign an owner in CRM.', null, 'monitor', ap_brand_link(r.brand_id, 'crm?tab=pipeline&lead=' || r.id)) is not null then opened := opened + 1; end if;
  end loop;
  for r in select l.id, l.brand_id, l.title, l.owner_id from leads l
           where l.deleted_at is null and l.stage not in ('won', 'lost') and l.created_at < now() - interval '2 days'
             and (l.next_follow_up is null or l.next_follow_up < today)
             and not exists (select 1 from interactions i where i.lead_id = l.id and i.occurred_at > now() - interval '14 days') loop
    insert into ap_found values ('lead_no_followup', r.id::text);
    perform ap_open_alert('lead_no_followup', r.id::text, r.brand_id, 'crm', 'low', 'Lead without a follow-up: ' || r.title,
      'No follow-up planned and no interaction in 14 days.', 'lead', r.id, 'Plan a follow-up.', r.owner_id, 'monitor', ap_brand_link(r.brand_id, 'crm?tab=pipeline&lead=' || r.id));
  end loop;
  for r in select l.id, l.brand_id, l.title, l.owner_id, (select max(created_at) from lead_events le where le.lead_id = l.id) as moved from leads l
           where l.deleted_at is null and l.stage not in ('won', 'lost') loop
    if r.moved < now() - interval '30 days' then
      insert into ap_found values ('lead_stagnant', r.id::text);
      perform ap_open_alert('lead_stagnant', r.id::text, r.brand_id, 'crm', 'low', 'Opportunity not moving: ' || r.title, 'Same stage since ' || r.moved::date || '.',
        'lead', r.id, 'Move it forward or close it.', r.owner_id, 'monitor', ap_brand_link(r.brand_id, 'crm?tab=pipeline&lead=' || r.id));
    end if;
  end loop;
  for r in select cb.contact_id, cb.brand_id, c.name from contact_brands cb join contacts c on c.id = cb.contact_id
           where cb.status = 'client' and exists (select 1 from projects p where p.client_contact_id = cb.contact_id and p.brand_id = cb.brand_id and p.status = 'active' and p.deleted_at is null)
             and not exists (select 1 from interactions i where i.contact_id = cb.contact_id and i.brand_id = cb.brand_id and i.occurred_at > now() - interval '60 days') loop
    insert into ap_found values ('client_attention', r.contact_id::text || ':' || r.brand_id);
    perform ap_open_alert('client_attention', r.contact_id::text || ':' || r.brand_id, r.brand_id, 'crm', 'low', 'Client with an active project and no contact in 60 days: ' || r.name,
      null, 'contact', r.contact_id, 'Get in touch.', null, 'monitor', ap_brand_link(r.brand_id, 'crm?id=' || r.contact_id));
  end loop;

  -- Finance
  for r in select i.id, i.brand_id, i.number, i.due_date, i.currency, i.amount - coalesce((select sum(amount) from payments x where x.invoice_id = i.id), 0) as due
           from invoices i where i.status = 'sent' and i.due_date < today loop
    if r.due > 0 then
      insert into ap_found values ('invoice_overdue', r.id::text);
      if ap_open_alert('invoice_overdue', r.id::text, r.brand_id, 'finance', 'high', 'Invoice overdue: ' || r.number,
        r.due || ' ' || r.currency || ' still due since ' || r.due_date || '.', 'invoice', r.id, 'Follow up with the client (nothing is sent automatically).', null, 'monitor',
        ap_brand_link(r.brand_id, 'finance?tab=invoices&filter=outstanding')) is not null then opened := opened + 1; end if;
      if ap_emit('invoice.overdue', r.brand_id, 'invoice', r.id, '{}', 'invoice.overdue:' || r.id || ':' || r.due_date) is not null then events := events + 1; end if;
    end if;
  end loop;
  -- Unusual expenses: this month above twice the average of the 3 previous full months, per brand and currency, only
  -- when each of those months has expenses (otherwise there is no basis for "unusual").
  for r in with m as (
             select brand_id, currency, date_trunc('month', incurred_on)::date as month, sum(amount) as total
             from expenses where status <> 'void' and incurred_on >= (date_trunc('month', today) - interval '3 months')::date group by 1, 2, 3)
           select cur.brand_id, cur.currency, cur.total, avg(prev.total) as avg_prev, count(prev.*) as months
           from m cur join m prev on prev.brand_id = cur.brand_id and prev.currency = cur.currency and prev.month < cur.month
           where cur.month = date_trunc('month', today)::date group by cur.brand_id, cur.currency, cur.total loop
    if r.months = 3 and r.total > 2 * r.avg_prev then
      insert into ap_found values ('expense_spike', r.brand_id || ':' || r.currency);
      perform ap_open_alert('expense_spike', r.brand_id || ':' || r.currency, r.brand_id, 'finance', 'medium', 'Expenses unusually high this month (' || r.currency || ')',
        'This month ' || r.total || ' ' || r.currency || ', average of the 3 previous months ' || round(r.avg_prev, 2) || ' ' || r.currency || '.', null, null,
        'Check the recent expenses.', null, 'monitor', ap_brand_link(r.brand_id, 'finance?tab=expenses'));
    end if;
  end loop;

  -- System
  for r in select ar.id, ar.brand_id, a.name, ar.error from automation_runs ar join automations a on a.id = ar.automation_id where ar.status = 'failed' loop
    insert into ap_found values ('automation_failed', r.id::text);
    perform ap_open_alert('automation_failed', r.id::text, r.brand_id, 'system', 'high', 'Automation failed: ' || r.name, r.error, 'automation_run', r.id,
      'Open the execution, fix the cause, then retry.', null, 'monitor', case when r.brand_id is null then '/workspace/autopilot/executions' else '/workspace/' || r.brand_id || '/autopilot/executions' end);
  end loop;
  for r in select id, brand_id, kind, error from automation_jobs where status = 'failed' loop
    insert into ap_found values ('job_failed', r.id::text);
    perform ap_open_alert('job_failed', r.id::text, r.brand_id, 'system', 'medium', 'Background job failed (' || r.kind || ')', r.error, null, null,
      'Retry it from the execution history.', null, 'monitor', null);
  end loop;
  -- Knowledge: the latest publication failed, or 3 or more failures in 24 hours.
  for r in select (select count(*) from knowledge_publications where status = 'failed' and requested_at > now() - interval '24 hours') as recent,
                  (select status from knowledge_publications order by requested_at desc limit 1) as last_status loop
    if r.last_status = 'failed' then
      insert into ap_found values ('knowledge_sync_failed', 'latest');
      perform ap_open_alert('knowledge_sync_failed', 'latest', null, 'system', case when r.recent >= 3 then 'critical' else 'high' end,
        case when r.recent >= 3 then 'Knowledge indexing failed ' || r.recent || ' times in 24 hours' else 'The last knowledge publication failed' end,
        'The AI keeps using the previous knowledge until a publication goes live.', null, null, 'Open Knowledge Studio, Review, and retry the synchronization.', null, 'monitor', '/workspace/knowledge/review');
    end if;
  end loop;

  -- Conditions that ended: their open alerts are resolved (alerts created by automations are left to people).
  update ops_alerts a set status = 'resolved', resolved_at = now()
  where a.status = 'open' and a.source = 'monitor' and a.rule = any (rules)
    and not exists (select 1 from ap_found f where f.rule = a.rule and f.entity_key = a.entity_key);
  get diagnostics resolved = row_count;
  -- Dismissed alerts whose condition ended are re-armed: the next occurrence opens a new alert.
  update ops_alerts a set resolved_at = now()
  where a.status = 'dismissed' and a.resolved_at is null and a.rule = any (rules)
    and not exists (select 1 from ap_found f where f.rule = a.rule and f.entity_key = a.entity_key);
  -- An assignment-queue alert from an automation ends when the lead gets an owner.
  update ops_alerts a set status = 'resolved', resolved_at = now()
  where a.status = 'open' and a.rule = 'lead_unassigned' and a.source <> 'monitor' and not exists (select 1 from ap_found f where f.rule = a.rule and f.entity_key = a.entity_key);

  -- Executions stuck "running" (a crash or a timeout) are marked failed, never left hanging.
  update automation_runs set status = 'failed', error = 'Timed out', completed_at = now() where status = 'running' and started_at < now() - interval '10 minutes';
  update automation_jobs set status = 'failed', error = 'Timed out' where status = 'running' and started_at < now() - interval '10 minutes';

  return jsonb_build_object('opened', opened, 'resolved', resolved, 'events', events);
end $$;

-- Run monitoring now (at most once every 2 minutes, whoever asks). Callable by any brand admin or super admin; it
-- returns nothing about other brands.
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
  update autopilot_state set last_scan_at = now(), last_scan_by = auth.uid(), last_scan_result = res where id = 1;
  return jsonb_build_object('ran', true, 'last_scan_at', now());
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Operations for people (each checks the caller's rights itself)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ap_retry(p_run uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from automation_runs where id = p_run;
  if not found or not ap_can_manage(r.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if r.status <> 'failed' then raise exception 'Only a failed execution can be retried.' using errcode = '22023'; end if;
  if r.attempts >= 5 then raise exception 'Retry limit reached (5 attempts).' using errcode = '22023'; end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values ((select id from profiles where id = auth.uid()), r.brand_id, 'automation_run.retried', 'automation_run', r.id, jsonb_build_object('attempt', r.attempts + 1));
  return ap_execute(p_run, true);
end $$;

create or replace function public.ap_decide(p_run uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from automation_runs where id = p_run;
  if not found or not ap_can_manage(r.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if r.status <> 'awaiting_approval' then raise exception 'This execution is not waiting for approval.' using errcode = '22023'; end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values ((select id from profiles where id = auth.uid()), r.brand_id, case when p_approve then 'automation_run.approved' else 'automation_run.cancelled' end, 'automation_run', r.id, '{}');
  if not p_approve then
    update automation_runs set status = 'cancelled', completed_at = now() where id = p_run;
    return 'cancelled';
  end if;
  update automation_runs set approved_by = (select id from profiles where id = auth.uid()) where id = p_run;
  return ap_execute(p_run, true);
end $$;

-- Test an automation on a recent event (dry run: conditions only, nothing executed).
create or replace function public.ap_test(p_automation uuid, p_event bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w record;
  e record;
  p jsonb;
  c jsonb;
  checks jsonb := '[]'::jsonb;
  ok boolean;
  pass boolean;
begin
  select * into w from automations where id = p_automation;
  if not found or not ap_can_manage(w.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into e from automation_events where id = p_event;
  if not found or (w.brand_id is not null and e.brand_id is distinct from w.brand_id) then raise exception 'This event is not one of the automation''s brand.' using errcode = '42501'; end if;
  p := coalesce(ap_payload(e.entity_type, e.entity_id), '{}'::jsonb) || e.payload;
  pass := coalesce(w.definition ->> 'match', 'all') = 'all';
  for c in select * from jsonb_array_elements(coalesce(w.definition -> 'conditions', '[]')) loop
    ok := ap_eval_condition(c, p);
    checks := checks || jsonb_build_object('field', c ->> 'field', 'op', c ->> 'op', 'value', c ->> 'value', 'actual', p -> (c ->> 'field'), 'ok', ok);
    if coalesce(w.definition ->> 'match', 'all') = 'all' then pass := pass and ok; else pass := pass or ok; end if;
  end loop;
  if jsonb_array_length(coalesce(w.definition -> 'conditions', '[]')) = 0 then pass := true; end if;
  return jsonb_build_object('trigger_matches', w.definition ->> 'trigger' = e.event_type, 'conditions_pass', pass, 'checks', checks,
    'would_run', (w.definition ->> 'trigger' = e.event_type) and pass, 'actions', w.definition -> 'actions', 'requires_approval', coalesce((w.definition ->> 'requires_approval')::boolean, false));
end $$;

create or replace function public.ap_set_alert(p_alert uuid, p_status text, p_responsible uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from ops_alerts where id = p_alert;
  if not found or not ap_can_manage(a.brand_id) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_status = 'dismissed' and a.status = 'open' then
    update ops_alerts set status = 'dismissed', dismissed_at = now(), dismissed_by = (select id from profiles where id = auth.uid()) where id = p_alert;
  elsif p_status = 'resolved' and a.status = 'open' then
    update ops_alerts set status = 'resolved', resolved_at = now() where id = p_alert;
  elsif p_status = 'assign' then
    if p_responsible is not null and not cc_user_in_brand(p_responsible, a.brand_id) then raise exception 'This person has no access to the brand.' using errcode = '42501'; end if;
    update ops_alerts set responsible_id = p_responsible where id = p_alert;
  else
    raise exception 'Not a valid change.' using errcode = '22023';
  end if;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values ((select id from profiles where id = auth.uid()), a.brand_id, 'alert.' || p_status, 'alert', a.id, jsonb_build_object('rule', a.rule));
end $$;

-- Execute an AI proposal the user confirmed. Checks again: the proposal is theirs, they manage the brand, the target is
-- in that brand. Audited with "confirmed_by".
create or replace function public.ap_confirm_proposal(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pr record;
  me uuid := (select id from profiles where id = auth.uid());
  res jsonb;
  new_id uuid;
  owner uuid;
begin
  select * into pr from assistant_proposals where id = p_id for update;
  if not found or pr.user_id <> me then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if pr.status <> 'proposed' then raise exception 'This proposal was already decided.' using errcode = '22023'; end if;
  if not ap_can_manage(pr.brand_id) then raise exception 'Not allowed for this brand.' using errcode = '42501'; end if;
  if not p_approve then
    update assistant_proposals set status = 'rejected', decided_at = now() where id = p_id;
    return jsonb_build_object('status', 'rejected');
  end if;
  begin
    if pr.action_type = 'create_task' then
      if not exists (select 1 from projects where id = pr.target_id and brand_id = pr.brand_id) then raise exception 'The project is not in this brand.'; end if;
      insert into tasks (project_id, brand_id, title, priority, due_date)
      values (pr.target_id, pr.brand_id, left(coalesce(pr.params ->> 'title', 'Follow-up'), 300), coalesce(pr.params ->> 'priority', 'medium'), (pr.params ->> 'due_date')::date)
      returning id into new_id;
      res := jsonb_build_object('task_id', new_id);
    elsif pr.action_type = 'assign_lead' then
      if not exists (select 1 from leads where id = pr.target_id and brand_id = pr.brand_id) then raise exception 'The lead is not in this brand.'; end if;
      if not cc_user_in_brand((pr.params ->> 'owner_id')::uuid, pr.brand_id) then raise exception 'That person has no access to the brand.'; end if;
      update leads set owner_id = (pr.params ->> 'owner_id')::uuid where id = pr.target_id;
      res := jsonb_build_object('owner_id', pr.params ->> 'owner_id');
    elsif pr.action_type = 'notify_owner' then
      select owner_id into owner from projects where id = pr.target_id and brand_id = pr.brand_id;
      if owner is null then select owner_id into owner from leads where id = pr.target_id and brand_id = pr.brand_id; end if;
      if owner is null then raise exception 'This record has no owner to notify.'; end if;
      res := jsonb_build_object('notified', ap_notify_user(owner, pr.brand_id, 'automations', 'normal', left(coalesce(pr.params ->> 'title', pr.summary), 200), pr.params ->> 'body', null, 'proposal:' || pr.id, 'assistant'));
    elsif pr.action_type = 'create_alert' then
      if not exists (select 1 from projects where id = pr.target_id and brand_id = pr.brand_id union select 1 from leads where id = pr.target_id and brand_id = pr.brand_id
                     union select 1 from invoices where id = pr.target_id and brand_id = pr.brand_id union select 1 from tasks where id = pr.target_id and brand_id = pr.brand_id) then
        raise exception 'The record is not in this brand.';
      end if;
      new_id := ap_open_alert('assistant:' || pr.id, pr.target_id::text, pr.brand_id, coalesce(pr.params ->> 'category', 'projects'), coalesce(pr.params ->> 'severity', 'medium'),
        left(coalesce(pr.params ->> 'title', pr.summary), 200), pr.params ->> 'body', pr.target_type, pr.target_id, null, me, 'assistant', null);
      res := jsonb_build_object('alert_id', new_id);
    end if;
    update assistant_proposals set status = 'executed', decided_at = now(), result = res where id = p_id;
  exception when others then
    update assistant_proposals set status = 'failed', decided_at = now(), error = left(sqlerrm, 300) where id = p_id;
    res := jsonb_build_object('error', sqlerrm);
  end;
  insert into audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (me, pr.brand_id, 'assistant.action', pr.target_type, pr.target_id, jsonb_build_object('confirmed_by', me, 'proposal_id', pr.id, 'action', pr.action_type, 'result', res));
  return res;
end $$;

-- AI jobs, processed by the autopilot function as the signed-in admin: claim (only jobs of brands they manage) and
-- complete (the text is delivered as a notification; nothing is sent outside).
create or replace function public.ap_claim_jobs(p_limit int default 5)
returns setof public.automation_jobs language plpgsql security definer set search_path = public as $$
begin
  return query
  update automation_jobs j set status = 'running', started_at = now(), attempts = attempts + 1
  where j.id in (select id from automation_jobs where status = 'pending' and attempts < 3 and ap_can_manage(brand_id) order by created_at limit least(p_limit, 10) for update skip locked)
  returning j.*;
end $$;

create or replace function public.ap_complete_job(p_id uuid, p_result text, p_error text)
returns void language plpgsql security definer set search_path = public as $$
declare j record;
begin
  select * into j from automation_jobs where id = p_id;
  if not found or not ap_can_manage(j.brand_id) or j.status <> 'running' then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_error is not null then
    update automation_jobs set status = case when attempts >= 3 then 'failed' else 'pending' end, error = left(p_error, 300) where id = p_id;
    return;
  end if;
  update automation_jobs set status = 'completed', result = left(p_result, 4000), completed_at = now(), error = null where id = p_id;
  perform ap_notify_admins(j.brand_id, false, case when j.kind = 'followup_draft' then 'finance' else 'automations' end, 'normal',
    case when j.kind = 'followup_draft' then 'Suggested follow-up message (draft, not sent)' else 'AI summary' end || ': ' || coalesce(j.input -> 'payload' ->> 'title', ''),
    left(p_result, 2000), case when j.brand_id is null then '/workspace/autopilot/executions' else '/workspace/' || j.brand_id || '/autopilot/executions' end, 'job:' || j.id, 'automation');
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['automation_events', 'automations', 'automation_versions', 'automation_runs', 'automation_run_actions', 'ops_alerts',
    'user_notifications', 'notification_preferences', 'automation_jobs', 'assistant_proposals', 'autopilot_state'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

create policy "automation_events_select" on public.automation_events for select to authenticated using (public.ap_can_manage(brand_id));
create policy "automation_runs_select" on public.automation_runs for select to authenticated using (public.ap_can_manage(brand_id));
create policy "automation_run_actions_select" on public.automation_run_actions for select to authenticated
  using (exists (select 1 from public.automation_runs r where r.id = run_id and public.ap_can_manage(r.brand_id)));
create policy "ops_alerts_select" on public.ops_alerts for select to authenticated using (public.ap_can_manage(brand_id));
create policy "automation_jobs_select" on public.automation_jobs for select to authenticated using (public.ap_can_manage(brand_id));
create policy "autopilot_state_select" on public.autopilot_state for select to authenticated using (true);
grant select on public.automation_events, public.automation_runs, public.automation_run_actions, public.ops_alerts, public.automation_jobs, public.autopilot_state to authenticated;

-- Automations: created and changed by those who manage the brand (global ones by super admins); archived, not deleted.
create policy "automations_select" on public.automations for select to authenticated using (public.ap_can_manage(brand_id));
create policy "automations_insert" on public.automations for insert to authenticated with check (public.ap_can_manage(brand_id));
create policy "automations_update" on public.automations for update to authenticated using (public.ap_can_manage(brand_id)) with check (public.ap_can_manage(brand_id));
grant select, insert, update on public.automations to authenticated;
create policy "automation_versions_select" on public.automation_versions for select to authenticated
  using (exists (select 1 from public.automations a where a.id = automation_id and public.ap_can_manage(a.brand_id)));
grant select on public.automation_versions to authenticated;

-- Notifications: one's own only; the only change allowed is marking them read.
create policy "user_notifications_select" on public.user_notifications for select to authenticated using (user_id = auth.uid());
create policy "user_notifications_update" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;
create policy "notification_preferences_select" on public.notification_preferences for select to authenticated using (user_id = auth.uid());
create policy "notification_preferences_insert" on public.notification_preferences for insert to authenticated with check (user_id = auth.uid());
create policy "notification_preferences_update" on public.notification_preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notification_preferences to authenticated;

-- AI proposals: the user's own, for a brand they manage; executed only through ap_confirm_proposal.
create policy "assistant_proposals_select" on public.assistant_proposals for select to authenticated using (user_id = auth.uid());
create policy "assistant_proposals_insert" on public.assistant_proposals for insert to authenticated
  with check (user_id = auth.uid() and status = 'proposed' and public.ap_can_manage(brand_id));
grant select, insert on public.assistant_proposals to authenticated;

do $$
declare f text;
begin
  foreach f in array array['ap_tick(boolean)', 'ap_retry(uuid)', 'ap_decide(uuid, boolean)', 'ap_test(uuid, bigint)', 'ap_set_alert(uuid, text, uuid)',
    'ap_confirm_proposal(uuid, boolean)', 'ap_claim_jobs(integer)', 'ap_complete_job(uuid, text, text)', 'ap_can_manage(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- Engine internals are not callable from the browser.
  foreach f in array array['ap_emit(text, uuid, text, uuid, jsonb, text)', 'ap_dispatch(bigint)', 'ap_execute(uuid, boolean)', 'ap_scan()',
    'ap_do_action(uuid, jsonb, jsonb, jsonb)', 'ap_notify_user(uuid, uuid, text, text, text, text, text, text, text)',
    'ap_notify_admins(uuid, boolean, text, text, text, text, text, text, text)', 'ap_open_alert(text, text, uuid, text, text, text, text, text, uuid, text, uuid, text, text)',
    'ap_payload(text, uuid)', 'ap_admins(uuid, boolean)', 'ap_project_cost(uuid, text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

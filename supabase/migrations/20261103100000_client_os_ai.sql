-- Houcine.world Client OS AI (docs/client-os-ai.md): stored conversations for the Client AI Assistant (/portal) and
-- the internal Client Intelligence Assistant (/workspace/clients), an AI activity log, and AI action proposals that
-- run ONLY after the person confirms, through this function, which checks everything again.
--   ai_conversations / ai_messages   a person's own conversations; readable only while they still have access
--   ai_activity                      what happened (requests, refusals, proposals, confirmations, failures): counts
--                                    and identifiers only, never prompts, answers or secrets
--   ai_action_proposals              proposed actions; executed by cai_confirm_action through existing functions
-- The model never runs SQL: the server function reads as the signed-in person (row-level security) and stores
-- proposals; only cai_confirm_action changes business records, after the person's explicit confirmation.

-- Whether the caller may use each assistant right now.
create or replace function public.cai_can_use(p_kind text)
returns boolean language sql security definer stable set search_path = public as $$
  select case p_kind
    when 'client' then exists (select 1 from cos_my_memberships('client'))
    when 'internal' then is_super_admin() or exists (select 1 from brand_admins where user_id = auth.uid() and role = 'brand_admin')
    else false end;
$$;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('client', 'internal')),
  title text not null default 'New conversation' check (length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user on public.ai_conversations (user_id, kind, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 12000),
  -- Links, flagged numbers, knowledge used, proposal ids (no hidden data: only what the person was shown).
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation on public.ai_messages (conversation_id, created_at);

create table if not exists public.ai_activity (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('client', 'internal')),
  event text not null check (event in ('conversation_created', 'request', 'answer', 'refused', 'provider_error', 'action_proposed', 'action_rejected_by_validation',
    'action_confirmed', 'action_declined', 'action_failed', 'history_cleared')),
  conversation_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_activity_user_time on public.ai_activity (user_id, created_at desc);

create table if not exists public.ai_action_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  kind text not null check (kind in ('client', 'internal')),
  action_type text not null check (action_type in ('create_request', 'create_task', 'set_stage', 'notify_owner', 'assign_owner', 'send_reminder', 'draft_automation', 'draft_proposal')),
  brand_id uuid not null references public.brands(id) on delete cascade,
  payload jsonb not null,
  summary text not null check (length(summary) between 1 and 500),
  status text not null default 'proposed' check (status in ('proposed', 'executed', 'declined', 'failed', 'expired')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((kind = 'client') = (action_type = 'create_request'))
);

create or replace function public.cai_conversation_ok(p_conversation uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from ai_conversations c where c.id = p_conversation and c.user_id = auth.uid() and cai_can_use(c.kind));
$$;

-- ── Row-level security: a person's own conversations, and only while they still have access ──────────────────────
do $$
declare t text; p record;
begin
  foreach t in array array['ai_conversations', 'ai_messages', 'ai_activity', 'ai_action_proposals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy "ai_conversations_select" on public.ai_conversations for select to authenticated using (user_id = auth.uid() and public.cai_can_use(kind));
create policy "ai_conversations_insert" on public.ai_conversations for insert to authenticated with check (user_id = auth.uid() and public.cai_can_use(kind));
create policy "ai_conversations_update" on public.ai_conversations for update to authenticated
  using (user_id = auth.uid() and public.cai_can_use(kind)) with check (user_id = auth.uid() and public.cai_can_use(kind));
create policy "ai_conversations_delete" on public.ai_conversations for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.ai_conversations to authenticated;
grant update (title, updated_at) on public.ai_conversations to authenticated;

create policy "ai_messages_select" on public.ai_messages for select to authenticated using (user_id = auth.uid() and public.cai_conversation_ok(conversation_id));
create policy "ai_messages_insert" on public.ai_messages for insert to authenticated with check (user_id = auth.uid() and public.cai_conversation_ok(conversation_id));
create policy "ai_messages_delete" on public.ai_messages for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.ai_messages to authenticated;

create policy "ai_activity_select" on public.ai_activity for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy "ai_activity_insert" on public.ai_activity for insert to authenticated with check (user_id = auth.uid() and public.cai_can_use(kind));
grant select, insert on public.ai_activity to authenticated;
grant usage on sequence public.ai_activity_id_seq to authenticated;
drop trigger if exists trg_ai_activity_append_only on public.ai_activity;
create trigger trg_ai_activity_append_only before update or delete on public.ai_activity for each row execute function public.cc_append_only();

-- Proposals: stored by the server function as the person, always 'proposed'; decided only by cai_confirm_action.
create policy "ai_action_proposals_select" on public.ai_action_proposals for select to authenticated using (user_id = auth.uid() and public.cai_can_use(kind));
create policy "ai_action_proposals_insert" on public.ai_action_proposals for insert to authenticated
  with check (user_id = auth.uid() and status = 'proposed' and public.cai_can_use(kind)
    and (kind = 'internal' and public.ap_can_manage(brand_id) or kind = 'client' and exists (select 1 from public.portal_memberships m where m.id in (select public.cos_my_memberships('client')) and m.brand_id = ai_action_proposals.brand_id)));
grant select, insert on public.ai_action_proposals to authenticated;

-- ── Confirmation: re-validates and executes through the existing functions; audited ───────────────────────────────
create or replace function public.cai_confirm_action(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a record;
  p jsonb;
  pr projects%rowtype;
  res jsonb;
  new_id uuid;
  conv uuid;
  me uuid := (select id from profiles where id = auth.uid());
begin
  select * into a from ai_action_proposals where id = p_id for update;
  if not found or a.user_id is distinct from me then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if a.status <> 'proposed' then raise exception 'This action was already decided.' using errcode = '22023'; end if;
  if not cai_can_use(a.kind) then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if a.created_at < now() - interval '24 hours' then
    update ai_action_proposals set status = 'expired', decided_at = now() where id = p_id;
    raise exception 'This proposal is older than 24 hours; ask again.' using errcode = '22023';
  end if;
  if not p_approve then
    update ai_action_proposals set status = 'declined', decided_at = now() where id = p_id;
    insert into ai_activity (user_id, kind, event, conversation_id, meta) values (me, a.kind, 'action_declined', a.conversation_id, jsonb_build_object('proposal_id', p_id, 'action', a.action_type));
    return jsonb_build_object('status', 'declined');
  end if;
  p := a.payload;
  begin
    -- Every identifier in the payload is checked here, now, against the proposal's brand (never trusted as given).
    if (p ->> 'project_id') is not null then
      select * into pr from projects where id = (p ->> 'project_id')::uuid and deleted_at is null;
      if not found or pr.brand_id <> a.brand_id then raise exception 'The project is not in this brand.' using errcode = '22023'; end if;
    end if;
    if a.action_type = 'create_request' then
      -- The client's own request, through the Client OS function (which checks membership and project access).
      new_id := cos_create_request(a.brand_id, (p ->> 'project_id')::uuid, coalesce(p ->> 'category', 'other'), left(p ->> 'title', 200), left(p ->> 'description', 4000));
      res := jsonb_build_object('request_id', new_id, 'link', '/portal/requests?id=' || new_id);
    elsif not ap_can_manage(a.brand_id) then
      raise exception 'Not allowed for this brand.' using errcode = '42501';
    elsif a.action_type = 'create_task' then
      if pr.id is null then raise exception 'A task needs a project.' using errcode = '22023'; end if;
      insert into tasks (project_id, brand_id, title, priority, due_date, created_by)
      values (pr.id, pr.brand_id, left(coalesce(p ->> 'title', 'Follow up'), 300), coalesce(p ->> 'priority', 'medium'), (p ->> 'due_date')::date, me) returning id into new_id;
      res := jsonb_build_object('task_id', new_id, 'link', '/workspace/clients/projects?id=' || pr.id);
    elsif a.action_type = 'set_stage' then
      if pr.id is null then raise exception 'A stage change needs a project.' using errcode = '22023'; end if;
      res := cos_set_stage(pr.id, p ->> 'stage', left(p ->> 'note', 1000)) || jsonb_build_object('link', '/workspace/clients/projects?id=' || pr.id);
    elsif a.action_type = 'notify_owner' then
      if pr.id is null or pr.owner_id is null then raise exception 'This project has no owner to notify.' using errcode = '22023'; end if;
      res := jsonb_build_object('notified', ap_notify_user(pr.owner_id, pr.brand_id, 'projects', 'normal', left(coalesce(p ->> 'title', a.summary), 200), left(p ->> 'body', 2000),
        '/workspace/clients/projects?id=' || pr.id, 'ai_action:' || p_id, 'assistant'));
    elsif a.action_type = 'assign_owner' then
      if pr.id is null or not exists (select 1 from brand_admins where user_id = (p ->> 'owner_id')::uuid and brand_id = pr.brand_id) then
        raise exception 'That person is not a member of this brand.' using errcode = '22023';
      end if;
      update projects set owner_id = (p ->> 'owner_id')::uuid where id = pr.id;
      res := jsonb_build_object('owner_id', p ->> 'owner_id', 'link', '/workspace/clients/projects?id=' || pr.id);
    elsif a.action_type = 'send_reminder' then
      -- An in-app message to the project's client conversation (created if needed). Never an email.
      if pr.id is null then raise exception 'A reminder needs a project.' using errcode = '22023'; end if;
      select id into conv from cos_conversations where project_id = pr.id and audience = 'client' order by created_at limit 1;
      if conv is null then
        insert into cos_conversations (brand_id, project_id, contact_id, audience, subject, created_by) values (pr.brand_id, pr.id, pr.client_contact_id, 'client', 'Reminder: ' || pr.name, me) returning id into conv;
      end if;
      insert into cos_messages (conversation_id, brand_id, body) values (conv, pr.brand_id, left(p ->> 'body', 8000)) returning id into new_id;
      res := jsonb_build_object('message_id', new_id, 'link', '/workspace/clients/communications?c=' || conv);
    elsif a.action_type = 'draft_automation' then
      -- A DRAFT: Autopilot validates the definition; activating it stays a separate decision in Autopilot.
      insert into automations (brand_id, name, description, status, definition) values (a.brand_id, left(p ->> 'name', 120), left(p ->> 'description', 500), 'draft', p -> 'definition') returning id into new_id;
      res := jsonb_build_object('automation_id', new_id, 'link', '/workspace/' || a.brand_id || '/autopilot/automations');
    elsif a.action_type = 'draft_proposal' then
      insert into proposals (brand_id, contact_id, reference, title, summary, currency) values (a.brand_id, (p ->> 'contact_id')::uuid, left(p ->> 'reference', 60), left(p ->> 'title', 200), left(p ->> 'summary', 5000), coalesce(p ->> 'currency', 'EUR'))
      returning id into new_id;
      res := jsonb_build_object('proposal_id', new_id, 'link', '/workspace/clients/proposals?id=' || new_id);
    end if;
    update ai_action_proposals set status = 'executed', decided_at = now(), result = res where id = p_id;
    insert into ai_activity (user_id, kind, event, conversation_id, meta) values (me, a.kind, 'action_confirmed', a.conversation_id, jsonb_build_object('proposal_id', p_id, 'action', a.action_type));
    perform cos_log('ai.action_confirmed', a.brand_id, 'ai_action', p_id, jsonb_build_object('action', a.action_type, 'confirmed_by', me, 'assistant', a.kind, 'result', res));
    return jsonb_build_object('status', 'executed') || res;
  exception when others then
    update ai_action_proposals set status = 'failed', decided_at = now(), error = left(sqlerrm, 300) where id = p_id;
    insert into ai_activity (user_id, kind, event, conversation_id, meta) values (me, a.kind, 'action_failed', a.conversation_id, jsonb_build_object('proposal_id', p_id, 'action', a.action_type));
    perform cos_log('ai.action_failed', a.brand_id, 'ai_action', p_id, jsonb_build_object('action', a.action_type, 'error', left(sqlerrm, 200)));
    return jsonb_build_object('status', 'failed', 'error', sqlerrm);
  end;
end $$;

do $$
declare f text;
begin
  foreach f in array array['cai_can_use(text)', 'cai_conversation_ok(uuid)', 'cai_confirm_action(uuid, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

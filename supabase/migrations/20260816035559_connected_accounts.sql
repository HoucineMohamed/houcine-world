-- ── Connected Accounts (per-brand external platform links) ─────────────────
-- Brand-scoped, reusable across platforms (Instagram now; TikTok/SoundCloud/
-- Spotify/Gmail plug into the same shape later — new platform = new check
-- constraint value + a new edge function, no schema change).
--
-- Design: account metadata (who's connected, as what handle, token expiry)
-- lives in `connected_accounts` and is readable by brand members via RLS,
-- same as every other brand-scoped table. The actual OAuth secrets live in
-- `connected_account_secrets`, which carries RLS with *zero* policies and no
-- grants to `authenticated`/`anon` at all — only `service_role` (used
-- exclusively from edge functions) can ever read or write a token. The
-- frontend can never see a token, in any state.

create table public.connected_accounts (
  id                   uuid primary key default gen_random_uuid(),
  brand_id             uuid not null references public.brands(id) on delete cascade,
  platform             text not null check (platform in ('instagram','tiktok','soundcloud','spotify','gmail')),
  status               text not null default 'connected' check (status in ('connected','expired','error','disconnected')),
  account_name         text,           -- display handle/name, e.g. "@larosaview"
  account_external_id  text,           -- platform-side account id
  scopes               text[],
  error_message        text,           -- last failure, shown to the admin (never a raw provider error)
  connected_by         uuid references public.profiles(id) on delete set null,
  connected_at         timestamptz,
  token_expires_at      timestamptz,   -- drives the lazy-refresh + "reconnect" UI, never the token itself
  last_refreshed_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (brand_id, platform)
);
create index idx_connected_accounts_brand on public.connected_accounts(brand_id);

create table public.connected_account_secrets (
  connected_account_id uuid primary key references public.connected_accounts(id) on delete cascade,
  access_token          text not null,  -- Instagram: the IG-linked Page access token used for Graph API calls
  refresh_token         text,           -- Instagram: the long-lived user token, re-exchanged to refresh access_token
  provider_meta         jsonb,          -- non-secret provider bookkeeping (e.g. facebook page id)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.oauth_flow_states (
  state          text primary key,
  brand_id       uuid not null references public.brands(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  platform       text not null,
  return_origin  text not null, -- the workspace origin to redirect back to once Instagram completes the dance
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  used_at        timestamptz
);
create index idx_oauth_flow_states_expires on public.oauth_flow_states(expires_at);

create table public.platform_metrics_snapshots (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brands(id) on delete cascade,
  platform   text not null check (platform in ('instagram','tiktok','soundcloud','spotify','gmail')),
  metrics    jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (brand_id, platform)
);
create index idx_platform_metrics_brand on public.platform_metrics_snapshots(brand_id);

-- ── Triggers ─────────────────────────────────────────────────────────────────
create trigger trg_connected_accounts_updated
  before update on public.connected_accounts
  for each row execute function public.set_updated_at();
create trigger trg_connected_account_secrets_updated
  before update on public.connected_account_secrets
  for each row execute function public.set_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────────
-- connected_accounts: readable by brand members (RLS below); writes only via
-- service_role (edge functions) or the audited disconnect RPC.
grant select                          on public.connected_accounts        to authenticated;
grant select                          on public.platform_metrics_snapshots to authenticated;
grant all on public.connected_accounts, public.connected_account_secrets,
             public.oauth_flow_states, public.platform_metrics_snapshots to service_role;

-- Secrets and OAuth flow state are never reachable from the client, RLS or not.
revoke all on public.connected_account_secrets from authenticated, anon;
revoke all on public.oauth_flow_states         from authenticated, anon;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.connected_accounts         enable row level security;
alter table public.connected_account_secrets  enable row level security;
alter table public.oauth_flow_states          enable row level security;
alter table public.platform_metrics_snapshots enable row level security;

create policy "connected_accounts_select" on public.connected_accounts for select
  using ( is_super_admin() or has_brand_access(brand_id) );

create policy "platform_metrics_select" on public.platform_metrics_snapshots for select
  using ( is_super_admin() or has_brand_access(brand_id) );

-- connected_account_secrets and oauth_flow_states: RLS enabled, no policies at
-- all, no client grants at all → default-deny for every non-service_role caller.

-- ── Realtime (so "Connected" flips live once the OAuth callback lands) ──────
alter publication supabase_realtime add table public.connected_accounts;

-- ── Disconnect RPC (audited, brand_admin-gated) ─────────────────────────────
create or replace function public.disconnect_platform_account(p_brand_id uuid, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_account_id uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;
  if not (public.is_super_admin() or public.has_brand_role(p_brand_id, 'brand_admin')) then
    raise exception 'Not authorized to manage connected accounts for this brand';
  end if;

  select id into v_account_id from public.connected_accounts
    where brand_id = p_brand_id and platform = p_platform;

  if v_account_id is not null then
    delete from public.connected_account_secrets where connected_account_id = v_account_id;
    update public.connected_accounts
      set status = 'disconnected', error_message = null, token_expires_at = null, last_refreshed_at = null
      where id = v_account_id;
  end if;

  insert into public.audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (v_actor, p_brand_id, 'connected_account.disconnect', 'connected_accounts', v_account_id,
          jsonb_build_object('platform', p_platform));
end;
$$;

revoke all on function public.disconnect_platform_account(uuid, text) from public, anon;
grant execute on function public.disconnect_platform_account(uuid, text) to authenticated;

-- ── Housekeeping: drop expired, unused OAuth states ─────────────────────────
create or replace function public.purge_expired_oauth_states()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.oauth_flow_states where expires_at < now() - interval '1 hour';
$$;

revoke all on function public.purge_expired_oauth_states() from public, anon, authenticated;
grant execute on function public.purge_expired_oauth_states() to service_role;

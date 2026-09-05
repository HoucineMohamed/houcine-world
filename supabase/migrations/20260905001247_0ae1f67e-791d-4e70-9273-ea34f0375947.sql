create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  platform text not null,
  status text not null default 'connected',
  account_name text,
  account_external_id text,
  scopes text[],
  error_message text,
  connected_by uuid references public.profiles(id),
  connected_at timestamptz not null default now(),
  token_expires_at timestamptz,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, platform)
);

grant select on public.connected_accounts to authenticated;
grant all on public.connected_accounts to service_role;
alter table public.connected_accounts enable row level security;

create policy connected_accounts_select on public.connected_accounts for select
  using (public.is_super_admin() or public.has_brand_access(brand_id));

create trigger trg_connected_accounts_updated before update on public.connected_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.connected_account_secrets (
  connected_account_id uuid primary key references public.connected_accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  provider_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on public.connected_account_secrets from anon, authenticated;
grant all on public.connected_account_secrets to service_role;
alter table public.connected_account_secrets enable row level security;

create trigger trg_connected_account_secrets_updated before update on public.connected_account_secrets
  for each row execute function public.set_updated_at();

create table if not exists public.oauth_flow_states (
  state text primary key,
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid references public.profiles(id),
  platform text not null,
  return_origin text,
  pkce_verifier text,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
revoke all on public.oauth_flow_states from anon, authenticated;
grant all on public.oauth_flow_states to service_role;
alter table public.oauth_flow_states enable row level security;

create table if not exists public.platform_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  platform text not null,
  metrics jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (brand_id, platform)
);
grant select on public.platform_metrics_snapshots to authenticated;
grant all on public.platform_metrics_snapshots to service_role;
alter table public.platform_metrics_snapshots enable row level security;

create policy platform_metrics_snapshots_select on public.platform_metrics_snapshots for select
  using (public.is_super_admin() or public.has_brand_access(brand_id));

create table if not exists public.platform_credentials (
  platform text primary key,
  client_id text not null,
  client_secret text not null,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on public.platform_credentials from anon, authenticated;
grant all on public.platform_credentials to service_role;
alter table public.platform_credentials enable row level security;

create trigger trg_platform_credentials_updated before update on public.platform_credentials
  for each row execute function public.set_updated_at();

create or replace function public.disconnect_platform_account(p_brand_id uuid, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if not (public.is_super_admin() or public.has_brand_role(p_brand_id, 'brand_admin')) then
    raise exception 'Not authorized to manage this brand''s connections';
  end if;

  select id into v_id from public.connected_accounts
    where brand_id = p_brand_id and platform = p_platform;
  if v_id is null then return; end if;

  delete from public.connected_account_secrets where connected_account_id = v_id;
  delete from public.connected_accounts where id = v_id;
  delete from public.platform_metrics_snapshots where brand_id = p_brand_id and platform = p_platform;

  insert into public.audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (v_actor, p_brand_id, 'connected_account.disconnect', 'connected_accounts', v_id,
          jsonb_build_object('platform', p_platform));
end;
$$;

grant execute on function public.disconnect_platform_account(uuid, text) to authenticated;

alter publication supabase_realtime add table public.connected_accounts;
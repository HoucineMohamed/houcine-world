-- ── Platform Credentials (app-level developer OAuth apps) ──────────────────
-- These are the *app's* Client ID/Secret for each provider (one Meta app, one
-- TikTok app, etc.) — not a brand's personal login, and not a brand's stored
-- access token (that's connected_account_secrets). Exactly one row per
-- platform, global to the whole workspace, editable only by a super admin
-- through the in-app "Platform Credentials" settings panel.
--
-- Locked down the same way as connected_account_secrets: RLS enabled, zero
-- policies, zero grants to authenticated/anon. Only service_role (the
-- platform-credentials edge function, after it re-checks is_super_admin())
-- can ever read or write a row. The redirect URI is *not* stored here — it's
-- deterministic (`${SUPABASE_URL}/functions/v1/<platform>-oauth/callback`)
-- and computed by the edge function so the admin never has to type it.

create table public.platform_credentials (
  platform      text primary key check (platform in ('instagram','tiktok','soundcloud','spotify','gmail')),
  client_id     text,
  client_secret text,
  updated_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_platform_credentials_updated
  before update on public.platform_credentials
  for each row execute function public.set_updated_at();

alter table public.platform_credentials enable row level security;
revoke all on public.platform_credentials from authenticated, anon;
grant all on public.platform_credentials to service_role;
-- No policies at all → default-deny for every non-service_role caller, same as connected_account_secrets.

-- SoundCloud's current API requires PKCE on top of the client secret.
alter table public.oauth_flow_states add column pkce_verifier text;

-- ── Status + save both live in the platform-credentials edge function ──────
-- Deliberately not a SQL RPC: "configured" has to account for credentials set
-- via Edge Function secrets (Deno env — e.g. Instagram's existing setup) as
-- well as this table, and only Deno-side code can see env vars. The edge
-- function re-verifies is_super_admin() via the caller's JWT before any write,
-- and only ever returns booleans + the computed redirect URI — never the
-- stored client_id/client_secret values.

-- ── YouTube + Facebook (new platforms, same generic connector shape) ───────
-- Per the design note in 20260816035559_connected_accounts.sql: "new
-- platform = new check constraint value + a new edge function, no schema
-- change." Widens the three platform CHECK constraints to admit 'youtube'
-- and 'facebook' alongside the existing five. Nothing else about the shape
-- of connected_accounts / connected_account_secrets / oauth_flow_states /
-- platform_metrics_snapshots / platform_credentials changes, and no other
-- platform's existing rows or constraints are touched.

alter table public.connected_accounts
  drop constraint connected_accounts_platform_check,
  add constraint connected_accounts_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook'));

alter table public.platform_metrics_snapshots
  drop constraint platform_metrics_snapshots_platform_check,
  add constraint platform_metrics_snapshots_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook'));

alter table public.platform_credentials
  drop constraint platform_credentials_platform_check,
  add constraint platform_credentials_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook'));

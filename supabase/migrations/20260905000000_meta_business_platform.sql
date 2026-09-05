-- ── Meta Business Suite (new platform, same generic connector shape) ───────
-- Same pattern as 20260817110000_youtube_facebook_platforms.sql: widens the
-- three platform CHECK constraints to admit 'meta_business' alongside the
-- existing seven. This platform is authenticated via a pasted System User
-- token (not OAuth), but it's stored, scoped, and audited identically to
-- every other platform's rows — no schema or RLS change needed beyond the
-- constraint value itself, since every policy on these tables scopes by
-- brand_id, never by platform.

alter table public.connected_accounts
  drop constraint connected_accounts_platform_check,
  add constraint connected_accounts_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook','meta_business'));

alter table public.platform_metrics_snapshots
  drop constraint platform_metrics_snapshots_platform_check,
  add constraint platform_metrics_snapshots_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook','meta_business'));

alter table public.platform_credentials
  drop constraint platform_credentials_platform_check,
  add constraint platform_credentials_platform_check
    check (platform in ('instagram','tiktok','soundcloud','spotify','gmail','youtube','facebook','meta_business'));

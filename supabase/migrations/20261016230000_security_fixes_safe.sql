-- Safe items from docs/security-fixes-proposed.md (H1, C1, H2, L5). None of them changes how anyone signs in.
-- Written to run more than once without failing (drop ... if exists before each create), because the Deploy
-- Supabase workflow stops on the first failing statement.

-- (a) H1: row-level security on public.services. Signed-in users may read (the brand pages join it);
-- only the super admin may write. Visitors who are not signed in never need it.
alter table public.services enable row level security;

drop policy if exists "services_select" on public.services;
create policy "services_select" on public.services for select
  to authenticated
  using ( true );

drop policy if exists "services_insert" on public.services;
create policy "services_insert" on public.services for insert
  to authenticated
  with check ( public.is_super_admin() );

drop policy if exists "services_update" on public.services;
create policy "services_update" on public.services for update
  to authenticated
  using ( public.is_super_admin() )
  with check ( public.is_super_admin() );

drop policy if exists "services_delete" on public.services;
create policy "services_delete" on public.services for delete
  to authenticated
  using ( public.is_super_admin() );

revoke all on public.services from anon;

-- (b) C1: form submissions and newsletter subscribers are readable only by an admin (the /admin inbox) or
-- the super admin, no longer by every signed-in user.
drop policy if exists "Allow authenticated users to read submissions" on public.submissions;
drop policy if exists "Allow authenticated users to read subscriptions" on public.subscriptions;

drop policy if exists "submissions_select_admin" on public.submissions;
create policy "submissions_select_admin" on public.submissions for select
  to authenticated
  using ( public.has_role(auth.uid(), 'admin') or public.is_super_admin() );

drop policy if exists "subscriptions_select_admin" on public.subscriptions;
create policy "subscriptions_select_admin" on public.subscriptions for select
  to authenticated
  using ( public.has_role(auth.uid(), 'admin') or public.is_super_admin() );

-- (b) H2: no direct anonymous inserts. Every form goes through the send-notification function, which writes
-- with its own server key, so no form changes.
drop policy if exists "Allow anonymous inserts to submissions" on public.submissions;
drop policy if exists "Allow anonymous inserts to subscriptions" on public.subscriptions;

-- (b) L5: a signed-in user may change only their own name in public.profiles (the policy that limits them to
-- their own row stays). The app never updates profiles from the browser; server code and triggers are not
-- affected.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Self-check: no OPEN policy may remain on the two form tables (one for anonymous visitors or everyone, or one
-- whose condition is simply true). A policy added by hand under another name, which "drop policy if exists"
-- above would not see, stops the migration here: the whole migration is undone and the deploy fails with this
-- message, instead of leaving the hole open silently. Admin-only policies added by hand are left alone.
do $$
declare
  extra text;
begin
  select string_agg(tablename || '.' || policyname, ', ') into extra
  from pg_policies
  where schemaname = 'public'
    and tablename in ('submissions', 'subscriptions')
    and ('anon' = any (roles) or 'public' = any (roles)
         or coalesce(trim(qual), '') = 'true' or coalesce(trim(with_check), '') = 'true');
  if extra is not null then
    raise exception 'security_fixes_safe: open policies remain on the form tables: %. Remove them in the Supabase dashboard (Authentication > Policies), then re-run Deploy Supabase.', extra;
  end if;
end $$;

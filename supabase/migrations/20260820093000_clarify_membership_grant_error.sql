-- ── Clarify the "no profile yet" error on manage_brand_membership ──────────
-- Not a security fix — the check being clarified here is correct and stays
-- exactly as strict as it was. Investigated a report that granting Brand
-- Admin access "failed, blocked by the database, looks like an RLS issue":
-- confirmed via profiles/brand_admins/Postgres logs that RLS, is_super_admin(),
-- and the role check were all fine — the RPC was correctly raising
-- 'No user found for that email' because the target account had never signed
-- in yet, so no profiles row existed for the RPC to attach a membership to
-- (profiles rows are only created by the on_auth_user_created trigger on
-- first sign-in — see 20260808035658). That's intended behavior, not a gap:
-- you cannot grant a role to an identity this app has no record of yet.
--
-- The only real problem was that the message didn't say so — an admin
-- reading "No user found for that email" reasonably assumed a permissions
-- bug rather than "ask them to log in once first". This migration changes
-- only that message text, byte-for-byte identical function otherwise.

create or replace function public.manage_brand_membership(
  p_action text,
  p_brand_id uuid,
  p_role text default null,
  p_email text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid := p_user_id;
  v_admin_count int;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;
  if not (public.is_super_admin() or public.has_brand_role(p_brand_id, 'brand_admin')) then
    raise exception 'Not authorized to manage members of this brand';
  end if;
  if p_action <> 'revoke' and (p_role is null or public.brand_role_rank(p_role) = 0) then
    raise exception 'Invalid role';
  end if;

  if v_target is null and p_email is not null then
    select id into v_target from public.profiles where lower(email) = lower(p_email) and deleted_at is null;
  end if;
  if v_target is null then
    raise exception 'No account found for %. They need to sign in to the workspace at least once before you can grant them access.', p_email;
  end if;

  if p_action = 'grant' then
    insert into public.brand_admins (user_id, brand_id, role, created_by)
    values (v_target, p_brand_id, p_role, v_actor)
    on conflict (user_id, brand_id) do update set role = excluded.role, updated_at = now();
  elsif p_action = 'update' then
    if p_role <> 'brand_admin' then
      select count(*) into v_admin_count from public.brand_admins
        where brand_id = p_brand_id and role = 'brand_admin' and user_id <> v_target;
      if v_admin_count = 0 and exists (
        select 1 from public.brand_admins
        where brand_id = p_brand_id and user_id = v_target and role = 'brand_admin'
      ) then
        raise exception 'Cannot demote the last brand admin of this brand';
      end if;
    end if;
    update public.brand_admins set role = p_role, updated_at = now()
      where brand_id = p_brand_id and user_id = v_target;
  elsif p_action = 'revoke' then
    select count(*) into v_admin_count from public.brand_admins
      where brand_id = p_brand_id and role = 'brand_admin' and user_id <> v_target;
    if v_admin_count = 0 and exists (
      select 1 from public.brand_admins
      where brand_id = p_brand_id and user_id = v_target and role = 'brand_admin'
    ) then
      raise exception 'Cannot remove the last brand admin of this brand';
    end if;
    delete from public.brand_admins where brand_id = p_brand_id and user_id = v_target;
  else
    raise exception 'Unknown action %', p_action;
  end if;

  insert into public.audit_logs (actor_id, brand_id, action, entity_type, entity_id, metadata)
  values (v_actor, p_brand_id, 'membership.' || p_action, 'brand_admins', v_target,
          jsonb_build_object('role', p_role, 'email', p_email));
end;
$$;

revoke all on function public.manage_brand_membership(text, uuid, text, text, uuid) from public, anon;
grant execute on function public.manage_brand_membership(text, uuid, text, text, uuid) to authenticated;

create or replace function public.bootstrap_admins(p_super_email text, p_brand_admin_email text, p_brand_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_super uuid;
  v_admin uuid;
  v_brand uuid;
begin
  select id into v_super from public.profiles where lower(email) = lower(p_super_email);
  if v_super is null then raise exception 'Super admin profile not found for %', p_super_email; end if;

  alter table public.profiles disable trigger trg_profiles_role_guard;
  update public.profiles set platform_role = 'super_admin' where id = v_super;
  alter table public.profiles enable trigger trg_profiles_role_guard;

  select id into v_admin from public.profiles where lower(email) = lower(p_brand_admin_email);
  if v_admin is null then raise exception 'Brand admin profile not found for %', p_brand_admin_email; end if;

  select id into v_brand from public.brands where slug = p_brand_slug;
  if v_brand is null then raise exception 'Brand not found for slug %', p_brand_slug; end if;

  insert into public.brand_admins (user_id, brand_id, role, created_by)
  values (v_admin, v_brand, 'brand_admin', v_super)
  on conflict (user_id, brand_id) do update set role = 'brand_admin', updated_at = now();

  return jsonb_build_object('super_admin_id', v_super, 'brand_admin_id', v_admin, 'brand_id', v_brand);
end; $$;

revoke all on function public.bootstrap_admins(text, text, text) from public, anon, authenticated;
grant execute on function public.bootstrap_admins(text, text, text) to service_role;
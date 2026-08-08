-- ── Identity ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  platform_role text not null default 'member' check (platform_role in ('super_admin','member')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- ── Structure ────────────────────────────────────────────────────────────────
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  slug text not null unique, name text not null,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index idx_brands_service_id on public.brands(service_id) where deleted_at is null;

-- ── Authorization ────────────────────────────────────────────────────────────
create table public.brand_admins (
  id uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid not null references public.brands(id)   on delete cascade,
  role text not null default 'brand_admin'
       check (role in ('viewer','editor','content_manager','moderator','brand_admin')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_id)
);
create index idx_brand_admins_user_id  on public.brand_admins(user_id);
create index idx_brand_admins_brand_id on public.brand_admins(brand_id);

-- ── Operational ──────────────────────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  client_name text not null, client_email text, starts_at timestamptz,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index idx_bookings_brand_id     on public.bookings(brand_id)         where deleted_at is null;
create index idx_bookings_brand_status on public.bookings(brand_id, status) where deleted_at is null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null default 'info', title text not null, body text, read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_brand_id on public.notifications(brand_id);
create index idx_notifications_unread   on public.notifications(brand_id) where read_at is null;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  event_name text not null, properties jsonb,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index idx_analytics_brand_time on public.analytics_events(brand_id, occurred_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null, created_at timestamptz not null default now(), deleted_at timestamptz
);
create index idx_messages_brand_time on public.messages(brand_id, created_at desc) where deleted_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  brand_id uuid references public.brands(id)   on delete set null,
  action text not null, entity_type text, entity_id uuid, metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_brand_id on public.audit_logs(brand_id);
create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_created  on public.audit_logs(created_at desc);

-- ── Required Data API grants (platform requirement; RLS still enforces access) ─
grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.services         to authenticated;
grant select, insert, update, delete on public.brands           to authenticated;
grant select, insert, update, delete on public.brand_admins     to authenticated;
grant select, insert, update, delete on public.bookings         to authenticated;
grant select, insert, update, delete on public.notifications    to authenticated;
grant select, insert, update, delete on public.analytics_events to authenticated;
grant select, insert, update, delete on public.messages         to authenticated;
grant select                          on public.audit_logs      to authenticated;
grant all on public.profiles, public.services, public.brands, public.brand_admins,
             public.bookings, public.notifications, public.analytics_events,
             public.messages, public.audit_logs to service_role;

-- ── Helper functions ─────────────────────────────────────────────────────────
create or replace function public.brand_role_rank(role text)
returns int language sql immutable as $$
  select case role
    when 'viewer' then 10 when 'editor' then 20 when 'content_manager' then 30
    when 'moderator' then 40 when 'brand_admin' then 50 else 0 end;
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles
    where id = (select auth.uid()) and platform_role = 'super_admin' and deleted_at is null);
$$;

create or replace function public.has_brand_access(target_brand_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from brand_admins
    where user_id = (select auth.uid()) and brand_id = target_brand_id);
$$;

create or replace function public.has_brand_role(target_brand_id uuid, min_role text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from brand_admins
    where user_id = (select auth.uid()) and brand_id = target_brand_id
      and brand_role_rank(role) >= brand_role_rank(min_role));
$$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_platform_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.platform_role is distinct from old.platform_role and not public.is_super_admin() then
    raise exception 'Only a super admin may change platform_role';
  end if;
  return new;
end; $$;
create trigger trg_profiles_role_guard before update on public.profiles
for each row execute function public.prevent_platform_role_escalation();

create trigger trg_profiles_updated     before update on public.profiles     for each row execute function public.set_updated_at();
create trigger trg_services_updated     before update on public.services     for each row execute function public.set_updated_at();
create trigger trg_brands_updated       before update on public.brands       for each row execute function public.set_updated_at();
create trigger trg_brand_admins_updated before update on public.brand_admins for each row execute function public.set_updated_at();
create trigger trg_bookings_updated     before update on public.bookings     for each row execute function public.set_updated_at();
create trigger trg_messages_updated     before update on public.messages     for each row execute function public.set_updated_at();

-- ── Enable RLS ───────────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.brands           enable row level security;
alter table public.brand_admins     enable row level security;
alter table public.bookings         enable row level security;
alter table public.notifications    enable row level security;
alter table public.analytics_events enable row level security;
alter table public.messages         enable row level security;
alter table public.audit_logs       enable row level security;

-- ── Policies: profiles ───────────────────────────────────────────────────────
create policy "profiles_select_self_or_admin" on public.profiles for select
  using ( id = (select auth.uid()) or is_super_admin() );
create policy "profiles_update_self" on public.profiles for update
  using ( id = (select auth.uid()) ) with check ( id = (select auth.uid()) );

-- ── Policies: brand_admins ───────────────────────────────────────────────────
create policy "brand_admins_select" on public.brand_admins for select
  using ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );
create policy "brand_admins_insert" on public.brand_admins for insert
  with check ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );
create policy "brand_admins_update" on public.brand_admins for update
  using ( is_super_admin() or has_brand_role(brand_id,'brand_admin') )
  with check ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );
create policy "brand_admins_delete" on public.brand_admins for delete
  using ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );

-- ── Policies: brands ─────────────────────────────────────────────────────────
create policy "brands_select" on public.brands for select
  using ( is_super_admin() or has_brand_access(id) );
create policy "brands_update" on public.brands for update
  using ( is_super_admin() or has_brand_role(id,'brand_admin') )
  with check ( is_super_admin() or has_brand_role(id,'brand_admin') );
create policy "brands_insert" on public.brands for insert with check ( is_super_admin() );
create policy "brands_delete" on public.brands for delete using ( is_super_admin() );

-- ── Policies: bookings ───────────────────────────────────────────────────────
create policy "bookings_select" on public.bookings for select
  using ( is_super_admin() or has_brand_access(brand_id) );
create policy "bookings_insert" on public.bookings for insert
  with check ( is_super_admin() or has_brand_role(brand_id,'editor') );
create policy "bookings_update" on public.bookings for update
  using ( is_super_admin() or has_brand_role(brand_id,'editor') )
  with check ( is_super_admin() or has_brand_role(brand_id,'editor') );
create policy "bookings_delete" on public.bookings for delete
  using ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );

-- ── Policies: notifications ──────────────────────────────────────────────────
create policy "notifications_select" on public.notifications for select
  using ( is_super_admin() or has_brand_access(brand_id) );
create policy "notifications_insert" on public.notifications for insert
  with check ( is_super_admin() or has_brand_role(brand_id,'editor') );
create policy "notifications_update" on public.notifications for update
  using ( is_super_admin() or has_brand_role(brand_id,'editor') )
  with check ( is_super_admin() or has_brand_role(brand_id,'editor') );
create policy "notifications_delete" on public.notifications for delete
  using ( is_super_admin() or has_brand_role(brand_id,'brand_admin') );

-- ── Policies: analytics_events ───────────────────────────────────────────────
create policy "analytics_select" on public.analytics_events for select
  using ( is_super_admin() or has_brand_access(brand_id) );
create policy "analytics_write" on public.analytics_events for all
  using ( is_super_admin() ) with check ( is_super_admin() );

-- ── Policies: messages ───────────────────────────────────────────────────────
create policy "messages_select" on public.messages for select
  using ( is_super_admin() or has_brand_access(brand_id) );
create policy "messages_insert" on public.messages for insert
  with check ( is_super_admin() or has_brand_role(brand_id,'editor') );
create policy "messages_update" on public.messages for update
  using ( is_super_admin() or has_brand_role(brand_id,'moderator') )
  with check ( is_super_admin() or has_brand_role(brand_id,'moderator') );
create policy "messages_delete" on public.messages for delete
  using ( is_super_admin() or has_brand_role(brand_id,'moderator') );

-- ── Policies: audit_logs ─────────────────────────────────────────────────────
create policy "audit_select" on public.audit_logs for select
  using ( is_super_admin() or (brand_id is not null and has_brand_role(brand_id,'brand_admin')) );

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.bookings, public.notifications, public.messages;

-- ── Seed: services + La Rosa View brand (§18.B) ──────────────────────────────
insert into public.services (slug, name) values
  ('education','Houcine.education'),
  ('studio','Houcine.studio'),
  ('tech','Houcine.tech'),
  ('management','Houcine.management')
on conflict (slug) do nothing;

insert into public.brands (service_id, slug, name)
select id, 'la-rosa-view', 'La Rosa View'
from public.services where slug = 'management'
on conflict (slug) do nothing;

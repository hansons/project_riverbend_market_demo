-- Riverbend Farmers Market — Lodestone capability demo
-- 0001: tenants, profiles, role helpers, sign-in trigger, Row-Level Security.
-- Run in the Supabase SQL editor (or `supabase db push`) in order, then 0002,
-- then seed.sql, then `npm run seed:users`.

-- ─── Roles ───────────────────────────────────────────────────────────
-- The four demo surfaces map 1:1 to these roles. RLS (below + in 0002)
-- enforces every boundary at the database, not in app code.
create type app_role as enum ('shopper', 'vendor', 'admin', 'superadmin');

-- ─── Tenants (powers the "this is a re-skinnable platform" story) ─────
-- Branding is data: ThemeProvider reads brand JSON into CSS variables, so the
-- Slice 4 super-admin view can flip the whole look by switching the active row.
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  tagline    text,
  region     text,
  brand      jsonb not null default '{}'::jsonb,  -- { primary, accent, berry, ink, paper, ... } as "R G B"
  is_active  boolean not null default false,      -- exactly one active at a time (demo convenience)
  created_at timestamptz not null default now()
);

-- ─── Profiles (one per auth user; role drives which surface they see) ──
-- Not hard-FK'd to auth.users so rows can be pre-seeded and linked on sign-in.
create table profiles (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  full_name  text not null,
  role       app_role not null default 'shopper',
  vendor_id  uuid,                                 -- FK added in 0002 (vendors not yet defined)
  created_at timestamptz not null default now()
);

-- ─── Permission helpers (security definer → bypass RLS, no recursion) ──
create or replace function is_admin() returns boolean
  language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function is_superadmin() returns boolean
  language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'superadmin'
  );
$$;

-- The vendor a signed-in vendor is bound to (null for everyone else).
create or replace function my_vendor_id() returns uuid
  language sql security definer set search_path = public stable as $$
  select vendor_id from profiles where id = auth.uid();
$$;

-- ─── On sign-in: create a shopper profile (demo personas get elevated by
-- the seed:users script). `on conflict` links a pre-seeded row if present. ─
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    'shopper'
  )
  on conflict (email) do update set id = excluded.id;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Row-Level Security ──────────────────────────────────────────────
alter table tenants  enable row level security;
alter table profiles enable row level security;

-- tenants: anyone may read the active brand; only the platform owner may write.
create policy tenants_select on tenants
  for select using (true);
create policy tenants_write on tenants
  for all to authenticated using (is_superadmin()) with check (is_superadmin());

-- profiles: you can read/update your own; admins (and the owner) see everyone.
create policy profiles_select on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_update on profiles
  for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

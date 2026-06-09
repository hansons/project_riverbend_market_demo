-- Riverbend Farmers Market — Lodestone capability demo
-- 0004: admin-portal additions (Slice 3). Announcements (→ public banner) and a
-- policy that lets anyone submit a vendor application (a pending vendor only).
--
-- Applications reuse the vendors table: a submission is a status='pending' vendor;
-- the admin queue is "vendors where status = pending"; approving flips it to
-- 'active' (and it appears publicly), declining flips it to 'suspended'.

-- ─── Announcements (broadcast banner) ────────────────────────────────
create type announcement_audience as enum ('public', 'vendors', 'all');

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  audience   announcement_audience not null default 'public',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

-- Anyone can read active announcements; admins see/manage all.
create policy announcements_select on announcements for select
  using (active or is_admin());
create policy announcements_write on announcements for all to authenticated
  using (is_admin()) with check (is_admin());

-- ─── Public vendor applications ──────────────────────────────────────
-- Let anyone submit an application, but ONLY as a pending vendor — they can't
-- insert an active (publicly-listed) vendor. Admins keep their full-write policy.
create policy vendors_apply on vendors for insert to anon, authenticated
  with check (status = 'pending');

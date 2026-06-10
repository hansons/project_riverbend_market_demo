-- Riverbend Farmers Market — Lodestone capability demo
-- 0012: schedule the home-page spotlight. The admin can pin specific vendors to
-- specific weeks; a scheduled week overrides the automatic weekly rotation of
-- the starred pool, and unscheduled weeks fall back to that rotation.
--
-- Self-contained: creates the table, RLS, and seeds one sample week. (The
-- "Reset demo" loader doesn't touch it; re-run this file to restore the sample.)

create table featured_schedule (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  week_of    date not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, week_of)
);
create index featured_schedule_week_idx on featured_schedule(week_of);

alter table featured_schedule enable row level security;
create policy featured_schedule_select on featured_schedule for select using (true);
create policy featured_schedule_write on featured_schedule for all to authenticated
  using (is_admin()) with check (is_admin());

-- Sample: spotlight three vendors for the week of Jun 13 (distinct from the
-- starred-pool rotation, so the override is visible on the home page).
insert into featured_schedule (vendor_id, week_of) values
  ('a0000000-0000-4000-8000-000000000003', '2026-06-13'),
  ('a0000000-0000-4000-8000-000000000007', '2026-06-13'),
  ('a0000000-0000-4000-8000-000000000016', '2026-06-13')
on conflict (vendor_id, week_of) do nothing;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0020: market-day attendance. Staff record the ACTUAL headcount for each market
-- day (manual entry, helped by proxy hints in the UI — token issuance volume and
-- confirmed-vendor count). A transparent forecast (computed client-side) blends
-- same-week-last-year + recent average with vendor / event / special-date nudges.
--
-- market_id is stored as a plain uuid (NO foreign key): the reset loader (0007)
-- does `delete from markets`, so a cascade FK would wipe attendance; the seeded
-- market UUIDs are stable, so a bare uuid stays valid across a reset. Key on
-- (market_id, market_date). Self-contained: reset loader untouched; re-run to restore.

create table market_day_stats (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid,                       -- stable seeded market UUID; no FK (reset-safe)
  market_date date not null,
  attendance  int,                        -- the recorded actual headcount (null until entered)
  method      text,                       -- 'clicker' | 'estimate' | 'parking' | 'other'
  weather     text,
  notes       text,
  recorded_by text,
  created_at  timestamptz not null default now(),
  unique (market_id, market_date)
);
create index market_day_stats_date_idx on market_day_stats(market_date);

alter table market_day_stats enable row level security;
-- Admin-only: staff record and review attendance.
create policy market_day_stats_select on market_day_stats for select to authenticated using (is_admin());
create policy market_day_stats_write  on market_day_stats for all to authenticated
  using (is_admin()) with check (is_admin());

-- ─── Seed: a season of Saturday actuals (incl. 2025 for the year-over-year
-- signal) and a few Wednesdays, anchored around 2026-06-10. ───
insert into market_day_stats (id, market_id, market_date, attendance, method, weather) values
  -- Saturday market (…0001)
  ('88880000-0000-4000-8000-000000000001','22220000-0000-4000-8000-000000000001','2025-06-07', 520, 'clicker',  'Sunny'),
  ('88880000-0000-4000-8000-000000000002','22220000-0000-4000-8000-000000000001','2025-06-14', 545, 'clicker',  'Sunny'),
  ('88880000-0000-4000-8000-000000000003','22220000-0000-4000-8000-000000000001','2026-05-16', 470, 'estimate', 'Cloudy'),
  ('88880000-0000-4000-8000-000000000004','22220000-0000-4000-8000-000000000001','2026-05-23', 495, 'clicker',  'Sunny'),
  ('88880000-0000-4000-8000-000000000005','22220000-0000-4000-8000-000000000001','2026-05-30', 510, 'clicker',  'Sunny'),
  ('88880000-0000-4000-8000-000000000006','22220000-0000-4000-8000-000000000001','2026-06-06', 535, 'clicker',  'Sunny'),
  -- Wednesday market (…0002)
  ('88880000-0000-4000-8000-000000000007','22220000-0000-4000-8000-000000000002','2025-06-04', 170, 'estimate', 'Sunny'),
  ('88880000-0000-4000-8000-000000000008','22220000-0000-4000-8000-000000000002','2026-05-27', 185, 'estimate', 'Cloudy'),
  ('88880000-0000-4000-8000-000000000009','22220000-0000-4000-8000-000000000002','2026-06-03', 195, 'clicker',  'Sunny')
on conflict (id) do nothing;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0025: owner-controlled market configuration. The platform OWNER (superadmin)
-- owns each market's key details and its default satellite location, so a Market
-- Admin can't repurpose a deployment to a different place and break the map.
--   • market_settings: per-market default map center (satellite). Reset-safe
--     (plain market_id, no FK — the reset loader never touches it).
--   • markets: tighten write from is_admin() to is_superadmin() (owner only).
-- Idempotent so it can be re-run safely.

create table if not exists market_settings (
  market_id  uuid primary key,            -- stable seeded market UUID; no FK (reset-safe)
  center_lat double precision,
  center_lng double precision,
  updated_at timestamptz not null default now()
);

alter table market_settings enable row level security;

-- Public read (shoppers/vendors see the map); only the owner sets the location.
drop policy if exists market_settings_select on market_settings;
create policy market_settings_select on market_settings for select using (true);

drop policy if exists market_settings_write on market_settings;
create policy market_settings_write on market_settings for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- Market key details (name, location, hours, …) become owner-managed too.
drop policy if exists markets_write on markets;
create policy markets_write on markets for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

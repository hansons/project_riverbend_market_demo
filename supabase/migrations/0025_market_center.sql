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
  zoom       double precision,            -- owner-set satellite zoom (null → maps fit to stalls)
  aspect     text not null default 'landscape',   -- 'landscape' | 'portrait' | 'square' (satellite map shape)
  is_active  boolean not null default false,      -- the front-page / active market (one true at a time)
  updated_at timestamptz not null default now()
);
-- For tables created by an earlier copy of this migration:
alter table market_settings add column if not exists aspect text not null default 'landscape';
alter table market_settings add column if not exists zoom double precision;
alter table market_settings add column if not exists is_active boolean not null default false;

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

-- Make the Winter market the active/front-page market, pointed at the Corvallis
-- Indoor Winter Market venue: Guerber Hall, Benton County Fairgrounds (110 SW 53rd
-- St). Coords approximate — fine-tune the pin in Owner → Markets. Clear any prior
-- active flag first so exactly one market is active. do-update re-applies on re-run.
update market_settings set is_active = false;
insert into market_settings (market_id, center_lat, center_lng, zoom, aspect, is_active)
values ('22220000-0000-4000-8000-000000000003', 44.5646, -123.3093, 18, 'landscape', true)
on conflict (market_id) do update set
  center_lat = excluded.center_lat,
  center_lng = excluded.center_lng,
  zoom = excluded.zoom,
  is_active = true,
  updated_at = now();

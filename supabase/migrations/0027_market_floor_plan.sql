-- 0027: per-market floor plan image for indoor / non-satellite venues.
-- Stored on market_settings (one row per market). When floor_plan_url is set,
-- the stall map switches from Esri satellite tiles to a Simple-CRS image overlay
-- and stall positions are stored as pixel coordinates (lat=y, lng=x).

alter table market_settings add column if not exists floor_plan_url text;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0013: products can carry a season (months) so they flip in/out of season
-- automatically. When season_months is set, in-season is computed from the
-- current month; when empty, the manual in_season flag still applies.
--
-- Run order on an existing project: this file, then RE-RUN 0007 (updates
-- _load_demo_data to set sample product seasons), then re-run seed.sql.
-- Fresh installs get the column straight from 0002, so this no-ops.

alter table vendor_products add column if not exists season_months int[] not null default '{}';

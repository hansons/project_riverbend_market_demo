-- Riverbend Farmers Market — Lodestone capability demo
-- 0026: vendor market eligibility — which markets a vendor is approved for.
--
-- market_ids uuid[] on vendors:
--   empty array (default) = eligible for all markets
--   one or more UUIDs     = eligible only for those markets
--
-- The stall-assignment UI filters "Add a vendor" to market-eligible vendors,
-- so an admin scheduling the Indoor Winter Market doesn't see summer-only
-- vendors (flowers, orchards, outdoor services) in their picker.
--
-- Idempotent — safe to re-run.

alter table vendors add column if not exists market_ids uuid[] not null default '{}';

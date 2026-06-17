-- Riverbend Farmers Market — Lodestone capability demo
-- 0023: stalls can be disabled (kept in the layout but out of service / not
-- assignable) in addition to being added/removed. Adding a column is idempotent
-- and safe to re-run; existing stalls default to enabled.

alter table market_stalls add column if not exists disabled boolean not null default false;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0024: stalls can carry a category / zone (e.g. Produce, Prepared Foods, Service)
-- so the layout can be organized by type. Optional, free-text. Idempotent.

alter table market_stalls add column if not exists category text;

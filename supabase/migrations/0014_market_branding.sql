-- Riverbend Farmers Market — Lodestone capability demo
-- 0014: the market admin can set a logo and favicon. Stored as public WebP URLs
-- on the active tenant row; the images live in the existing vendor-photos bucket
-- under a market/ folder (admins may already write any path there, per 0006).
--
-- Self-contained: just two nullable columns. No re-seed needed — the admin
-- uploads via Appearance, and tenants_update_admin (0008) already allows it.

alter table tenants add column if not exists logo_url text;
alter table tenants add column if not exists favicon_url text;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0015: the market admin can set a hero banner image (shown behind the home-page
-- headline). Stored like the logo/favicon — a public WebP URL on the tenant row.
-- Self-contained: one nullable column, no re-seed.

alter table tenants add column if not exists banner_url text;

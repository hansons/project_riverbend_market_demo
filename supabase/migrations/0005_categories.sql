-- Riverbend Farmers Market — Lodestone capability demo
-- 0005: managed product categories with a vendor → admin request flow.
--
-- Vendors pick a product category from an approved list; if they need a new one
-- they request it (status='pending'), which lands in the admin's Categories
-- queue. Approving flips it to 'active' and it becomes available to everyone.

create type category_status as enum ('active', 'pending');

create table product_categories (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  status       category_status not null default 'pending',
  requested_by uuid references vendors(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table product_categories enable row level security;

-- Read: active categories are visible to everyone; a pending request is visible
-- to admins and to the vendor who asked for it.
create policy product_categories_select on product_categories for select
  using (status = 'active' or is_admin() or requested_by = my_vendor_id());

-- A vendor may request a new category — only as 'pending', tied to themselves.
create policy product_categories_request on product_categories for insert to authenticated
  with check (status = 'pending' and requested_by = my_vendor_id());

-- Admins approve / rename / remove categories.
create policy product_categories_admin on product_categories for all to authenticated
  using (is_admin()) with check (is_admin());

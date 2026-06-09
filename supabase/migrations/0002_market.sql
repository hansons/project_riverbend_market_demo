-- Riverbend Farmers Market — Lodestone capability demo
-- 0002: the market domain that powers the public/shopper surface (Slice 1):
-- markets, vendors, what-they-sell, and seasonality ("what's in season").

create type vendor_status as enum ('pending', 'active', 'suspended');

-- ─── Markets (the recurring market days/locations) ───────────────────
create table markets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  day_of_week text not null,        -- 'Saturday', 'Wednesday'
  season      text not null,        -- 'Year-round', 'April–November'
  hours       text not null,        -- '9am – 1pm'
  location    text not null,
  blurb       text,
  sort        int not null default 0
);

-- ─── Vendors (the farms/makers) ──────────────────────────────────────
create table vendors (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  category    text not null,        -- 'Produce', 'Bakery', 'Flowers', ...
  tagline     text,
  story       text,
  town        text,                 -- 'Philomath, OR'
  practices   text[] not null default '{}',   -- ['Certified Organic', 'No-spray']
  market_days text[] not null default '{}',   -- ['Saturday', 'Wednesday']
  image_url   text,
  email       text,
  status      vendor_status not null default 'active',
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index vendors_status_idx on vendors(status);

-- Now that vendors exists, bind profiles.vendor_id to it.
alter table profiles
  add constraint profiles_vendor_fk
  foreign key (vendor_id) references vendors(id)
  on update cascade on delete set null;

-- ─── What a vendor sells (their stand list) ──────────────────────────
create table vendor_products (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  name       text not null,
  category   text,
  unit       text,                  -- 'bunch', 'lb', 'pint'
  price_cents int,
  in_season  boolean not null default true,
  sort       int not null default 0
);
create index vendor_products_vendor_idx on vendor_products(vendor_id);

-- ─── Seasonality ("what's in season this week") ──────────────────────
create table seasonality (
  id       uuid primary key default gen_random_uuid(),
  item     text not null,
  category text not null,           -- 'Vegetable', 'Fruit', 'Herb'
  emoji    text,
  status   text not null default 'peak',   -- 'peak', 'coming', 'ending'
  months   int[] not null default '{}',    -- [5,6,7]
  note     text,
  sort     int not null default 0
);

-- ─── Row-Level Security ──────────────────────────────────────────────
-- The shopper surface is browsed by anon (no login), so reads are public.
-- Writes are scoped: a vendor edits only their own rows; admins edit all.
alter table markets         enable row level security;
alter table vendors         enable row level security;
alter table vendor_products enable row level security;
alter table seasonality     enable row level security;

-- markets: public read; admin write.
create policy markets_select on markets for select using (true);
create policy markets_write  on markets for all to authenticated
  using (is_admin()) with check (is_admin());

-- vendors: public sees active vendors; a vendor always sees their own row
-- (even while pending/suspended); admins see everyone.
create policy vendors_select on vendors for select using (
  status = 'active' or id = my_vendor_id() or is_admin()
);
create policy vendors_update_own on vendors for update to authenticated
  using (id = my_vendor_id() or is_admin())
  with check (id = my_vendor_id() or is_admin());
create policy vendors_admin_write on vendors for all to authenticated
  using (is_admin()) with check (is_admin());

-- vendor_products: visible when the parent vendor is visible; vendor manages
-- own; admin manages all.
create policy vendor_products_select on vendor_products for select using (
  exists (
    select 1 from vendors v
    where v.id = vendor_id
      and (v.status = 'active' or v.id = my_vendor_id() or is_admin())
  )
);
create policy vendor_products_manage on vendor_products for all to authenticated
  using (vendor_id = my_vendor_id() or is_admin())
  with check (vendor_id = my_vendor_id() or is_admin());

-- seasonality: public read; admin write.
create policy seasonality_select on seasonality for select using (true);
create policy seasonality_write  on seasonality for all to authenticated
  using (is_admin()) with check (is_admin());

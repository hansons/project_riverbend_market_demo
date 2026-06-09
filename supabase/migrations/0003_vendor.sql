-- Riverbend Farmers Market — Lodestone capability demo
-- 0003: the vendor-portal domain (Slice 2). Weekly offerings, market dates +
-- per-vendor schedule, fees, and the vendor↔staff message thread.
--
-- The RLS here is the heart of the vendor portal's story: a signed-in vendor can
-- only ever read or write rows tied to their own vendor_id; admins see all.

create type schedule_status as enum ('confirmed', 'declined', 'pending');
create type fee_status      as enum ('due', 'paid', 'waived');
create type message_sender  as enum ('vendor', 'admin');

-- ─── Weekly "what I have" offerings ──────────────────────────────────
create table vendor_offerings (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  week_of    date not null,
  headline   text,
  items      text[] not null default '{}',
  note       text,
  photo_url  text,
  created_at timestamptz not null default now()
);
create index vendor_offerings_vendor_idx on vendor_offerings(vendor_id);

-- ─── Market dates + each vendor's commitment to them ─────────────────
create table market_dates (
  id        uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets(id) on delete cascade,
  date      date not null,
  label     text,
  sort      int not null default 0
);
create index market_dates_date_idx on market_dates(date);

create table vendor_schedule (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid not null references vendors(id) on delete cascade,
  market_date_id uuid not null references market_dates(id) on delete cascade,
  status         schedule_status not null default 'pending',
  stall          text,                    -- assigned by admin (Slice 3)
  note           text,
  unique (vendor_id, market_date_id)
);
create index vendor_schedule_vendor_idx on vendor_schedule(vendor_id);

-- ─── Fees / invoices ─────────────────────────────────────────────────
create table fees (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  period      text not null,
  description text,
  amount_cents int not null default 0,
  status      fee_status not null default 'due',
  due_date    date,
  created_at  timestamptz not null default now()
);
create index fees_vendor_idx on fees(vendor_id);

-- ─── Vendor ↔ market-staff messages (one thread per vendor) ─────────
-- Sender is recorded as a role + display name (no FK to profiles) so the
-- thread is simple to seed and survives the demo personas being re-created.
create table messages (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  sender      message_sender not null,
  author_name text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index messages_vendor_idx on messages(vendor_id);

-- ─── Row-Level Security ──────────────────────────────────────────────
alter table vendor_offerings enable row level security;
alter table market_dates     enable row level security;
alter table vendor_schedule  enable row level security;
alter table fees             enable row level security;
alter table messages         enable row level security;

-- offerings: public read (can surface on vendor pages); vendor manages own; admin all.
create policy vendor_offerings_select on vendor_offerings for select using (true);
create policy vendor_offerings_manage on vendor_offerings for all to authenticated
  using (vendor_id = my_vendor_id() or is_admin())
  with check (vendor_id = my_vendor_id() or is_admin());

-- market dates: public read; admin write.
create policy market_dates_select on market_dates for select using (true);
create policy market_dates_write  on market_dates for all to authenticated
  using (is_admin()) with check (is_admin());

-- schedule: a vendor sees + sets only their own commitments; admin sees/sets all.
create policy vendor_schedule_select on vendor_schedule for select to authenticated
  using (vendor_id = my_vendor_id() or is_admin());
create policy vendor_schedule_write on vendor_schedule for all to authenticated
  using (vendor_id = my_vendor_id() or is_admin())
  with check (vendor_id = my_vendor_id() or is_admin());

-- fees: a vendor reads only their own; only admins create/modify them.
create policy fees_select on fees for select to authenticated
  using (vendor_id = my_vendor_id() or is_admin());
create policy fees_write on fees for all to authenticated
  using (is_admin()) with check (is_admin());

-- messages: only the vendor on the thread (and admins) can read or post.
create policy messages_select on messages for select to authenticated
  using (vendor_id = my_vendor_id() or is_admin());
create policy messages_insert on messages for insert to authenticated
  with check (vendor_id = my_vendor_id() or is_admin());

-- Riverbend Farmers Market — Lodestone capability demo
-- 0021: Web Push subscriptions. Each row is one browser/device a vendor has opted
-- in from (endpoint + the two encryption keys the push protocol needs). The
-- send-push Edge Function reads these with the service-role key and posts to the
-- browser push services; dead endpoints (404/410) are pruned on send.
--
-- Operational table — no seed. Self-contained: FKs only vendors (upserted), so a
-- "Reset demo" leaves it alone.

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,                                  -- the subscribing profile (auth.uid())
  vendor_id  uuid references vendors(id) on delete cascade,  -- which vendor to target (the subscriber's own)
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_vendor_idx on push_subscriptions(vendor_id);

alter table push_subscriptions enable row level security;

-- A subscriber reads/manages only their own device rows; admins may read all.
-- The send-push function uses the service-role key, so it bypasses RLS to deliver.
create policy push_subscriptions_select on push_subscriptions for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy push_subscriptions_manage on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

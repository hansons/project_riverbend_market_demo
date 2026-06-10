-- Riverbend Farmers Market — Lodestone capability demo
-- 0018: EBT/SNAP, Double Up Food Bucks, WIC/FMNP, and market-scrip TOKEN tracking
-- and reconciliation — NOT card processing (online EBT is closed to small markets
-- by FNS rules). Market-level issuance vs. per-vendor redemption, plus a
-- reconciliation view (issued / redeemed / outstanding float / owed to vendors).
--
-- Token rows store the calendar `market_date` directly and do NOT foreign-key
-- market_dates: the reset loader (0007) does `delete from market_dates` on every
-- run, so a cascade FK would silently wipe tokens on "Reset demo". Keying on the
-- date is also the natural grain for reconciliation, and is reset-proof.
--
-- Self-contained: tables, RLS, a reimbursement guard, the reconciliation view, and
-- sample issuance/redemption rows. Reset loader leaves it alone (FKs only vendors,
-- which are upserted); re-run this file to restore the samples.

create table token_currencies (
  code     text primary key,                          -- 'snap','dufb','wic_fmnp','market_scrip'
  label    text not null,
  match_of text references token_currencies(code),     -- dufb match_of = 'snap'
  active   boolean not null default true,
  sort     int not null default 0
);

-- Market-level issuance (one EBT terminal at the market booth). Admin-only.
create table token_issuance (
  id           uuid primary key default gen_random_uuid(),
  market_date  date not null,
  currency     text not null references token_currencies(code),
  amount_cents int not null default 0,
  token_count  int not null default 0,
  created_at   timestamptz not null default now()
);
create index token_issuance_date_idx on token_issuance(market_date);

-- Per-vendor redemption. Vendors self-report their own; admins enter/edit any
-- ("walking the market with the app"). recorded_by is a role/name (no FK), like
-- messages.author_name.
create table token_redemption (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references vendors(id) on delete cascade,
  market_date   date not null,
  currency      text not null references token_currencies(code),
  amount_cents  int not null default 0,
  token_count   int not null default 0,
  reimbursed    boolean not null default false,
  reimbursed_at timestamptz,
  recorded_by   text,
  created_at    timestamptz not null default now()
);
create index token_redemption_vendor_idx on token_redemption(vendor_id);
create index token_redemption_date_idx   on token_redemption(market_date);

alter table token_currencies enable row level security;
alter table token_issuance   enable row level security;
alter table token_redemption enable row level security;

-- currencies: authenticated read active; admin write.
create policy token_currencies_select on token_currencies for select to authenticated
  using (active or is_admin());
create policy token_currencies_write on token_currencies for all to authenticated
  using (is_admin()) with check (is_admin());

-- issuance: market-level — admin-only read & write.
create policy token_issuance_select on token_issuance for select to authenticated using (is_admin());
create policy token_issuance_write  on token_issuance for all to authenticated
  using (is_admin()) with check (is_admin());

-- redemption: a vendor self-reports own; admins enter/edit any (the established idiom).
create policy token_redemption_select on token_redemption for select to authenticated
  using (vendor_id = my_vendor_id() or is_admin());
create policy token_redemption_manage on token_redemption for all to authenticated
  using (vendor_id = my_vendor_id() or is_admin())
  with check (vendor_id = my_vendor_id() or is_admin());

-- ─── Reimbursement guard ─────────────────────────────────────────────
-- Vendors record redemptions but may never mark them reimbursed; admins can, and
-- the timestamp is auto-stamped/cleared. A null auth.uid() is a trusted context
-- (service role / migration / seed), so it follows the admin path.
create or replace function guard_token_reimbursement() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if is_admin() or auth.uid() is null then
    if tg_op = 'INSERT' then
      new.reimbursed_at := case when new.reimbursed then coalesce(new.reimbursed_at, now()) else null end;
    elsif tg_op = 'UPDATE' then
      if new.reimbursed and not old.reimbursed then
        new.reimbursed_at := coalesce(new.reimbursed_at, now());
      elsif not new.reimbursed then
        new.reimbursed_at := null;
      end if;
    end if;
  else
    if tg_op = 'INSERT' then
      new.reimbursed := false;
      new.reimbursed_at := null;
    elsif tg_op = 'UPDATE'
      and (new.reimbursed is distinct from old.reimbursed
        or new.reimbursed_at is distinct from old.reimbursed_at) then
      raise exception 'Only market staff can mark a redemption reimbursed.';
    end if;
  end if;
  return new;
end $$;

create trigger token_redemption_reimburse_guard
  before insert or update on token_redemption
  for each row execute function guard_token_reimbursement();

-- ─── Reconciliation view (issued vs redeemed vs outstanding, per date+currency) ──
-- security_invoker keeps base-table RLS in force; since issuance is admin-only,
-- this view is effectively an admin report (correct — reconciliation is staff-side).
create or replace view token_reconciliation as
with iss as (
  select market_date, currency,
         sum(amount_cents) as issued_cents, sum(token_count) as issued_tokens
  from token_issuance group by 1, 2
),
red as (
  select market_date, currency,
         sum(amount_cents) as redeemed_cents,
         sum(token_count)  as redeemed_tokens,
         coalesce(sum(amount_cents) filter (where reimbursed), 0) as reimbursed_cents
  from token_redemption group by 1, 2
)
select
  coalesce(iss.market_date, red.market_date) as market_date,
  coalesce(iss.currency, red.currency)       as currency,
  c.label    as currency_label,
  c.match_of as match_of,
  coalesce(iss.issued_cents, 0)                                   as issued_cents,
  coalesce(red.redeemed_cents, 0)                                 as redeemed_cents,
  coalesce(iss.issued_cents, 0) - coalesce(red.redeemed_cents, 0) as outstanding_cents,
  coalesce(red.reimbursed_cents, 0)                               as reimbursed_cents,
  coalesce(red.redeemed_cents, 0) - coalesce(red.reimbursed_cents, 0) as owed_to_vendors_cents
from iss
full outer join red on red.market_date = iss.market_date and red.currency = iss.currency
left join token_currencies c on c.code = coalesce(iss.currency, red.currency);

alter view token_reconciliation set (security_invoker = true);

-- ─── Seed (self-contained) ───────────────────────────────────────────
insert into token_currencies (code, label, match_of, sort) values
  ('snap',         'SNAP / EBT',                   null,   1),
  ('dufb',         'Double Up Food Bucks',         'snap', 2),
  ('wic_fmnp',     'WIC Farm Direct (FMNP)',       null,   3),
  ('market_scrip', 'Market Scrip / Wooden Tokens', null,   4)
on conflict (code) do nothing;

-- Issuance on the two most recent seeded market days (Jun 6 Sat, Jun 13 Sat).
insert into token_issuance (id, market_date, currency, amount_cents, token_count) values
  ('66660000-0000-4000-8000-000000000001','2026-06-06','snap', 42000, 84),
  ('66660000-0000-4000-8000-000000000002','2026-06-06','dufb', 21000, 42),
  ('66660000-0000-4000-8000-000000000003','2026-06-13','snap', 38500, 77),
  ('66660000-0000-4000-8000-000000000004','2026-06-13','dufb', 19000, 38)
on conflict (id) do nothing;

-- Redemptions across produce/berry vendors; sum < issuance so outstanding is non-zero.
insert into token_redemption (id, vendor_id, market_date, currency, amount_cents, token_count, reimbursed, recorded_by) values
  ('77770000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','2026-06-06','snap',  9500, 19, true,  'Dana — Market Manager'),
  ('77770000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000013','2026-06-06','snap', 12000, 24, true,  'Dana — Market Manager'),
  ('77770000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000013','2026-06-06','dufb',  6000, 12, false, 'Blue Mountain Berries'),
  ('77770000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','2026-06-13','snap',  7000, 14, false, 'Fern Hollow Farm'),
  ('77770000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000009','2026-06-13','dufb',  3500,  7, false, 'Cobblestone Gardens')
on conflict (id) do nothing;

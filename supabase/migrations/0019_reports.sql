-- Riverbend Farmers Market — Lodestone capability demo
-- 0019: admin reporting views + a compliance-rate RPC, powering the Reports
-- surface and its one-click CSV exports. Read-only, built entirely on existing
-- tables (no sales capture — payments are deferred). The front-end pipes rows
-- into the client-side CSV utilities, so there is no server-side CSV here.
--
-- Self-contained: only views + one function, no data; the reset loader is
-- unaffected. All views use security_invoker so existing RLS governs visibility
-- (in practice these are read in the admin surface, where the admin sees all).

-- ─── EBT / SNAP / Double Up ──────────────────────────────────────────
-- Per-redemption detail (the grant-ready CSV export joins names + labels here).
create or replace view report_token_redemptions as
select
  r.id, r.market_date, r.currency, c.label as currency_label,
  r.vendor_id, v.name as vendor_name,
  r.token_count, r.amount_cents, r.reimbursed, r.reimbursed_at
from token_redemption r
join token_currencies c on c.code = r.currency
join vendors v on v.id = r.vendor_id;
alter view report_token_redemptions set (security_invoker = true);

-- Rollup per currency across all dates (the grant report header line).
create or replace view report_token_by_currency as
select
  currency, currency_label,
  sum(issued_cents)          as issued_cents,
  sum(redeemed_cents)        as redeemed_cents,
  sum(outstanding_cents)     as outstanding_cents,
  sum(reimbursed_cents)      as reimbursed_cents,
  sum(owed_to_vendors_cents) as owed_to_vendors_cents
from token_reconciliation
group by currency, currency_label;
alter view report_token_by_currency set (security_invoker = true);

-- ─── Document compliance ─────────────────────────────────────────────
-- Per active vendor: how many REQUIRED doc types they hold a currently-valid
-- (non-expired) document for, and whether that covers all required types.
create or replace view report_doc_compliance as
with req as (
  select code from doc_types where required and active
),
valid_docs as (
  select distinct vd.vendor_id, vd.doc_type
  from vendor_documents vd
  join req r on r.code = vd.doc_type
  where vd.expires_date is null or vd.expires_date >= current_date
)
select
  v.id   as vendor_id,
  v.name as vendor_name,
  (select count(*) from req)                            as required_count,
  count(vdoc.doc_type)                                  as valid_required_count,
  (count(vdoc.doc_type) >= (select count(*) from req))  as is_compliant
from vendors v
left join valid_docs vdoc on vdoc.vendor_id = v.id
where v.status = 'active'
group by v.id, v.name;
alter view report_doc_compliance set (security_invoker = true);

-- Scalar market-wide compliance %. security definer (so it sees every vendor),
-- guarded to admins — mirrors the reset_demo() guard pattern in 0007.
create or replace function doc_compliance_rate() returns numeric
  language plpgsql security definer set search_path = public stable as $$
declare rate numeric;
begin
  if not is_admin() then
    raise exception 'Only market staff can read the compliance rate.';
  end if;
  select case when count(*) = 0 then 0
              else round(100.0 * count(*) filter (where is_compliant) / count(*), 1) end
    into rate from report_doc_compliance;
  return rate;
end $$;
revoke all on function doc_compliance_rate() from public;
grant execute on function doc_compliance_rate() to authenticated;

-- ─── Fee status / aging (payments deferred → status is admin-set manually) ──
create or replace view report_fee_aging as
select
  f.id, f.vendor_id, v.name as vendor_name, f.period, f.description,
  f.amount_cents, f.status, f.due_date,
  case
    when f.status <> 'due'                      then f.status::text
    when f.due_date is null                     then 'current'
    when f.due_date >= current_date             then 'current'
    when f.due_date >= current_date - 30        then '1-30'
    when f.due_date >= current_date - 60        then '31-60'
    else                                             '60+'
  end as aging_bucket
from fees f
join vendors v on v.id = f.vendor_id;
alter view report_fee_aging set (security_invoker = true);

-- ─── Attendance / fill-rate ──────────────────────────────────────────
-- No real check-in field exists; vendor_schedule.status records COMMITMENT, so
-- "no-show" is approximated as the decline rate. Add an `attended` flag later for
-- true attendance.
create or replace view report_attendance as
select
  md.id   as market_date_id,
  md.date as market_date,
  m.name  as market_name,
  count(*) filter (where vs.status = 'confirmed') as confirmed,
  count(*) filter (where vs.status = 'declined')  as declined,
  count(*) filter (where vs.status = 'pending')   as pending,
  count(vs.id)                                     as committed,
  round(100.0 * count(*) filter (where vs.status = 'confirmed') / nullif(count(vs.id), 0), 1) as fill_rate_pct,
  round(100.0 * count(*) filter (where vs.status = 'declined')  / nullif(count(vs.id), 0), 1) as decline_rate_pct
from market_dates md
join markets m on m.id = md.market_id
left join vendor_schedule vs on vs.market_date_id = md.id
group by md.id, md.date, m.name;
alter view report_attendance set (security_invoker = true);

-- ─── Vendor mix (by category & status) ───────────────────────────────
create or replace view report_vendor_mix as
select
  category,
  count(*)                                    as total,
  count(*) filter (where status = 'active')    as active,
  count(*) filter (where status = 'pending')   as pending,
  count(*) filter (where status = 'suspended') as suspended
from vendors
group by category;
alter view report_vendor_mix set (security_invoker = true);

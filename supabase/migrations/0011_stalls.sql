-- Riverbend Farmers Market — Lodestone capability demo
-- 0011: vendors can hold more than one stall. Convert vendor_schedule.stall
-- (single text) → stalls text[] on an already-provisioned database.
--
-- Idempotent + one-time: once `stall` is dropped, re-running is a safe no-op.
-- Run order on an existing project: this file, then RE-RUN 0007 (create-or-replace
-- updates _load_demo_data to the stalls[] version), then re-run seed.sql.
-- Fresh installs get stalls[] straight from 0003, so the guards below no-op.

alter table vendor_schedule add column if not exists stalls text[] not null default '{}';

-- Backfill only while the old `stall` column still exists, so a re-run can't error.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_schedule' and column_name = 'stall'
  ) then
    update vendor_schedule
      set stalls = regexp_split_to_array(btrim(stall), '\s+')
      where stall is not null and btrim(stall) <> '' and stalls = '{}';
  end if;
end $$;

alter table vendor_schedule drop column if exists stall;

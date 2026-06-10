-- Riverbend Farmers Market — Lodestone capability demo
-- 0010: the market map. Shoppers need to see WHERE a vendor is, so allow public
-- read of *confirmed* stall assignments for *active* vendors. Vendors still see
-- their own full schedule (incl. pending/declined) via the existing policy; the
-- map exposes only the public "who's at which stall" facts.

create policy vendor_schedule_public on vendor_schedule for select using (
  status = 'confirmed'
  and exists (select 1 from vendors v where v.id = vendor_id and v.status = 'active')
);

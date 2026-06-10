-- Riverbend Farmers Market — demo seed
-- Run AFTER migrations 0001–0007, and BEFORE `npm run seed:users`.
--
-- The demo data lives in _load_demo_data() (migration 0007) — the same function
-- the Platform Owner's "Reset demo" button calls — so there's one source of truth.
-- This seed loads the tenants (config) and then calls it. Re-running is safe.

begin;

-- Two brands so the Slice 4 super-admin view can re-skin the whole app live.
-- Brand colors are "R G B" triplets consumed by ThemeProvider as CSS vars.
insert into tenants (id, slug, name, tagline, region, is_active, brand) values
  ('11110000-0000-4000-8000-000000000001', 'riverbend',
   'Riverbend Farmers Market', 'Grown nearby. Picked this morning.', 'Willamette Valley, OR',
   true,
   '{"primary":"47 93 58","primary-dark":"36 74 46","accent":"224 165 38","berry":"181 83 42","ink":"42 38 32","paper":"251 247 239","card":"255 255 255","muted":"107 99 84","line":"231 222 201"}'::jsonb),
  ('11110000-0000-4000-8000-000000000002', 'cascade',
   'Cascade Growers Market', 'From the foothills to your table.', 'Central Cascades, OR',
   false,
   '{"primary":"30 92 110","primary-dark":"22 67 79","accent":"232 115 46","berry":"122 79 163","ink":"31 41 51","paper":"244 247 248","card":"255 255 255","muted":"91 107 115","line":"220 230 233"}'::jsonb)
on conflict (id) do nothing;

-- Load all domain data (vendors, products, schedule, fees, messages, etc.).
select _load_demo_data();

commit;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0008: a library of brand themes the Market Admin (and Platform Owner) can apply
-- to re-skin their market. Applying a theme persists it to the active tenant's
-- brand, so the change sticks for shoppers and vendors until the admin switches.

create table themes (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null,
  brand jsonb not null,          -- same shape as tenants.brand ("R G B" triplets)
  sort  int not null default 0
);

alter table themes enable row level security;
create policy themes_select on themes for select using (true);

-- Let admins (and the owner) re-brand the active market, not just superadmins.
create policy tenants_update_admin on tenants for update to authenticated
  using (is_admin()) with check (is_admin());

insert into themes (name, brand, sort) values
  ('Harvest',  '{"primary":"47 93 58","primary-dark":"36 74 46","accent":"224 165 38","berry":"181 83 42","ink":"42 38 32","paper":"251 247 239","card":"255 255 255","muted":"107 99 84","line":"231 222 201"}'::jsonb, 1),
  ('Coastal',  '{"primary":"30 92 110","primary-dark":"22 67 79","accent":"232 115 46","berry":"122 79 163","ink":"31 41 51","paper":"244 247 248","card":"255 255 255","muted":"91 107 115","line":"220 230 233"}'::jsonb, 2),
  ('Berry',    '{"primary":"124 45 87","primary-dark":"92 32 65","accent":"224 122 95","berry":"168 80 120","ink":"40 30 38","paper":"250 244 247","card":"255 255 255","muted":"120 100 110","line":"235 220 228"}'::jsonb, 3),
  ('Autumn',   '{"primary":"138 64 32","primary-dark":"105 48 24","accent":"214 142 48","berry":"150 70 40","ink":"46 36 28","paper":"250 244 235","card":"255 255 255","muted":"120 100 80","line":"233 220 200"}'::jsonb, 4),
  ('Orchard',  '{"primary":"64 110 56","primary-dark":"48 84 42","accent":"200 60 70","berry":"170 90 60","ink":"38 40 32","paper":"247 250 242","card":"255 255 255","muted":"100 110 95","line":"222 232 212"}'::jsonb, 5),
  ('Lavender', '{"primary":"92 78 150","primary-dark":"70 58 120","accent":"224 150 90","berry":"150 90 150","ink":"40 38 52","paper":"247 245 252","card":"255 255 255","muted":"110 105 130","line":"228 224 240"}'::jsonb, 6),
  ('Slate',    '{"primary":"51 65 85","primary-dark":"36 47 64","accent":"234 88 76","berry":"100 116 139","ink":"30 41 59","paper":"248 250 252","card":"255 255 255","muted":"100 116 139","line":"226 232 240"}'::jsonb, 7),
  ('Sunflower','{"primary":"176 120 30","primary-dark":"138 92 22","accent":"70 130 90","berry":"200 100 50","ink":"46 40 28","paper":"253 248 235","card":"255 255 255","muted":"130 110 80","line":"238 226 200"}'::jsonb, 8)
on conflict (name) do nothing;

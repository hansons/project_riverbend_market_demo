-- Riverbend Farmers Market — demo seed data
-- Run AFTER 0001 + 0002, and BEFORE `npm run seed:users`.
-- Designed to run once on a fresh project. To re-seed, reset the database first.
-- (Re-running is safe for tenants/vendors via `on conflict (id) do nothing`,
--  but markets/seasonality/products would duplicate.)

-- ─── Tenants ─────────────────────────────────────────────────────────
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

-- ─── Markets ─────────────────────────────────────────────────────────
insert into markets (name, day_of_week, season, hours, location, blurb, sort) values
  ('Saturday Market', 'Saturday', 'April – November', '9am – 1pm',
   'Riverfront Commons, 1st & Jackson', 'Our flagship market — 60+ vendors, live music, and the full harvest.', 1),
  ('Midweek Market', 'Wednesday', 'June – September', '3pm – 7pm',
   'Library Plaza, 6th & Monroe', 'A smaller after-work market for fresh dinner picks.', 2),
  ('Winter Market', 'Saturday', 'December – March (2nd & 4th Sat)', '10am – 2pm',
   'Grange Hall, 4th & Adams', 'Indoor cool-season produce, baked goods, and crafts.', 3);

-- ─── Vendors ─────────────────────────────────────────────────────────
insert into vendors (id, slug, name, category, tagline, story, town, practices, market_days, image_url, email, status, featured) values
  ('a0000000-0000-4000-8000-000000000001', 'fern-hollow-farm', 'Fern Hollow Farm', 'Produce',
   'Diversified vegetables & cut flowers',
   'A third-generation 18-acre family farm in the coast range foothills. We grow over 40 vegetable varieties using no-spray, regenerative methods, and bring whatever was picked that morning.',
   'Philomath, OR', '{"Certified Organic","No-spray","Regenerative"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=70',
   'hello@fernhollow.demo', 'active', true),

  ('a0000000-0000-4000-8000-000000000002', 'rolling-oak-bakery', 'Rolling Oak Bakery', 'Bakery',
   'Wood-fired sourdough & pastry',
   'Naturally-leavened breads baked in a wood-fired oven, milled from Willamette Valley grain. Get there early — the morning buns sell out.',
   'Corvallis, OR', '{"Wood-fired","Local grain"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=70',
   'bake@rollingoak.demo', 'active', true),

  ('a0000000-0000-4000-8000-000000000003', 'marys-peak-flowers', 'Mary''s Peak Flowers', 'Flowers',
   'Seasonal cut-flower bouquets',
   'Field-grown, no-spray cut flowers harvested at dawn. Subscriptions and custom bouquets for weddings and events.',
   'Philomath, OR', '{"No-spray","Field-grown"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1469259943454-aa100abba749?auto=format&fit=crop&w=900&q=70',
   'stems@maryspeak.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000004', 'alsea-valley-meats', 'Alsea Valley Meats', 'Meat & Eggs',
   'Pasture-raised meat & eggs',
   'Family ranch raising grass-fed beef, pastured pork, and free-range eggs in the Alsea valley. Whole/half shares available.',
   'Alsea, OR', '{"Pasture-raised","Grass-fed"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=70',
   'ranch@alseavalley.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000005', 'three-rivers-creamery', 'Three Rivers Creamery', 'Cheese & Dairy',
   'Farmstead cheese & yogurt',
   'A small grass-based dairy making aged and fresh cheeses, cultured butter, and whole-milk yogurt.',
   'Albany, OR', '{"Grass-fed","Farmstead"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=70',
   'cheese@threerivers.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000006', 'willamette-mushrooms', 'Willamette Mushrooms', 'Mushrooms',
   'Specialty & wild mushrooms',
   'Indoor-grown lion''s mane, oyster, and shiitake, plus foraged seasonal wild mushrooms. Grow kits available.',
   'Corvallis, OR', '{"Indoor-grown","Foraged"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1518882570151-12af3cdb5cf3?auto=format&fit=crop&w=900&q=70',
   'fungi@willamette.demo', 'active', true),

  ('a0000000-0000-4000-8000-000000000007', 'sunbow-orchard', 'Sunbow Orchard', 'Orchard & Fruit',
   'Tree fruit, berries & cider',
   'A hillside orchard growing apples, pears, cherries, and berries with integrated pest management. Fresh-pressed cider in fall.',
   'Lebanon, OR', '{"IPM","Family orchard"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=900&q=70',
   'fruit@sunbow.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000008', 'masala-cart', 'Masala Cart', 'Prepared Foods',
   'Hot Indian street food',
   'Made-to-order chaat, samosas, and seasonal thali built from other vendors'' produce. Vegetarian and vegan options.',
   'Corvallis, OR', '{"Made-to-order","Vegetarian"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=70',
   'eat@masalacart.demo', 'active', false)
on conflict (id) do nothing;

-- ─── Vendor products (the demo vendor, Fern Hollow, is the richest) ───
insert into vendor_products (vendor_id, name, category, unit, price_cents, in_season, sort) values
  ('a0000000-0000-4000-8000-000000000001', 'Sugar snap peas', 'Vegetable', 'lb', 600, true, 1),
  ('a0000000-0000-4000-8000-000000000001', 'Rainbow chard', 'Vegetable', 'bunch', 350, true, 2),
  ('a0000000-0000-4000-8000-000000000001', 'Butterhead lettuce', 'Vegetable', 'head', 300, true, 3),
  ('a0000000-0000-4000-8000-000000000001', 'French breakfast radishes', 'Vegetable', 'bunch', 300, true, 4),
  ('a0000000-0000-4000-8000-000000000001', 'Garlic scapes', 'Vegetable', 'bunch', 400, true, 5),
  ('a0000000-0000-4000-8000-000000000001', 'Mixed dahlia bouquet', 'Flowers', 'each', 1500, false, 6),
  ('a0000000-0000-4000-8000-000000000001', 'Heirloom tomatoes', 'Vegetable', 'lb', 500, false, 7),
  ('a0000000-0000-4000-8000-000000000002', 'Country sourdough', 'Bread', 'loaf', 800, true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'Morning buns', 'Pastry', 'each', 450, true, 2),
  ('a0000000-0000-4000-8000-000000000002', 'Seeded rye', 'Bread', 'loaf', 850, true, 3),
  ('a0000000-0000-4000-8000-000000000006', 'Lion''s mane', 'Mushroom', 'lb', 1600, true, 1),
  ('a0000000-0000-4000-8000-000000000006', 'Blue oyster', 'Mushroom', 'lb', 1400, true, 2),
  ('a0000000-0000-4000-8000-000000000004', 'Pastured eggs', 'Eggs', 'dozen', 700, true, 1),
  ('a0000000-0000-4000-8000-000000000004', 'Ground beef', 'Meat', 'lb', 950, true, 2);

-- ─── Seasonality ("what's in season" — tuned for June in the valley) ──
insert into seasonality (item, category, emoji, status, months, note, sort) values
  ('Strawberries',   'Fruit',     '🍓', 'peak',   '{6}',            'Hood berries — eat within two days', 1),
  ('Sugar snap peas', 'Vegetable', '🫛', 'peak',   '{5,6}',          'Sweetest right now', 2),
  ('Salad greens',   'Vegetable', '🥬', 'peak',   '{4,5,6,7,8,9,10}', 'All season long', 3),
  ('Garlic scapes',  'Vegetable', '🧄', 'peak',   '{6}',            'A two-week window only', 4),
  ('Rhubarb',        'Vegetable', '🥧', 'peak',   '{4,5,6}',        null, 5),
  ('Asparagus',      'Vegetable', '🌱', 'ending', '{4,5,6}',        'Last couple weeks', 6),
  ('Cherries',       'Fruit',     '🍒', 'coming', '{6,7}',          'First pickings any day', 7),
  ('Blueberries',    'Fruit',     '🫐', 'coming', '{6,7,8}',        null, 8),
  ('Tomatoes',       'Fruit',     '🍅', 'coming', '{7,8,9}',        'Hoop-house first', 9),
  ('Honey',          'Pantry',    '🍯', 'peak',   '{1,2,3,4,5,6,7,8,9,10,11,12}', 'Spring wildflower', 10);

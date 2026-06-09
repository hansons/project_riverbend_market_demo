-- Riverbend Farmers Market — demo seed data
-- Run AFTER 0001 + 0002, and BEFORE `npm run seed:users`.
--
-- Idempotent / re-runnable: it clears the domain rows and upserts vendors by id,
-- so re-running won't duplicate anything and the demo-vendor link (vendor id
-- ...0001 = Fern Hollow) is preserved. Safe to run again after editing.
--
-- Regional (Willamette Valley) flavor is intentional, but the market's meeting
-- venues are fictional so the demo doesn't pinpoint any real market location.

begin;

-- Clear domain rows (children first). Vendors are UPSERTED below rather than
-- deleted, so profiles.vendor_id links survive a re-seed.
delete from vendor_products;
delete from seasonality;
delete from markets;

-- ─── Tenants ─────────────────────────────────────────────────────────
-- Two brands so the Slice 4 super-admin view can re-skin the whole app live.
-- Brand colors are "R G B" triplets consumed by ThemeProvider as CSS vars.
-- (Insert-if-missing so we don't clobber a live re-skin choice.)
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
-- Venue names/cross-streets are fictional on purpose.
insert into markets (name, day_of_week, season, hours, location, blurb, sort) values
  ('Saturday Market', 'Saturday', 'April – November', '9am – 1pm',
   'Willow Bend Park, riverside lawn', 'Our flagship market — 60+ vendors, live music, and the full harvest.', 1),
  ('Midweek Market', 'Wednesday', 'June – September', '3pm – 7pm',
   'Maple Square, downtown', 'A smaller after-work market for fresh dinner picks.', 2),
  ('Winter Market', 'Saturday', 'December – March (2nd & 4th Sat)', '10am – 2pm',
   'The Grange Hall, Orchard Avenue', 'Indoor cool-season produce, baked goods, and crafts.', 3);

-- ─── Vendors ─────────────────────────────────────────────────────────
-- 20 active (shown to shoppers) + 2 pending + 1 suspended (admin-only; the
-- public surface filters to status='active'). Featured: 01,02,06,13,15.
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
   'eat@masalacart.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000009', 'cobblestone-gardens', 'Cobblestone Gardens', 'Produce',
   'Salad greens & root vegetables',
   'A market garden on two reclaimed city lots, growing intensive beds of greens, roots, and alliums for restaurants and the market.',
   'Corvallis, OR', '{"No-spray","Small-batch"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=70',
   'grow@cobblestone.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000010', 'two-crows-farm', 'Two Crows Farm', 'Produce',
   'Heirloom & specialty veg',
   'A young couple farming six leased acres, trialing heirloom varieties and selling everything within a day of harvest.',
   'Monroe, OR', '{"No-spray","Heirloom"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=900&q=70',
   'hello@twocrows.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000011', 'hearthstone-bread', 'Hearthstone Bread Co.', 'Bakery',
   'Hearth loaves & laminated pastry',
   'Small-batch breads and croissants from a converted garage bakery. Everything is mixed by hand the night before.',
   'Albany, OR', '{"Small-batch","Hand-mixed"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=70',
   'orders@hearthstone.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000012', 'coast-range-poultry', 'Coast Range Poultry', 'Meat & Eggs',
   'Pastured chicken, duck & eggs',
   'Mobile coops moved daily across the pasture. Whole birds, cuts, and the freshest eggs you''ll find.',
   'Blodgett, OR', '{"Pasture-raised","Soy-free"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?auto=format&fit=crop&w=900&q=70',
   'flock@coastrange.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000013', 'blue-mountain-berries', 'Blue Mountain Berries', 'Orchard & Fruit',
   'Strawberries, blues & caneberries',
   'A u-pick and market berry farm. June strawberries, then blueberries and marionberries all summer long.',
   'Lebanon, OR', '{"IPM","U-pick"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=70',
   'berries@bluemountain.demo', 'active', true),

  ('a0000000-0000-4000-8000-000000000014', 'la-cocina-verde', 'La Cocina Verde', 'Prepared Foods',
   'Oaxacan tamales & street tacos',
   'A family cart serving handmade tamales, tacos, and elote built from the market''s own produce. Salsas made fresh each morning.',
   'Corvallis, OR', '{"Made-to-order","Family recipe"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=70',
   'hola@cocinaverde.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000015', 'beeline-apiary', 'Beeline Apiary', 'Honey & Preserves',
   'Raw honey, jam & beeswax',
   'Forty hives across valley orchards and wildflower meadows. Raw varietal honeys, small-batch preserves, and hand-poured beeswax candles.',
   'Tangent, OR', '{"Raw","Small-batch"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=70',
   'buzz@beeline.demo', 'active', true),

  ('a0000000-0000-4000-8000-000000000016', 'foghorn-coffee', 'Foghorn Coffee Roasters', 'Coffee & Tea',
   'Small-batch roasts & cold brew',
   'A two-person roastery dialing in single-origin beans on a vintage drum roaster. Cold brew on tap at the stand.',
   'Corvallis, OR', '{"Small-batch","Fair-trade"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=70',
   'beans@foghorn.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000017', 'greenwise-herbs', 'Greenwise Herbs & Starts', 'Herbs & Plants',
   'Culinary herbs & garden starts',
   'A backyard nursery raising organic herb plants, vegetable starts, and potted perennials for home gardeners.',
   'Philomath, OR', '{"Certified Organic","Peat-free"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70',
   'plants@greenwise.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000018', 'yaquina-bay-seafood', 'Yaquina Bay Seafood', 'Seafood',
   'Day-boat fish & Dungeness crab',
   'Off-the-boat salmon, albacore, rockfish, and live Dungeness crab, iced and driven straight over the coast range.',
   'Newport, OR', '{"Day-boat","Wild-caught"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?auto=format&fit=crop&w=900&q=70',
   'fresh@yaquinabay.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000019', 'marigold-soapworks', 'Marigold Soapworks', 'Body & Home',
   'Goat-milk soap & herbal salves',
   'Cold-process soaps, salves, and candles made with goat milk and home-grown botanicals. Gentle, simple ingredients.',
   'Brownsville, OR', '{"Small-batch","Botanical"}', '{"Saturday","Wednesday"}',
   'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=70',
   'hello@marigoldsoap.demo', 'active', false),

  ('a0000000-0000-4000-8000-000000000020', 'stoneground-mill', 'Stoneground Mill & Nuts', 'Nuts & Grains',
   'Fresh-milled flour & hazelnuts',
   'Stone-milled flours, polenta, and rolled oats from regional grain, plus roasted Willamette Valley hazelnuts.',
   'Junction City, OR', '{"Stone-milled","Regional grain"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=70',
   'mill@stoneground.demo', 'active', false),

  -- Pending applications + one suspended vendor (for the Slice 3 admin queue;
  -- hidden from shoppers by RLS).
  ('a0000000-0000-4000-8000-000000000021', 'sweet-pea-microgreens', 'Sweet Pea Microgreens', 'Produce',
   'Microgreens & shoots',
   'Indoor-grown microgreens and pea shoots harvested to order. New applicant for this season.',
   'Corvallis, OR', '{"Indoor-grown","Pesticide-free"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=900&q=70',
   'hi@sweetpea.demo', 'pending', false),

  ('a0000000-0000-4000-8000-000000000022', 'driftwood-ferments', 'Driftwood Ferments', 'Honey & Preserves',
   'Kraut, kimchi & hot sauce',
   'Wild-fermented vegetables and small-batch hot sauce. Awaiting cottage-food paperwork review.',
   'Albany, OR', '{"Wild-fermented","Small-batch"}', '{"Saturday"}',
   'https://images.unsplash.com/photo-1605187344400-2c97f4d0f2c3?auto=format&fit=crop&w=900&q=70',
   'ferment@driftwood.demo', 'pending', false),

  ('a0000000-0000-4000-8000-000000000023', 'lapsed-larder', 'The Lapsed Larder', 'Prepared Foods',
   'Pies & hand pastries',
   'On hold — insurance lapsed mid-season. Suspended pending updated certificate.',
   'Sweet Home, OR', '{"Made-to-order"}', '{"Saturday"}',
   null,
   'pies@lapsedlarder.demo', 'suspended', false)
on conflict (id) do update set
  slug        = excluded.slug,
  name        = excluded.name,
  category    = excluded.category,
  tagline     = excluded.tagline,
  story       = excluded.story,
  town        = excluded.town,
  practices   = excluded.practices,
  market_days = excluded.market_days,
  image_url   = excluded.image_url,
  email       = excluded.email,
  status      = excluded.status,
  featured    = excluded.featured;

-- ─── Vendor products ─────────────────────────────────────────────────
insert into vendor_products (vendor_id, name, category, unit, price_cents, in_season, sort) values
  -- 01 Fern Hollow Farm
  ('a0000000-0000-4000-8000-000000000001', 'Sugar snap peas', 'Vegetable', 'lb', 600, true, 1),
  ('a0000000-0000-4000-8000-000000000001', 'Rainbow chard', 'Vegetable', 'bunch', 350, true, 2),
  ('a0000000-0000-4000-8000-000000000001', 'Butterhead lettuce', 'Vegetable', 'head', 300, true, 3),
  ('a0000000-0000-4000-8000-000000000001', 'French breakfast radishes', 'Vegetable', 'bunch', 300, true, 4),
  ('a0000000-0000-4000-8000-000000000001', 'Garlic scapes', 'Vegetable', 'bunch', 400, true, 5),
  ('a0000000-0000-4000-8000-000000000001', 'Mixed dahlia bouquet', 'Flowers', 'each', 1500, false, 6),
  ('a0000000-0000-4000-8000-000000000001', 'Heirloom tomatoes', 'Vegetable', 'lb', 500, false, 7),
  -- 02 Rolling Oak Bakery
  ('a0000000-0000-4000-8000-000000000002', 'Country sourdough', 'Bread', 'loaf', 800, true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'Morning buns', 'Pastry', 'each', 450, true, 2),
  ('a0000000-0000-4000-8000-000000000002', 'Seeded rye', 'Bread', 'loaf', 850, true, 3),
  ('a0000000-0000-4000-8000-000000000002', 'Baguette', 'Bread', 'each', 500, true, 4),
  -- 03 Mary's Peak Flowers
  ('a0000000-0000-4000-8000-000000000003', 'Market bouquet', 'Flowers', 'each', 1800, true, 1),
  ('a0000000-0000-4000-8000-000000000003', 'Peony bunch', 'Flowers', 'bunch', 2200, true, 2),
  ('a0000000-0000-4000-8000-000000000003', 'Bud vase', 'Flowers', 'each', 900, true, 3),
  ('a0000000-0000-4000-8000-000000000003', 'Sunflower bunch', 'Flowers', 'bunch', 1500, false, 4),
  -- 04 Alsea Valley Meats
  ('a0000000-0000-4000-8000-000000000004', 'Pastured eggs', 'Eggs', 'dozen', 700, true, 1),
  ('a0000000-0000-4000-8000-000000000004', 'Ground beef', 'Meat', 'lb', 950, true, 2),
  ('a0000000-0000-4000-8000-000000000004', 'Pork chops', 'Meat', 'lb', 1300, true, 3),
  ('a0000000-0000-4000-8000-000000000004', 'Bacon', 'Meat', 'lb', 1200, true, 4),
  -- 05 Three Rivers Creamery
  ('a0000000-0000-4000-8000-000000000005', 'Aged cheddar', 'Cheese', 'wedge', 1100, true, 1),
  ('a0000000-0000-4000-8000-000000000005', 'Fresh chèvre', 'Cheese', 'each', 900, true, 2),
  ('a0000000-0000-4000-8000-000000000005', 'Cultured butter', 'Dairy', 'each', 700, true, 3),
  ('a0000000-0000-4000-8000-000000000005', 'Whole-milk yogurt', 'Dairy', 'quart', 600, true, 4),
  -- 06 Willamette Mushrooms
  ('a0000000-0000-4000-8000-000000000006', 'Lion''s mane', 'Mushroom', 'lb', 1600, true, 1),
  ('a0000000-0000-4000-8000-000000000006', 'Blue oyster', 'Mushroom', 'lb', 1400, true, 2),
  ('a0000000-0000-4000-8000-000000000006', 'Shiitake', 'Mushroom', 'lb', 1500, true, 3),
  ('a0000000-0000-4000-8000-000000000006', 'Grow-at-home kit', 'Mushroom', 'each', 2500, true, 4),
  -- 07 Sunbow Orchard
  ('a0000000-0000-4000-8000-000000000007', 'Cherries', 'Fruit', 'lb', 600, true, 1),
  ('a0000000-0000-4000-8000-000000000007', 'Honeycrisp apples', 'Fruit', 'lb', 350, false, 2),
  ('a0000000-0000-4000-8000-000000000007', 'Bartlett pears', 'Fruit', 'lb', 350, false, 3),
  ('a0000000-0000-4000-8000-000000000007', 'Fresh cider', 'Beverage', 'each', 800, false, 4),
  -- 08 Masala Cart
  ('a0000000-0000-4000-8000-000000000008', 'Samosa plate', 'Prepared', 'each', 900, true, 1),
  ('a0000000-0000-4000-8000-000000000008', 'Chana chaat', 'Prepared', 'each', 1000, true, 2),
  ('a0000000-0000-4000-8000-000000000008', 'Veg thali', 'Prepared', 'each', 1400, true, 3),
  ('a0000000-0000-4000-8000-000000000008', 'Mango lassi', 'Beverage', 'each', 600, true, 4),
  -- 09 Cobblestone Gardens
  ('a0000000-0000-4000-8000-000000000009', 'Salad mix', 'Vegetable', 'bag', 600, true, 1),
  ('a0000000-0000-4000-8000-000000000009', 'Heirloom carrots', 'Vegetable', 'bunch', 350, true, 2),
  ('a0000000-0000-4000-8000-000000000009', 'Spring onions', 'Vegetable', 'bunch', 300, true, 3),
  ('a0000000-0000-4000-8000-000000000009', 'Lacinato kale', 'Vegetable', 'bunch', 350, true, 4),
  -- 10 Two Crows Farm
  ('a0000000-0000-4000-8000-000000000010', 'Rainbow beets', 'Vegetable', 'bunch', 350, true, 1),
  ('a0000000-0000-4000-8000-000000000010', 'New potatoes', 'Vegetable', 'lb', 400, true, 2),
  ('a0000000-0000-4000-8000-000000000010', 'Fava beans', 'Vegetable', 'lb', 500, true, 3),
  ('a0000000-0000-4000-8000-000000000010', 'Sugar snap peas', 'Vegetable', 'lb', 600, true, 4),
  -- 11 Hearthstone Bread Co.
  ('a0000000-0000-4000-8000-000000000011', 'Sourdough boule', 'Bread', 'loaf', 800, true, 1),
  ('a0000000-0000-4000-8000-000000000011', 'Butter croissant', 'Pastry', 'each', 450, true, 2),
  ('a0000000-0000-4000-8000-000000000011', 'Focaccia', 'Bread', 'each', 700, true, 3),
  ('a0000000-0000-4000-8000-000000000011', 'Cinnamon roll', 'Pastry', 'each', 500, true, 4),
  -- 12 Coast Range Poultry
  ('a0000000-0000-4000-8000-000000000012', 'Free-range eggs', 'Eggs', 'dozen', 750, true, 1),
  ('a0000000-0000-4000-8000-000000000012', 'Whole chicken', 'Meat', 'each', 1900, true, 2),
  ('a0000000-0000-4000-8000-000000000012', 'Chicken thighs', 'Meat', 'lb', 1100, true, 3),
  ('a0000000-0000-4000-8000-000000000012', 'Duck eggs', 'Eggs', 'dozen', 900, true, 4),
  -- 13 Blue Mountain Berries
  ('a0000000-0000-4000-8000-000000000013', 'Strawberries', 'Fruit', 'pint', 500, true, 1),
  ('a0000000-0000-4000-8000-000000000013', 'Blueberries', 'Fruit', 'pint', 600, false, 2),
  ('a0000000-0000-4000-8000-000000000013', 'Marionberries', 'Fruit', 'pint', 700, false, 3),
  ('a0000000-0000-4000-8000-000000000013', 'Raspberries', 'Fruit', 'pint', 650, false, 4),
  -- 14 La Cocina Verde
  ('a0000000-0000-4000-8000-000000000014', 'Tamale plate', 'Prepared', 'each', 1000, true, 1),
  ('a0000000-0000-4000-8000-000000000014', 'Street tacos (3)', 'Prepared', 'each', 1100, true, 2),
  ('a0000000-0000-4000-8000-000000000014', 'Elote', 'Prepared', 'each', 600, true, 3),
  ('a0000000-0000-4000-8000-000000000014', 'Horchata', 'Beverage', 'each', 500, true, 4),
  -- 15 Beeline Apiary
  ('a0000000-0000-4000-8000-000000000015', 'Wildflower honey', 'Pantry', 'jar', 1200, true, 1),
  ('a0000000-0000-4000-8000-000000000015', 'Blackberry jam', 'Pantry', 'jar', 800, true, 2),
  ('a0000000-0000-4000-8000-000000000015', 'Honeycomb', 'Pantry', 'each', 1500, true, 3),
  ('a0000000-0000-4000-8000-000000000015', 'Beeswax candles', 'Home', 'each', 1000, true, 4),
  -- 16 Foghorn Coffee Roasters
  ('a0000000-0000-4000-8000-000000000016', 'Whole-bean coffee', 'Coffee', 'bag', 1600, true, 1),
  ('a0000000-0000-4000-8000-000000000016', 'Cold brew', 'Beverage', 'each', 500, true, 2),
  ('a0000000-0000-4000-8000-000000000016', 'Loose-leaf tea', 'Tea', 'tin', 1200, true, 3),
  ('a0000000-0000-4000-8000-000000000016', 'Drip coffee', 'Beverage', 'each', 300, true, 4),
  -- 17 Greenwise Herbs & Starts
  ('a0000000-0000-4000-8000-000000000017', 'Basil start', 'Plant', 'each', 400, true, 1),
  ('a0000000-0000-4000-8000-000000000017', 'Tomato start', 'Plant', 'each', 500, true, 2),
  ('a0000000-0000-4000-8000-000000000017', 'Potted mint', 'Plant', 'each', 600, true, 3),
  ('a0000000-0000-4000-8000-000000000017', 'Cut herb bundle', 'Herb', 'bunch', 500, true, 4),
  -- 18 Yaquina Bay Seafood
  ('a0000000-0000-4000-8000-000000000018', 'Wild king salmon', 'Seafood', 'lb', 1800, true, 1),
  ('a0000000-0000-4000-8000-000000000018', 'Dungeness crab', 'Seafood', 'each', 2200, true, 2),
  ('a0000000-0000-4000-8000-000000000018', 'Albacore tuna', 'Seafood', 'lb', 1500, true, 3),
  ('a0000000-0000-4000-8000-000000000018', 'Bay shrimp', 'Seafood', 'lb', 1400, true, 4),
  -- 19 Marigold Soapworks
  ('a0000000-0000-4000-8000-000000000019', 'Goat-milk soap', 'Body', 'bar', 700, true, 1),
  ('a0000000-0000-4000-8000-000000000019', 'Lavender salve', 'Body', 'each', 1100, true, 2),
  ('a0000000-0000-4000-8000-000000000019', 'Beeswax lip balm', 'Body', 'each', 500, true, 3),
  ('a0000000-0000-4000-8000-000000000019', 'Soy candle', 'Home', 'each', 1400, true, 4),
  -- 20 Stoneground Mill & Nuts
  ('a0000000-0000-4000-8000-000000000020', 'Stoneground flour', 'Grain', 'bag', 600, true, 1),
  ('a0000000-0000-4000-8000-000000000020', 'Roasted hazelnuts', 'Nuts', 'bag', 900, true, 2),
  ('a0000000-0000-4000-8000-000000000020', 'Polenta', 'Grain', 'bag', 500, true, 3),
  ('a0000000-0000-4000-8000-000000000020', 'Rolled oats', 'Grain', 'bag', 450, true, 4);

-- ─── Seasonality ("what's in season" — tuned for June in the valley) ──
insert into seasonality (item, category, emoji, status, months, note, sort) values
  ('Strawberries',    'Fruit',     '🍓', 'peak',   '{5,6}',                          'Hood berries — eat within two days', 1),
  ('Sugar snap peas', 'Vegetable', '🫛', 'peak',   '{5,6}',                          'Sweetest right now', 2),
  ('Salad greens',    'Vegetable', '🥬', 'peak',   '{4,5,6,7,8,9,10}',               'All season long', 3),
  ('Garlic scapes',   'Vegetable', '🧄', 'peak',   '{6}',                            'A two-week window only', 4),
  ('Rhubarb',         'Vegetable', '🥧', 'peak',   '{4,5,6}',                        null, 5),
  ('Fava beans',      'Vegetable', '🫘', 'peak',   '{5,6}',                          null, 6),
  ('Spring onions',   'Vegetable', '🧅', 'peak',   '{5,6}',                          null, 7),
  ('Radishes',        'Vegetable', null, 'peak',   '{4,5,6,9,10}',                   null, 8),
  ('Carrots',         'Vegetable', '🥕', 'peak',   '{6,7,8,9,10}',                   null, 9),
  ('Beets',           'Vegetable', null, 'peak',   '{6,7,8,9,10}',                   null, 10),
  ('New potatoes',    'Vegetable', '🥔', 'coming', '{6,7}',                          'First digs any day', 11),
  ('Asparagus',       'Vegetable', '🌱', 'ending', '{4,5,6}',                        'Last couple weeks', 12),
  ('Cherries',        'Fruit',     '🍒', 'coming', '{6,7}',                          'First pickings any day', 13),
  ('Blueberries',     'Fruit',     '🫐', 'coming', '{6,7,8}',                        null, 14),
  ('Raspberries',     'Fruit',     null, 'coming', '{6,7}',                          null, 15),
  ('Marionberries',   'Fruit',     null, 'coming', '{7,8}',                          'The Oregon classic', 16),
  ('Tomatoes',        'Fruit',     '🍅', 'coming', '{7,8,9}',                        'Hoop-house first', 17),
  ('Zucchini',        'Vegetable', '🥒', 'coming', '{7,8,9}',                        null, 18),
  ('Sweet corn',      'Vegetable', '🌽', 'coming', '{8,9}',                          null, 19),
  ('Basil',           'Herb',      '🌿', 'coming', '{6,7,8}',                        null, 20),
  ('Cilantro',        'Herb',      '🌿', 'peak',   '{5,6,9,10}',                     null, 21),
  ('Peonies',         'Flowers',   '🌸', 'peak',   '{5,6}',                          'Cut tight, they open for days', 22),
  ('Dahlias',         'Flowers',   '🌼', 'coming', '{7,8,9}',                        null, 23),
  ('Hazelnuts',       'Nuts',      '🌰', 'coming', '{10}',                           'Fall harvest', 24),
  ('Honey',           'Pantry',    '🍯', 'peak',   '{1,2,3,4,5,6,7,8,9,10,11,12}',   'Spring wildflower', 25);

commit;

-- Riverbend Farmers Market — Lodestone capability demo
-- 0009: community events ("Learning Takes Root") — partner activities, demos,
-- and kids programming at the markets. Public Events page + admin management.
--
-- Self-contained: creates the table, RLS, and seeds sample events. (The
-- Platform-Owner "Reset demo" loader doesn't touch events; re-run this file to
-- restore the sample set.)

create table events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  date        date not null,
  market_id   uuid references markets(id) on delete set null,
  category    text,
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index events_date_idx on events(date);

alter table events enable row level security;
create policy events_select on events for select using (true);
create policy events_write on events for all to authenticated
  using (is_admin()) with check (is_admin());

insert into events (id, title, description, date, market_id, category, featured) values
  ('44440000-0000-4000-8000-000000000001', 'Master Gardeners — Let''s Talk Plants',
   'OSU Extension Master Gardener volunteers are at the market with on-the-spot, sustainable gardening advice. Bring your questions, problems, or even plant samples.',
   '2026-06-13', '22220000-0000-4000-8000-000000000001', 'Gardening', true),
  ('44440000-0000-4000-8000-000000000002', 'Power of Produce (PoP) Kids Club',
   'Kids ages 4–12 take the 2-Bite Challenge — sample seasonal market produce and choose a free fruit or veggie to take home. Runs all summer.',
   '2026-06-13', '22220000-0000-4000-8000-000000000001', 'Kids', false),
  ('44440000-0000-4000-8000-000000000003', 'Valley Beekeepers — Live Observation Hive',
   'The county beekeepers club brings a glass observation hive — complete with live bees and the queen. Open to anyone curious about honey bees.',
   '2026-06-17', '22220000-0000-4000-8000-000000000002', 'Education', false),
  ('44440000-0000-4000-8000-000000000004', 'Library Summer Reading Kickoff',
   'Sign up for the Summer Reading Program, learn about library services, and try out items from the Library of Things. All ages welcome.',
   '2026-06-20', '22220000-0000-4000-8000-000000000001', 'Kids', false),
  ('44440000-0000-4000-8000-000000000005', 'Chef Demo — Strawberry Season',
   'A local chef cooks up simple, seasonal dishes using produce from the market''s own farmers. Watch, taste, and grab the recipe card.',
   '2026-06-20', '22220000-0000-4000-8000-000000000001', 'Food', true),
  ('44440000-0000-4000-8000-000000000006', 'Food Preservation 101',
   'Certified Master Food Preservers share up-to-date food safety and preservation tips — canning, freezing, dehydrating, and fermentation. Free pressure-gauge testing.',
   '2026-06-24', '22220000-0000-4000-8000-000000000002', 'Education', false),
  ('44440000-0000-4000-8000-000000000007', 'Kids Day at the Market',
   'We''re celebrating kids! Every child can take home a market fruit or veggie, plus activities and giveaways from community partners all morning.',
   '2026-06-27', '22220000-0000-4000-8000-000000000001', 'Kids', false),
  ('44440000-0000-4000-8000-000000000008', 'Live Music — The Cedar Sisters',
   'Independence-weekend tunes on the main stage, 10am–noon. Come early for the best produce and a great seat on the lawn.',
   '2026-07-04', '22220000-0000-4000-8000-000000000001', 'Music', true),
  ('44440000-0000-4000-8000-000000000009', 'Community Health — Stroke Awareness',
   'The regional health system''s stroke team offers community education, resources, and demonstrations on recognizing the signs of a stroke.',
   '2026-07-08', '22220000-0000-4000-8000-000000000002', 'Health', false),
  ('44440000-0000-4000-8000-00000000000a', 'Canning Clinic — Master Food Preservers',
   'Hands-on help getting started with safe home canning. Bring your pressure-canner gauge for a free test.',
   '2026-07-11', '22220000-0000-4000-8000-000000000001', 'Education', false)
on conflict (id) do nothing;

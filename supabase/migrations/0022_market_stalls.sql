-- Riverbend Farmers Market — Lodestone capability demo
-- 0022: per-market stall coordinates for the satellite stall map. Admins drag
-- each stall to its real spot on the imagery; positions persist here so the public
-- "who's where" map and the admin view match the physical layout.
--
-- market_id is a plain uuid (NO foreign key): the reset loader (0007) deletes +
-- re-inserts markets, so a cascade FK would wipe the layout on "Reset demo"; the
-- seeded market UUIDs are stable, so a bare uuid stays valid. Self-contained:
-- reset loader untouched; seeds the Saturday market's A–D×12 grid (matching the
-- front-end generator) so the satellite map isn't empty out of the box.

create table market_stalls (
  id         uuid primary key default gen_random_uuid(),
  market_id  uuid not null,                 -- stable seeded market UUID; no FK (reset-safe)
  label      text not null,                 -- 'A1' … 'D12'
  lat        double precision not null,
  lng        double precision not null,
  created_at timestamptz not null default now(),
  unique (market_id, label)
);
create index market_stalls_market_idx on market_stalls(market_id);

alter table market_stalls enable row level security;
-- Public read (shoppers see the map); admins place/save the layout.
create policy market_stalls_select on market_stalls for select using (true);
create policy market_stalls_write on market_stalls for all to authenticated
  using (is_admin()) with check (is_admin());

-- Seed: the Saturday market (…0001), A–D × 12, as a grid around the Corvallis
-- riverfront center (44.5663, -123.2566). Offsets match src/lib/stalls.ts.
insert into market_stalls (market_id, label, lat, lng)
select
  '22220000-0000-4000-8000-000000000001'::uuid,
  r.row || c.col::text,
  44.5663 - (r.ri - 1.5) * (7.0 / 111320.0),
  -123.2566 + ((c.col - 1) - 5.5) * (4.0 / 79300.0)
from (values ('A', 0), ('B', 1), ('C', 2), ('D', 3)) as r(row, ri),
     generate_series(1, 12) as c(col)
on conflict (market_id, label) do nothing;

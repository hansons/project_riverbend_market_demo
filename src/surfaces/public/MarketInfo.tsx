import { useState } from 'react';
import { useAsync } from '@/lib/useAsync';
import { fetchMarkets, fetchFrontPageMarketDate, fetchAssignmentsForDate } from '@/lib/data';
import { fetchMarketStalls, fetchMarketMap, DEFAULT_MAP_SETTINGS, DEFAULT_CENTER, type StallPos } from '@/lib/stalls';
import { formatDate } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SetupNotice } from '@/components/SetupNotice';
import { MarketMap, type MapOccupant } from '@/components/MarketMap';
import { MarketGeoMap } from '@/components/MarketGeoMap';

const GOOD_TO_KNOW = [
  { icon: '🅿️', title: 'Parking', body: 'Free 2-hour lots on Jackson & 2nd; bike valet at the south gate.' },
  { icon: '🐕', title: 'Leashed dogs', body: 'Well-behaved, leashed pups are welcome throughout the market.' },
  { icon: '💳', title: 'SNAP & Double Up', body: 'Visit the info booth to swipe your card — we match SNAP up to $20.' },
];

const tabActive = 'bg-brand-primary px-3 py-1 font-semibold text-white';
const tabIdle = 'px-3 py-1 text-brand-ink/75 hover:bg-brand-paper';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function MarketInfo() {
  const { data: markets, loading: marketsLoading } = useAsync(fetchMarkets, [], []);
  const [view, setView] = useState<'grid' | 'satellite'>('satellite');

  const { data: mapData, loading: mapLoading } = useAsync(
    async () => {
      const fp = await fetchFrontPageMarketDate(todayISO());
      const [stalls, assignsRaw, mapSettings] = await Promise.all([
        fp ? fetchMarketStalls(fp.marketId) : Promise.resolve([] as StallPos[]),
        fp?.dateId ? fetchAssignmentsForDate(fp.dateId) : Promise.resolve([]),
        fp ? fetchMarketMap(fp.marketId) : Promise.resolve(DEFAULT_MAP_SETTINGS),
      ]);
      const occupied: Record<string, MapOccupant> = {};
      for (const a of assignsRaw) occupied[a.stall] = { name: a.vendor, slug: a.slug };
      return {
        stalls,
        occupied,
        dateISO: fp?.dateISO ?? null,
        center: mapSettings.center ?? DEFAULT_CENTER,
        zoom: mapSettings.zoom,
        aspect: mapSettings.aspect,
        floorPlanUrl: mapSettings.floor_plan_url,
      };
    },
    [],
    {
      stalls: [] as StallPos[],
      occupied: {} as Record<string, MapOccupant>,
      dateISO: null as string | null,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_MAP_SETTINGS.zoom,
      aspect: DEFAULT_MAP_SETTINGS.aspect,
      floorPlanUrl: null as string | null,
    },
  );

  const gridStalls = mapData.stalls.map((s) => ({ label: s.label, disabled: s.disabled, category: s.category ?? null }));
  const filledCount = Object.keys(mapData.occupied).length;

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <p className="eyebrow">Plan your visit</p>
      <h1 className="text-3xl">Stall map</h1>
      {mapData.dateISO ? (
        <p className="mt-1 text-brand-muted">
          Showing assignments for{' '}
          <span className="font-medium text-brand-ink">{formatDate(mapData.dateISO)}</span>
          {filledCount > 0 && <span className="ml-1">· {filledCount} vendors confirmed</span>}
        </p>
      ) : (
        <p className="mt-1 text-brand-muted">No upcoming market dates scheduled yet.</p>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-end">
          <div className="inline-flex overflow-hidden rounded-lg border border-brand-line text-xs">
            <button onClick={() => setView('satellite')} className={view === 'satellite' ? tabActive : tabIdle}>
              Satellite
            </button>
            <button onClick={() => setView('grid')} className={view === 'grid' ? tabActive : tabIdle}>
              Grid
            </button>
          </div>
        </div>

        {mapLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />
        ) : view === 'satellite' ? (
          <MarketGeoMap
            stalls={mapData.stalls}
            center={mapData.center}
            zoom={mapData.zoom}
            aspect={mapData.aspect}
            floorPlanUrl={mapData.floorPlanUrl}
          />
        ) : (
          <MarketMap stalls={gridStalls} occupied={mapData.occupied} colorBy="category" />
        )}
      </div>

      <div className="mt-14">
        <h2 className="text-2xl">Market days &amp; hours</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {marketsLoading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-brand-card" />)
          ) : !markets.length ? (
            isSupabaseConfigured ? (
              <p className="text-brand-muted">Market schedule coming soon.</p>
            ) : (
              <div className="md:col-span-3">
                <SetupNotice />
              </div>
            )
          ) : (
            markets.map((m) => (
              <div key={m.id} className="card flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary-dark">
                    {m.day_of_week}
                  </span>
                  <span className="text-xs text-brand-muted">{m.season}</span>
                </div>
                <h2 className="mt-3 text-xl">{m.name}</h2>
                <p className="mt-1 text-sm font-medium text-brand-ink">{m.hours}</p>
                <p className="mt-1 text-sm text-brand-muted">📍 {m.location}</p>
                {m.blurb && <p className="mt-3 text-sm text-brand-ink/80">{m.blurb}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl">Good to know</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {GOOD_TO_KNOW.map((g) => (
            <div key={g.title} className="flex gap-3">
              <span className="text-2xl">{g.icon}</span>
              <div>
                <h3 className="text-base">{g.title}</h3>
                <p className="mt-1 text-sm text-brand-muted">{g.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

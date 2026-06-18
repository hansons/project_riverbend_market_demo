import { useState } from 'react';
import { useAsync } from '@/lib/useAsync';
import { fetchVendors, fetchAssignmentsForDate, fetchFrontPageMarketDate } from '@/lib/data';
import { fetchMarketStalls, fetchMarketMap, DEFAULT_MAP_SETTINGS, DEFAULT_CENTER, type StallPos } from '@/lib/stalls';
import { formatDate } from '@/lib/format';
import { navigate } from '@/lib/router';
import { MarketMap } from '@/components/MarketMap';
import { MarketGeoMap } from '@/components/MarketGeoMap';
import { useVisitList } from '@/lib/visitList';
import type { Vendor } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

const tabActive = 'bg-brand-primary px-3 py-1 font-semibold text-white';
const tabIdle = 'px-3 py-1 text-brand-ink/75 hover:bg-brand-paper';

type Assign = { stall: string; slug: string };

// Inline "visit list" panel: shows the market site map with the shopper's chosen
// vendors' stalls highlighted, plus the running list. Empty until they add one.
export function VisitPanel() {
  const visit = useVisitList();
  const { data, loading } = useAsync(
    async () => {
      // Key off the flagship market's next date so stalls + assignments match the
      // front-page "this Saturday" framing (and the SeasonStrip attending filter).
      const fp = await fetchFrontPageMarketDate(todayISO());
      const [vendors, stalls, assignsRaw, mapSettings] = await Promise.all([
        fetchVendors(),
        fp ? fetchMarketStalls(fp.marketId) : Promise.resolve([] as StallPos[]),
        fp ? fetchAssignmentsForDate(fp.dateId) : Promise.resolve([]),
        fp ? fetchMarketMap(fp.marketId) : Promise.resolve(DEFAULT_MAP_SETTINGS),
      ]);
      const assigns: Assign[] = assignsRaw.map((a) => ({ stall: a.stall, slug: a.slug }));
      return {
        vendors,
        stalls,
        assigns,
        dateISO: fp?.dateISO ?? null,
        center: mapSettings.center,
        zoom: mapSettings.zoom,
        aspect: mapSettings.aspect,
      };
    },
    [],
    {
      vendors: [] as Vendor[],
      stalls: [] as StallPos[],
      assigns: [] as Assign[],
      dateISO: null as string | null,
      center: DEFAULT_MAP_SETTINGS.center,
      zoom: DEFAULT_MAP_SETTINGS.zoom,
      aspect: DEFAULT_MAP_SETTINGS.aspect,
    },
  );
  const [view, setView] = useState<'grid' | 'satellite'>('satellite');

  if (!visit.count) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-line bg-brand-card/60 p-4 text-sm text-brand-muted">
        🗺️ <span className="font-medium text-brand-ink">Plan your visit</span> — tap any vendor (or a vendor chip
        on the cards above) to add them to your list, and a map of where to find them appears here.
      </div>
    );
  }

  const bySlug = new Map(data.vendors.map((v) => [v.slug, v]));
  const stallsBySlug = new Map<string, string[]>();
  for (const a of data.assigns) {
    if (!stallsBySlug.has(a.slug)) stallsBySlug.set(a.slug, []);
    stallsBySlug.get(a.slug)!.push(a.stall);
  }
  const selected = visit.slugs
    .map((slug) => ({ slug, vendor: bySlug.get(slug) ?? null, stalls: stallsBySlug.get(slug) ?? [] }))
    .filter((x): x is { slug: string; vendor: Vendor; stalls: string[] } => Boolean(x.vendor));
  const highlight = selected.flatMap((s) => s.stalls);
  const gridStalls = data.stalls.map((s) => ({ label: s.label, disabled: s.disabled, category: s.category ?? null }));

  return (
    <div className="rounded-2xl border border-brand-line bg-brand-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Your visit list</p>
          <h3 className="text-lg">
            {selected.length} stop{selected.length === 1 ? '' : 's'}
            {data.dateISO && <span className="text-brand-muted"> · {formatDate(data.dateISO)}</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-brand-line text-xs">
            <button onClick={() => setView('satellite')} className={view === 'satellite' ? tabActive : tabIdle}>
              Satellite
            </button>
            <button onClick={() => setView('grid')} className={view === 'grid' ? tabActive : tabIdle}>
              Grid
            </button>
          </div>
          <button onClick={visit.clear} className="text-xs font-semibold text-status-alert hover:underline">
            Clear
          </button>
        </div>
      </div>

      {/* Full-width map (same presentation as the vendor & admin satellite views). */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-brand-paper" />
      ) : view === 'satellite' ? (
        <MarketGeoMap
          stalls={data.stalls}
          highlight={highlight}
          center={data.center ?? DEFAULT_CENTER}
          zoom={data.zoom}
          aspect={data.aspect}
        />
      ) : (
        <MarketMap
          stalls={gridStalls}
          highlight={highlight}
          highlightText={selected.length === 1 ? selected[0].vendor.name : undefined}
        />
      )}

      {/* The visit list as compact pills below the map. */}
      <ul className="mt-3 flex flex-wrap gap-2">
        {selected.map((s) => (
          <li
            key={s.slug}
            className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-paper px-3 py-1 text-xs"
          >
            <button
              onClick={() => navigate(`/vendor/${s.slug}`)}
              className="font-medium text-brand-ink hover:underline"
            >
              {s.vendor.name}
            </button>
            <span className="text-brand-muted">{s.stalls.length ? s.stalls.join(', ') : 'TBA'}</span>
            <button
              onClick={() => visit.remove(s.slug)}
              title={`Remove ${s.vendor.name}`}
              className="text-brand-muted transition hover:text-status-alert"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from 'react';
import { useAsync } from '@/lib/useAsync';
import { fetchMarkets, fetchVendors, fetchAssignmentsForDate, fetchUpcomingDateForMarket } from '@/lib/data';
import { fetchMarketStalls, type StallPos } from '@/lib/stalls';
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
      const markets = await fetchMarkets();
      const market = markets[0] ?? null;
      const date = market ? await fetchUpcomingDateForMarket(market.id, todayISO()) : null;
      const [vendors, stalls, assignsRaw] = await Promise.all([
        fetchVendors(),
        market ? fetchMarketStalls(market.id) : Promise.resolve([] as StallPos[]),
        date ? fetchAssignmentsForDate(date.id) : Promise.resolve([]),
      ]);
      const assigns: Assign[] = assignsRaw.map((a) => ({ stall: a.stall, slug: a.slug }));
      return { vendors, stalls, assigns, dateISO: date?.date ?? null };
    },
    [],
    { vendors: [] as Vendor[], stalls: [] as StallPos[], assigns: [] as Assign[], dateISO: null as string | null },
  );
  const [view, setView] = useState<'grid' | 'satellite'>('grid');

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
            <button onClick={() => setView('grid')} className={view === 'grid' ? tabActive : tabIdle}>
              Grid
            </button>
            <button onClick={() => setView('satellite')} className={view === 'satellite' ? tabActive : tabIdle}>
              Satellite
            </button>
          </div>
          <button onClick={visit.clear} className="text-xs font-semibold text-status-alert hover:underline">
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-brand-paper" />
          ) : view === 'satellite' ? (
            <MarketGeoMap stalls={data.stalls} highlight={highlight} />
          ) : (
            <MarketMap
              stalls={gridStalls}
              highlight={highlight}
              highlightText={selected.length === 1 ? selected[0].vendor.name : undefined}
            />
          )}
        </div>
        <ul className="divide-y divide-brand-line">
          {selected.map((s) => (
            <li key={s.slug} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <button
                  onClick={() => navigate(`/vendor/${s.slug}`)}
                  className="block max-w-full truncate text-left text-sm font-medium text-brand-ink hover:underline"
                >
                  {s.vendor.name}
                </button>
                <p className="text-xs text-brand-muted">
                  {s.stalls.length ? `Stall ${s.stalls.join(', ')}` : 'Stall TBA'}
                </p>
              </div>
              <button
                onClick={() => visit.remove(s.slug)}
                title={`Remove ${s.vendor.name}`}
                className="shrink-0 text-brand-muted transition hover:text-status-alert"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

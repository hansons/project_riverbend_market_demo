import { useState } from 'react';
import { fetchMarketDates, fetchMySchedule, setScheduleStatus } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { formatDate } from '@/lib/format';
import { MarketMap } from '@/components/MarketMap';
import { MarketGeoMap } from '@/components/MarketGeoMap';
import { fetchMarketStalls, fetchMarketMap, DEFAULT_MAP_SETTINGS } from '@/lib/stalls';
import type { ScheduleStatus, Vendor } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

const STATUS_PILL: Record<ScheduleStatus | 'none', { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-status-ok/10 text-status-ok' },
  declined: { label: 'Declined', className: 'bg-status-alert/10 text-status-alert' },
  pending: { label: 'Pending', className: 'bg-status-warn/15 text-brand-berry' },
  none: { label: 'No response yet', className: 'bg-brand-paper text-brand-muted' },
};

export function VendorSchedule({ vendor }: { vendor: Vendor }) {
  const { data: dates, loading: datesLoading } = useAsync(fetchMarketDates, [], []);
  const { data: sched, loading: schedLoading, reload } = useAsync(() => fetchMySchedule(vendor.id), [vendor.id], []);
  const [busy, setBusy] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'satellite' | 'grid'>('satellite');

  const today = todayISO();
  const upcomingDates = dates.filter((d) => d.date >= today);
  const byDate = new Map(sched.map((s) => [s.market_date_id, s]));
  const myStops = sched
    .filter((s) => s.status === 'confirmed' && s.stalls.some((st) => /^[A-D]\d+$/.test(st)))
    .map((s) => ({ s, d: dates.find((x) => x.id === s.market_date_id) }))
    .filter((x) => x.d && x.d.date >= today)
    .sort((a, b) => a.d!.date.localeCompare(b.d!.date));
  const myNext = myStops[0];

  // Saved stall positions for the next stop's market, so the satellite view shows
  // the real placement; the vendor's assigned stall(s) are highlighted.
  const marketId = myNext?.d?.market_id ?? null;
  const { data: marketStalls, loading: stallsLoading } = useAsync(
    () => (marketId ? fetchMarketStalls(marketId) : Promise.resolve([])),
    [marketId],
    [],
  );
  const { data: marketMap } = useAsync(
    () => (marketId ? fetchMarketMap(marketId) : Promise.resolve(DEFAULT_MAP_SETTINGS)),
    [marketId],
    DEFAULT_MAP_SETTINGS,
  );

  async function set(dateId: string, status: ScheduleStatus) {
    setBusy(dateId);
    await setScheduleStatus(vendor.id, dateId, status);
    setBusy(null);
    reload();
  }

  const loading = datesLoading || schedLoading;

  return (
    <div className="card p-6">
      <h2 className="text-xl">Market schedule</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Confirm or decline each upcoming date. Your stall assignment is set by market staff.
      </p>

      {myNext && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-brand-ink">
              📍 Your spot · {myNext.d!.markets?.name ?? 'Market'} {formatDate(myNext.d!.date)}
              {myNext.s.stalls.length > 0 && (
                <span className="text-brand-muted">
                  {' '}
                  — Stall{myNext.s.stalls.length > 1 ? 's' : ''} {myNext.s.stalls.join(', ')}
                </span>
              )}
            </p>
            <div className="inline-flex overflow-hidden rounded-lg border border-brand-line text-xs">
              <button
                onClick={() => setMapView('satellite')}
                className={
                  mapView === 'satellite'
                    ? 'bg-brand-primary px-3 py-1 font-semibold text-white'
                    : 'px-3 py-1 text-brand-ink/75 hover:bg-brand-paper'
                }
              >
                Satellite
              </button>
              <button
                onClick={() => setMapView('grid')}
                className={
                  mapView === 'grid'
                    ? 'bg-brand-primary px-3 py-1 font-semibold text-white'
                    : 'px-3 py-1 text-brand-ink/75 hover:bg-brand-paper'
                }
              >
                Grid
              </button>
            </div>
          </div>
          {mapView === 'satellite' ? (
            stallsLoading ? (
              <div className="h-[440px] animate-pulse rounded-2xl bg-brand-paper" />
            ) : (
              <MarketGeoMap stalls={marketStalls} highlight={myNext.s.stalls} aspect={marketMap.aspect} />
            )
          ) : (
            <MarketMap
              highlight={myNext.s.stalls}
              highlightText={`You · ${myNext.d!.markets?.name ?? ''} ${formatDate(myNext.d!.date)}`}
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-5 h-40 animate-pulse rounded-xl bg-brand-paper" />
      ) : upcomingDates.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">No upcoming dates scheduled.</p>
      ) : (
        <ul className="mt-5 divide-y divide-brand-line">
          {upcomingDates.map((d) => {
            const row = byDate.get(d.id);
            const status = (row?.status ?? 'none') as ScheduleStatus | 'none';
            const pill = STATUS_PILL[status];
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-brand-ink">
                    {d.markets?.name ?? 'Market'} · {formatDate(d.date)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${pill.className}`}>{pill.label}</span>
                    {row?.status === 'confirmed' && row.stalls.length > 0 && (
                      <span className="text-brand-muted">
                        Stall{row.stalls.length > 1 ? 's' : ''} {row.stalls.join(', ')}
                      </span>
                    )}
                    {d.label && <span className="text-brand-accent">{d.label}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => set(d.id, 'confirmed')}
                    disabled={busy === d.id}
                    className={[
                      'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                      status === 'confirmed' ? 'bg-status-ok text-white' : 'border border-brand-line hover:bg-brand-paper',
                    ].join(' ')}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => set(d.id, 'declined')}
                    disabled={busy === d.id}
                    className={[
                      'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                      status === 'declined' ? 'bg-status-alert text-white' : 'border border-brand-line hover:bg-brand-paper',
                    ].join(' ')}
                  >
                    Decline
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

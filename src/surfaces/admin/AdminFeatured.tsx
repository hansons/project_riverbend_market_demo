import { useState } from 'react';
import {
  fetchAllVendors,
  setVendorFeatured,
  fetchFeaturedSchedule,
  addFeaturedWeek,
  removeFeaturedWeek,
} from '@/lib/adminData';
import { fetchMarketDates } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { pickWeeklyFeatured } from '@/lib/featured';
import { categoryEmoji, formatDate } from '@/lib/format';
import type { FeaturedScheduleRow } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function AdminFeatured() {
  const { data: vendors, loading, reload } = useAsync(fetchAllVendors, [], []);
  const { data: schedule, reload: reloadSchedule } = useAsync(fetchFeaturedSchedule, [], []);
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const [busy, setBusy] = useState<string | null>(null);
  const [week, setWeek] = useState('');

  const active = vendors.filter((v) => v.status === 'active');
  const pool = active.filter((v) => v.featured);
  const rotation = pickWeeklyFeatured(pool);

  const today = todayISO();
  const weeks = dates.filter((d) => d.markets?.day_of_week === 'Saturday' && d.date >= today);
  const selectedWeek = week || weeks[0]?.date || '';
  const thisWeek = schedule.filter((s) => s.week_of === selectedWeek);
  const thisWeekIds = new Set(thisWeek.map((s) => s.vendor_id));

  const byWeek = new Map<string, FeaturedScheduleRow[]>();
  for (const s of schedule) (byWeek.get(s.week_of) ?? byWeek.set(s.week_of, []).get(s.week_of)!).push(s);
  const scheduledWeeks = [...byWeek.keys()].sort();

  async function toggleStar(id: string, featured: boolean) {
    setBusy(id);
    await setVendorFeatured(id, featured);
    setBusy(null);
    reload();
  }

  async function toggleWeek(vendorId: string) {
    if (!selectedWeek) return;
    const existing = schedule.find((s) => s.week_of === selectedWeek && s.vendor_id === vendorId);
    setBusy(vendorId);
    if (existing) await removeFeaturedWeek(existing.id);
    else await addFeaturedWeek(vendorId, selectedWeek);
    setBusy(null);
    reloadSchedule();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Featured vendors</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Schedule the home-page spotlight for specific weeks. A scheduled week shows exactly who you pick;
          any week you leave unscheduled <strong>auto-rotates</strong> your starred pool instead.
        </p>
      </div>

      {/* Schedule */}
      <div className="card border-brand-accent bg-brand-accent/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="field-label">Spotlight schedule</p>
            <p className="mt-0.5 text-xs text-brand-muted">Pick a market week, then star vendors for it below.</p>
          </div>
          {weeks.length > 0 && (
            <label className="block">
              <span className="field-label">Week</span>
              <select className="field-input" value={selectedWeek} onChange={(e) => setWeek(e.target.value)}>
                {weeks.map((d) => (
                  <option key={d.id} value={d.date}>{formatDate(d.date)}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-3 text-sm">
          {thisWeek.length > 0 ? (
            <>
              <span className="text-brand-muted">Showing {formatDate(selectedWeek)}:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {thisWeek.map((s) => (
                  <span key={s.id} className="chip">{categoryEmoji(s.vendors?.category ?? '')} {s.vendors?.name}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="text-brand-berry">{selectedWeek ? `${formatDate(selectedWeek)} is unscheduled` : 'No upcoming weeks'}</span>
              {rotation.length > 0 && (
                <span className="text-brand-muted">
                  {' '}— auto-rotating: {rotation.map((v) => v.name).join(', ')}
                </span>
              )}
            </>
          )}
        </div>

        {scheduledWeeks.length > 0 && (
          <div className="mt-4 border-t border-brand-line pt-3">
            <p className="field-label">Scheduled weeks</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {scheduledWeeks.map((w) => (
                <li key={w}>
                  <span className="font-medium text-brand-ink">{formatDate(w)}:</span>{' '}
                  <span className="text-brand-muted">{byWeek.get(w)!.map((s) => s.vendors?.name).join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Vendor controls */}
      <div>
        <h3 className="text-lg">Vendors ({active.length})</h3>
        <p className="mt-0.5 text-xs text-brand-muted">
          <strong>This week</strong> = spotlight for {selectedWeek ? formatDate(selectedWeek) : 'the selected week'}.{' '}
          <strong>Pool</strong> = include in the auto-rotation used on unscheduled weeks.
        </p>
        {loading ? (
          <div className="mt-3 h-64 animate-pulse rounded-2xl bg-brand-card" />
        ) : (
          <div className="card mt-3 divide-y divide-brand-line">
            {active.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">
                  {categoryEmoji(v.category)} <span className="font-medium text-brand-ink">{v.name}</span>
                  <span className="ml-1 text-xs text-brand-muted">· {v.category}</span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleWeek(v.id)}
                    disabled={busy === v.id || !selectedWeek}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                      thisWeekIds.has(v.id)
                        ? 'border-brand-accent bg-brand-accent/20 text-brand-ink'
                        : 'border-brand-line text-brand-muted hover:bg-brand-paper',
                    ].join(' ')}
                  >
                    {thisWeekIds.has(v.id) ? '★ This week' : '☆ This week'}
                  </button>
                  <button
                    onClick={() => toggleStar(v.id, !v.featured)}
                    disabled={busy === v.id}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                      v.featured
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-dark'
                        : 'border-brand-line text-brand-muted hover:bg-brand-paper',
                    ].join(' ')}
                  >
                    {v.featured ? '★ Pool' : '☆ Pool'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

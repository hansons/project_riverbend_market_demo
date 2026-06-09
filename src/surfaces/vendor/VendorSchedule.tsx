import { useState } from 'react';
import { fetchMarketDates, fetchMySchedule, setScheduleStatus } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { formatDate } from '@/lib/format';
import type { ScheduleStatus, Vendor } from '@/lib/types';

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

  const byDate = new Map(sched.map((s) => [s.market_date_id, s]));

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

      {loading ? (
        <div className="mt-5 h-40 animate-pulse rounded-xl bg-brand-paper" />
      ) : dates.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">No upcoming dates scheduled.</p>
      ) : (
        <ul className="mt-5 divide-y divide-brand-line">
          {dates.map((d) => {
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
                    {row?.status === 'confirmed' && row.stall && (
                      <span className="text-brand-muted">Stall {row.stall}</span>
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

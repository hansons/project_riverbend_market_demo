import { useState } from 'react';
import { fetchMarketDates } from '@/lib/vendorData';
import { fetchScheduleForDate, setStall } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { formatDate } from '@/lib/format';

export function AdminStalls() {
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const [picked, setPicked] = useState('');
  const dateId = picked || dates[0]?.id || '';
  const { data: rows, loading, reload } = useAsync(
    () => (dateId ? fetchScheduleForDate(dateId) : Promise.resolve([])),
    [dateId],
    [],
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const confirmed = rows.filter((r) => r.status === 'confirmed');
  const others = rows.filter((r) => r.status !== 'confirmed');
  const unassigned = confirmed.filter((r) => !(edits[r.id] ?? r.stall)).length;

  async function save(id: string, current: string | null) {
    setBusy(id);
    await setStall(id, edits[id] ?? current ?? '');
    setBusy(null);
    reload();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl">Stall assignment</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Assign stalls for a market day. Vendors see their stall the moment you save it.
          </p>
        </div>
        <label className="block">
          <span className="field-label">Market day</span>
          <select className="field-input" value={dateId} onChange={(e) => setPicked(e.target.value)}>
            {dates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.markets?.name} · {formatDate(d.date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        <span className="chip">{confirmed.length} confirmed</span>
        <span className={`chip ${unassigned ? 'text-brand-berry' : ''}`}>{unassigned} unassigned</span>
      </div>

      {loading ? (
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-brand-card" />
      ) : (
        <div className="card mt-4 divide-y divide-brand-line">
          {confirmed.map((r) => {
            const value = edits[r.id] ?? r.stall ?? '';
            const dirty = (edits[r.id] ?? r.stall ?? '') !== (r.stall ?? '');
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 truncate font-medium text-brand-ink">{r.vendors?.name ?? 'Vendor'}</span>
                <div className="flex items-center gap-2">
                  <input
                    value={value}
                    onChange={(e) => setEdits((m) => ({ ...m, [r.id]: e.target.value }))}
                    placeholder="Stall #"
                    className="w-24 rounded-lg border border-brand-line bg-brand-card px-2.5 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
                  />
                  <button
                    onClick={() => save(r.id, r.stall)}
                    disabled={busy === r.id || !dirty}
                    className="btn-primary px-3 py-1.5 disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
          {confirmed.length === 0 && <p className="p-4 text-sm text-brand-muted">No confirmed vendors for this day yet.</p>}
        </div>
      )}

      {others.length > 0 && (
        <p className="mt-3 text-xs text-brand-muted">
          Also for this day: {others.map((o) => `${o.vendors?.name} (${o.status})`).join(', ')}.
        </p>
      )}
    </div>
  );
}

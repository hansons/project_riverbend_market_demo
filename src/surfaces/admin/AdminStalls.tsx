import { useState } from 'react';
import { fetchMarketDates } from '@/lib/vendorData';
import {
  fetchScheduleForDate,
  fetchAllVendors,
  setStalls,
  addVendorToDay,
  removeFromDay,
  copyAssignments,
} from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { categoryEmoji, formatDate } from '@/lib/format';
import { MarketMap } from '@/components/MarketMap';

const TOTAL_STALLS = 48; // A–D × 12

export function AdminStalls() {
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const { data: allVendors } = useAsync(fetchAllVendors, [], []);
  const [picked, setPicked] = useState('');
  const dateId = picked || dates[0]?.id || '';
  const { data: rows, loading, reload } = useAsync(
    () => (dateId ? fetchScheduleForDate(dateId) : Promise.resolve([])),
    [dateId],
    [],
  );

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const confirmed = rows.filter((r) => r.status === 'confirmed');
  const scheduledIds = new Set(confirmed.map((r) => r.vendor_id));
  const addable = allVendors.filter((v) => v.status === 'active' && !scheduledIds.has(v.id));

  const selectedRow = confirmed.find((r) => r.vendor_id === selectedVendorId) ?? null;

  const occupied: Record<string, { name: string }> = {};
  for (const r of confirmed) for (const st of r.stalls) occupied[st] = { name: r.vendors?.name ?? 'Vendor' };
  const filledCells = Object.keys(occupied).length;

  // Category coverage + balance recommendations: which categories the active
  // vendor pool can offer, how many are scheduled today, and who fills the gaps.
  const activeCats = [...new Set(allVendors.filter((v) => v.status === 'active').map((v) => v.category))].sort();
  const schedByCat: Record<string, number> = {};
  for (const r of confirmed) {
    const c = r.vendors?.category ?? '—';
    schedByCat[c] = (schedByCat[c] ?? 0) + 1;
  }
  const gapCats = activeCats.filter((c) => !schedByCat[c]);
  const balanceSuggestions = addable.filter((v) => gapCats.includes(v.category));
  const otherAddable = addable.filter((v) => !gapCats.includes(v.category));

  // Previous date of the same market, for "Copy last market".
  const current = dates.find((d) => d.id === dateId);
  const prev = current
    ? dates
        .filter((d) => d.market_id === current.market_id && d.date < current.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setHint(null);
    const err = await fn();
    setBusy(false);
    if (err) setHint(err);
    else reload();
  }

  async function clickCell(label: string) {
    if (!selectedRow) {
      setHint('Pick a vendor on the right first, then click stalls to place them.');
      return;
    }
    const owner = confirmed.find((r) => r.stalls.includes(label));
    if (owner && owner.vendor_id !== selectedRow.vendor_id) {
      setHint(`${label} is taken by ${owner.vendors?.name}.`);
      return;
    }
    const cur = selectedRow.stalls;
    const next = cur.includes(label) ? cur.filter((s) => s !== label) : [...cur, label];
    await run(() => setStalls(selectedRow.id, next));
  }

  function copyLast() {
    if (!prev) return;
    if (!window.confirm(`Copy ${prev.markets?.name}'s lineup from ${formatDate(prev.date)} onto this day? Existing assignments for matching vendors will be overwritten.`))
      return;
    run(() => copyAssignments(prev.id, dateId));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl">Stall assignment</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Pick a vendor, then click stalls on the map to place them. Vendors can hold more than one
            stall. Dashed cells are open.
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

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={copyLast}
          disabled={busy || !prev}
          title={prev ? '' : 'No earlier date for this market'}
        >
          ↺ {prev ? `Copy ${prev.markets?.name} · ${formatDate(prev.date)}` : 'No previous market to copy'}
        </button>
        <span className="chip">{confirmed.length} vendors</span>
        <span className="chip">{filledCells} stalls filled</span>
        <span className="chip">{TOTAL_STALLS - filledCells} open</span>
        {addable.length > 0 && <span className="chip text-brand-berry">{addable.length} not scheduled</span>}
      </div>

      {!loading && dateId && activeCats.length > 0 && (
        <div>
          <p className="field-label">
            Category mix
            {gapCats.length > 0 && (
              <span className="ml-2 font-normal text-brand-berry">
                · {gapCats.length} categor{gapCats.length > 1 ? 'ies' : 'y'} unfilled
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {activeCats.map((c) => {
              const n = schedByCat[c] ?? 0;
              return (
                <span
                  key={c}
                  title={n === 0 ? `No ${c} vendor scheduled` : `${n} ${c} vendor${n > 1 ? 's' : ''}`}
                  className={
                    n === 0
                      ? 'rounded-full border border-dashed border-brand-berry px-2.5 py-0.5 text-xs font-medium text-brand-berry'
                      : 'chip'
                  }
                >
                  {c} · {n}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {hint && <p className="text-sm text-brand-berry">{hint}</p>}

      {!loading && dateId && <MarketMap occupied={occupied} highlight={selectedRow?.stalls ?? null} onCellClick={clickCell} />}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scheduled (placeable) */}
        <div>
          <h3 className="text-lg">Scheduled today ({confirmed.length})</h3>
          <p className="mt-0.5 text-xs text-brand-muted">Click a vendor to select, then click map stalls.</p>
          {loading ? (
            <div className="mt-3 h-40 animate-pulse rounded-2xl bg-brand-card" />
          ) : confirmed.length === 0 ? (
            <p className="mt-2 text-sm text-brand-muted">No confirmed vendors yet — add some, or copy last market.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {confirmed.map((r) => {
                const selected = r.vendor_id === selectedVendorId;
                return (
                  <div
                    key={r.id}
                    className={`card p-3 ${selected ? 'ring-2 ring-brand-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="min-w-0 truncate text-left text-sm font-medium text-brand-ink"
                        onClick={() => setSelectedVendorId(selected ? null : r.vendor_id)}
                      >
                        {categoryEmoji(r.vendors?.category ?? '')} {r.vendors?.name}
                      </button>
                      <button
                        onClick={() => {
                          if (selected) setSelectedVendorId(null);
                          run(() => removeFromDay(r.id));
                        }}
                        disabled={busy}
                        className="shrink-0 text-xs font-semibold text-status-alert hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.stalls.length ? (
                        r.stalls.map((s) => <span key={s} className="chip">{s}</span>)
                      ) : (
                        <span className="text-xs text-brand-berry">
                          {selected ? 'Click open stalls on the map →' : 'No stall — select & place'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add vendors */}
        <div>
          <h3 className="text-lg">Add a vendor ({addable.length})</h3>
          <p className="mt-0.5 text-xs text-brand-muted">Active vendors not yet on this day.</p>
          {addable.length === 0 ? (
            <p className="mt-2 text-sm text-brand-muted">Every active vendor is scheduled.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {balanceSuggestions.length > 0 && (
                <div className="rounded-2xl border border-brand-accent bg-brand-accent/5 p-3">
                  <p className="text-xs font-semibold text-brand-ink">⚖️ Suggested to balance the mix</p>
                  <p className="mt-0.5 text-[11px] text-brand-muted">Fills categories with no vendor this day.</p>
                  <div className="mt-2 divide-y divide-brand-line">
                    {balanceSuggestions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          {categoryEmoji(v.category)} <span className="font-medium text-brand-ink">{v.name}</span>
                          <span className="ml-1 text-xs text-brand-berry">fills {v.category}</span>
                        </span>
                        <button
                          onClick={() => run(() => addVendorToDay(v.id, dateId)).then(() => setSelectedVendorId(v.id))}
                          disabled={busy}
                          className="shrink-0 rounded-lg border border-brand-accent px-3 py-1 text-xs font-semibold text-brand-ink hover:bg-brand-accent/15"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {otherAddable.length > 0 && (
                <div className="card divide-y divide-brand-line">
                  {otherAddable.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="min-w-0 truncate">
                        {categoryEmoji(v.category)} <span className="font-medium text-brand-ink">{v.name}</span>
                        <span className="ml-1 text-xs text-brand-muted">· {v.category}</span>
                      </span>
                      <button
                        onClick={() => run(() => addVendorToDay(v.id, dateId)).then(() => setSelectedVendorId(v.id))}
                        disabled={busy}
                        className="shrink-0 rounded-lg border border-brand-line px-3 py-1 text-xs font-semibold hover:bg-brand-paper"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

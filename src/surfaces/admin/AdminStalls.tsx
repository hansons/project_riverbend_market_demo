import { useState } from 'react';
import { fetchMarketDates } from '@/lib/vendorData';
import { useKeyNav } from '@/lib/useKeyNav';
import {
  fetchScheduleForDate,
  fetchAllVendors,
  fetchAllSchedule,
  upsertScheduleBulk,
  setStalls,
  addVendorToDay,
  removeFromDay,
  copyAssignments,
} from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import { categoryEmoji, formatDate } from '@/lib/format';
import { MarketMap } from '@/components/MarketMap';
import { MarketGeoMap } from '@/components/MarketGeoMap';
import { StallLayoutEditor } from '@/components/StallLayoutEditor';
import { StallGridEditor } from '@/components/StallGridEditor';
import { fetchMarketStalls } from '@/lib/stalls';
import { CsvToolbar } from '@/components/CsvToolbar';

const TOTAL_STALLS = 48; // A–D × 12

const CSV_HEADER = ['date', 'market', 'vendor', 'slug', 'stalls', 'status'];
const CSV_SAMPLE: string[][] = [
  CSV_HEADER,
  ['2026-06-13', 'Saturday Market', 'Fern Hollow Farm', 'fern-hollow-farm', 'B11 B12', 'confirmed'],
  ['2026-06-13', 'Saturday Market', 'Rolling Oak Bakery', 'rolling-oak-bakery', 'A3', 'confirmed'],
];
const VALID_STATUS = new Set(['confirmed', 'pending', 'declined']);

interface ImportRow {
  vendor_id: string;
  market_date_id: string;
  status: string;
  stalls: string[];
}

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function AdminStalls() {
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const { data: allVendors } = useAsync(fetchAllVendors, [], []);
  const [picked, setPicked] = useState('');
  // Past dates stay in `dates` (they're copy sources) but aren't shown in the picker.
  const today = todayISO();
  const upcomingDates = dates.filter((d) => d.date >= today);
  const dateId = picked || upcomingDates[0]?.id || dates[0]?.id || '';
  const { data: rows, loading, reload } = useAsync(
    () => (dateId ? fetchScheduleForDate(dateId) : Promise.resolve([])),
    [dateId],
    [],
  );

  const currentMarketId = dates.find((d) => d.id === dateId)?.market_id ?? null;
  const { data: marketStalls, reload: reloadStalls } = useAsync(
    () => (currentMarketId ? fetchMarketStalls(currentMarketId) : Promise.resolve([])),
    [currentMarketId],
    [],
  );
  const disabledStalls = new Set(marketStalls.filter((s) => s.disabled).map((s) => s.label));

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'grid' | 'satellite'>('grid');
  const [editingLayout, setEditingLayout] = useState(false);
  const [editingGridStalls, setEditingGridStalls] = useState(false);
  const [importPreview, setImportPreview] = useState<{ rows: ImportRow[]; skipped: number; dates: Set<string> } | null>(null);

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

  // Previous date of the same market, for "Copy last week" (the prior occurrence
  // of this market — i.e. last week for a weekly market; may be a past date).
  const current = dates.find((d) => d.id === dateId);
  const prev = current
    ? dates
        .filter((d) => d.market_id === current.market_id && d.date < current.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;

  // Week navigation: ◀ A / D ▶ step through upcoming market days so the operator
  // can copy-last-week → tweak → advance, building out the calendar quickly.
  const curIdx = upcomingDates.findIndex((d) => d.id === dateId);
  const canPrev = curIdx > 0;
  const canNext = curIdx >= 0 && curIdx < upcomingDates.length - 1;

  function goToDate(id: string) {
    setPicked(id);
    setSelectedVendorId(null);
    setHint(null);
  }
  function stepWeek(delta: number) {
    const base = curIdx < 0 ? 0 : curIdx;
    const ni = base + delta;
    if (ni >= 0 && ni < upcomingDates.length) goToDate(upcomingDates[ni].id);
  }

  // A/D (and ←/→) step between upcoming market days.
  useKeyNav({
    length: upcomingDates.length,
    index: curIdx,
    onIndex: (i) => goToDate(upcomingDates[i].id),
    prevKeys: ['a', 'arrowleft'],
    nextKeys: ['d', 'arrowright'],
  });

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
    if (disabledStalls.has(label) && !selectedRow.stalls.includes(label)) {
      setHint(`${label} is disabled — re-enable it in Satellite → Edit layout to assign it.`);
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

  async function exportSeason() {
    const all = await fetchAllSchedule();
    const out = [CSV_HEADER, ...all.map((r) => [r.date, r.market, r.vendor, r.slug, r.stalls.join(' '), r.status])];
    downloadCSV('riverbend-stall-assignments.csv', toCSV(out));
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHint(null);
    const parsed = parseCSVObjects(await file.text());
    const resolved: ImportRow[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    for (const row of parsed) {
      const date = (row.date ?? '').trim();
      if (!date) continue;
      const market = (row.market ?? '').trim().toLowerCase();
      const md =
        dates.find((d) => d.date === date && (!market || (d.markets?.name ?? '').toLowerCase() === market)) ??
        dates.find((d) => d.date === date);
      const slug = (row.slug ?? '').trim();
      const name = (row.vendor ?? '').trim().toLowerCase();
      const v =
        (slug && allVendors.find((x) => x.slug === slug)) ||
        allVendors.find((x) => x.name.toLowerCase() === name);
      if (!md || !v) {
        skipped++;
        continue;
      }
      const status = VALID_STATUS.has((row.status ?? '').trim()) ? (row.status ?? '').trim() : 'confirmed';
      const stalls = (row.stalls ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
      resolved.push({ vendor_id: v.id, market_date_id: md.id, status, stalls });
      seen.add(date);
    }
    if (!resolved.length) {
      setHint('No rows matched a known date + vendor. Header: date, market, vendor, slug, stalls, status.');
      return;
    }
    setImportPreview({ rows: resolved, skipped, dates: seen });
  }

  async function applyImport() {
    if (!importPreview) return;
    setBusy(true);
    setHint(null);
    const err = await upsertScheduleBulk(importPreview.rows);
    setBusy(false);
    if (err) setHint(err);
    else {
      setImportPreview(null);
      reload();
    }
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
        <div className="flex items-end gap-3">
          <div>
            <span className="field-label">Market day</span>
            <div className="mt-1 flex items-stretch gap-1">
              <button
                type="button"
                className="btn-outline px-2.5 disabled:opacity-40"
                onClick={() => stepWeek(-1)}
                disabled={!canPrev}
                title="Previous market day (A)"
                aria-label="Previous market day"
              >
                ◀
              </button>
              <select className="field-input" value={dateId} onChange={(e) => goToDate(e.target.value)}>
                {upcomingDates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.markets?.name} · {formatDate(d.date)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline px-2.5 disabled:opacity-40"
                onClick={() => stepWeek(1)}
                disabled={!canNext}
                title="Next market day (D)"
                aria-label="Next market day"
              >
                ▶
              </button>
            </div>
            <p className="mt-1 text-[11px] text-brand-muted">Keys: A ◀ prev · D ▶ next</p>
          </div>
          <CsvToolbar
            onSample={() => downloadCSV('stall-assignments-sample.csv', toCSV(CSV_SAMPLE))}
            onExport={exportSeason}
            onImport={onImportFile}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={copyLast}
          disabled={busy || !prev}
          title={prev ? `Copy this market's previous week (${formatDate(prev.date)})` : 'No earlier date for this market'}
        >
          ↺ {prev ? `Copy last week · ${formatDate(prev.date)}` : 'No previous week to copy'}
        </button>
        <span className="chip">{confirmed.length} vendors</span>
        <span className="chip">{filledCells} stalls filled</span>
        <span className="chip">{TOTAL_STALLS - filledCells} open</span>
        {addable.length > 0 && <span className="chip text-brand-berry">{addable.length} not scheduled</span>}
      </div>

      {importPreview && (
        <div className="card border-brand-accent p-5">
          <p className="font-semibold text-brand-primary-dark">
            Apply {importPreview.rows.length} assignment{importPreview.rows.length === 1 ? '' : 's'} across{' '}
            {importPreview.dates.size} date{importPreview.dates.size === 1 ? '' : 's'}?
          </p>
          {importPreview.skipped > 0 && (
            <p className="mt-1 text-xs text-brand-berry">
              {importPreview.skipped} row{importPreview.skipped === 1 ? '' : 's'} skipped — unknown vendor or date.
            </p>
          )}
          <p className="mt-1 text-xs text-brand-muted">Existing assignments for the same vendor + date are overwritten.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={applyImport} disabled={busy}>
              {busy ? 'Applying…' : 'Apply import'}
            </button>
            <button className="btn-ghost" onClick={() => setImportPreview(null)} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

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

      {!loading && dateId && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {(['grid', 'satellite'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMapView(m);
                  setEditingLayout(false);
                  setEditingGridStalls(false);
                }}
                className={[
                  'rounded-full border px-3 py-1 text-sm font-medium transition',
                  mapView === m
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-brand-line bg-brand-card text-brand-ink/70',
                ].join(' ')}
              >
                {m === 'grid' ? 'Grid' : '🛰 Satellite'}
              </button>
            ))}
            {mapView === 'grid' && !editingGridStalls && currentMarketId && (
              <button
                onClick={() => setEditingGridStalls(true)}
                className="rounded-full border border-brand-line bg-brand-card px-3 py-1 text-sm font-medium text-brand-ink/70 hover:bg-brand-paper"
              >
                ✏ Edit stalls
              </button>
            )}
            {mapView === 'satellite' && !editingLayout && currentMarketId && (
              <button
                onClick={() => setEditingLayout(true)}
                className="rounded-full border border-brand-line bg-brand-card px-3 py-1 text-sm font-medium text-brand-ink/70 hover:bg-brand-paper"
              >
                ✏ Edit layout
              </button>
            )}
          </div>
          {mapView === 'grid' ? (
            editingGridStalls && currentMarketId ? (
              <StallGridEditor
                key={currentMarketId}
                marketId={currentMarketId}
                initialStalls={marketStalls}
                onSaved={() => {
                  reloadStalls();
                  setEditingGridStalls(false);
                }}
                onCancel={() => setEditingGridStalls(false)}
              />
            ) : (
              <MarketMap occupied={occupied} highlight={selectedRow?.stalls ?? null} onCellClick={clickCell} stalls={marketStalls} />
            )
          ) : editingLayout && currentMarketId ? (
            <StallLayoutEditor
              key={currentMarketId}
              marketId={currentMarketId}
              initialStalls={marketStalls}
              onSaved={() => {
                reloadStalls();
                setEditingLayout(false);
              }}
              onCancel={() => setEditingLayout(false)}
            />
          ) : (
            <MarketGeoMap
              key={currentMarketId ?? 'none'}
              occupied={occupied}
              highlight={selectedRow?.stalls ?? null}
              onCellClick={clickCell}
              stalls={marketStalls}
            />
          )}
        </div>
      )}

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

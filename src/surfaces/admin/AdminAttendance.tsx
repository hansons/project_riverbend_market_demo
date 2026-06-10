import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { fetchMarketDates } from '@/lib/vendorData';
import { fetchReconciliation } from '@/lib/tokens';
import {
  computeForecast,
  fetchAttendance,
  fetchConfirmedCounts,
  fetchEventCounts,
  recordAttendance,
} from '@/lib/attendance';
import { useAsync } from '@/lib/useAsync';
import { useKeyNav } from '@/lib/useKeyNav';
import { formatDate, formatMoney } from '@/lib/format';
import { downloadCSV, toCSV } from '@/lib/csv';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function AdminAttendance() {
  const { profile } = useAuth();
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const { data: history, reload: reloadHistory } = useAsync(fetchAttendance, [], []);
  const { data: confirmedByDate } = useAsync(fetchConfirmedCounts, [], {} as Record<string, number>);
  const { data: eventCountByDate } = useAsync(fetchEventCounts, [], {} as Record<string, number>);
  const { data: recon } = useAsync(fetchReconciliation, [], []);

  const [dateId, setDateId] = useState('');
  const [attendance, setAttendance] = useState('');
  const [method, setMethod] = useState('clicker');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'ok' | string | null>(null);

  const today = todayISO();
  const defaultId =
    (dates.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? dates[0])?.id ?? '';
  const selectedId = dateId || defaultId;
  const dayIdx = dates.findIndex((d) => d.id === selectedId);
  function stepDay(delta: number) {
    const base = dayIdx < 0 ? 0 : dayIdx;
    const ni = base + delta;
    if (ni >= 0 && ni < dates.length) setDateId(dates[ni].id);
  }
  // A/D (and ←/→) step between market days.
  useKeyNav({
    length: dates.length,
    index: dayIdx,
    onIndex: (i) => setDateId(dates[i].id),
    prevKeys: ['a', 'arrowleft'],
    nextKeys: ['d', 'arrowright'],
  });
  const target = dates.find((d) => d.id === selectedId) ?? null;

  const existing = target ? history.find((h) => h.market_id === target.market_id && h.market_date === target.date) : null;
  const forecast = target ? computeForecast({ target, history, confirmedByDate, eventCountByDate }) : null;

  const tokenIssued = target ? recon.filter((r) => r.market_date === target.date).reduce((s, r) => s + r.issued_cents, 0) : 0;
  const confirmedCount = target ? confirmedByDate[target.date] ?? 0 : 0;

  const sameMarketHistory = target
    ? history.filter((h) => h.market_id === target.market_id).sort((a, b) => b.market_date.localeCompare(a.market_date))
    : [];

  async function save() {
    if (!target) return;
    const n = parseInt(attendance, 10);
    if (!Number.isFinite(n) || n < 0) {
      setResult('Enter a headcount.');
      return;
    }
    setSaving(true);
    setResult(null);
    const err = await recordAttendance({
      market_id: target.market_id,
      market_date: target.date,
      attendance: n,
      method: method || null,
      weather: weather.trim() || null,
      notes: notes.trim() || null,
      recorded_by: profile?.full_name ?? 'Market staff',
    });
    setSaving(false);
    setResult(err ?? 'ok');
    if (!err) {
      setAttendance('');
      setWeather('');
      setNotes('');
      reloadHistory();
    }
  }

  function exportHistory() {
    const marketName = (id: string | null) => dates.find((d) => d.market_id === id)?.markets?.name ?? id ?? '';
    const header = ['market', 'date', 'attendance', 'method', 'weather', 'notes'];
    const rows = history.map((h) => [
      marketName(h.market_id),
      h.market_date,
      String(h.attendance ?? ''),
      h.method ?? '',
      h.weather ?? '',
      h.notes ?? '',
    ]);
    downloadCSV('riverbend-attendance.csv', toCSV([header, ...rows]));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Attendance</h2>
        <div>
          <span className="field-label">Market day</span>
          <div className="mt-1 flex items-stretch gap-1">
            <button
              type="button"
              className="btn-outline px-2.5 disabled:opacity-40"
              onClick={() => stepDay(-1)}
              disabled={dayIdx <= 0}
              title="Previous market day (A)"
              aria-label="Previous market day"
            >
              ◀
            </button>
            <select className="field-input" value={selectedId} onChange={(e) => setDateId(e.target.value)}>
              {dates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.markets?.name ? `${d.markets.name} · ` : ''}
                  {formatDate(d.date)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-outline px-2.5 disabled:opacity-40"
              onClick={() => stepDay(1)}
              disabled={dayIdx < 0 || dayIdx >= dates.length - 1}
              title="Next market day (D)"
              aria-label="Next market day"
            >
              ▶
            </button>
          </div>
          <p className="mt-1 text-[11px] text-brand-muted">Keys: A ◀ · D ▶</p>
        </div>
      </div>

      {/* Forecast */}
      <div className="card p-5">
        <p className="field-label">Forecast · {target ? formatDate(target.date) : '—'}</p>
        {forecast && forecast.forecast != null ? (
          <>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-brand-primary-dark">{forecast.forecast}</span>
              <span className="text-sm text-brand-muted">
                range {forecast.low}–{forecast.high} · {forecast.confidence} confidence ({forecast.basis} prior)
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {forecast.components.map((c, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-brand-ink">{c.label}</span>
                  <span className="text-brand-muted">{c.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-brand-muted">
              Estimate only — a transparent blend of history and that day's vendor/event signals, not a measured count.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-brand-muted">
            {forecast?.components[0]?.detail ?? 'Select a market day.'}
          </p>
        )}
      </div>

      {/* Record actual */}
      <div className="card p-5">
        <p className="field-label">Record actual headcount</p>
        {existing?.attendance != null && (
          <p className="mt-1 text-sm text-brand-muted">
            Currently recorded: <span className="font-semibold text-brand-ink">{existing.attendance}</span>
            {existing.method ? ` · ${existing.method}` : ''}
            {existing.weather ? ` · ${existing.weather}` : ''} — saving again updates it.
          </p>
        )}
        <p className="mt-2 rounded-lg bg-brand-paper px-3 py-2 text-xs text-brand-muted">
          💡 Hints for {target ? formatDate(target.date) : 'this day'}: {confirmedCount} vendor
          {confirmedCount === 1 ? '' : 's'} confirmed · {formatMoney(tokenIssued)} SNAP/Double Up issued
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input inputMode="numeric" className="field-input" value={attendance} onChange={(e) => { setAttendance(e.target.value); setResult(null); }} placeholder="Headcount" />
          <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="clicker">Clicker count</option>
            <option value="estimate">Manager estimate</option>
            <option value="parking">Parking count</option>
            <option value="other">Other</option>
          </select>
          <input className="field-input" value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Weather (optional)" />
          <input className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Update headcount' : 'Record headcount'}
          </button>
          {result === 'ok' && <span className="text-sm text-status-ok">✓ Saved</span>}
          {result && result !== 'ok' && <span className="text-sm text-status-alert">{result}</span>}
        </div>
      </div>

      {/* History */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Recorded attendance{target?.markets?.name ? ` · ${target.markets.name}` : ''}</h3>
          <button onClick={exportHistory} className="rounded-lg border border-brand-line px-3 py-1 text-xs font-semibold hover:bg-brand-paper">
            ⬇ CSV
          </button>
        </div>
        {sameMarketHistory.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No attendance recorded for this market yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-line">
            {sameMarketHistory.map((h, i) => {
              const prev = sameMarketHistory[i + 1];
              const delta = prev?.attendance != null && h.attendance != null ? h.attendance - prev.attendance : null;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-brand-ink">{formatDate(h.market_date)}</p>
                    <p className="text-sm text-brand-muted">
                      {h.method ?? '—'}
                      {h.weather ? ` · ${h.weather}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {delta != null && (
                      <span className={`text-xs font-semibold ${delta >= 0 ? 'text-status-ok' : 'text-status-alert'}`}>
                        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                      </span>
                    )}
                    <span className="text-lg font-semibold text-brand-ink">{h.attendance ?? '—'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

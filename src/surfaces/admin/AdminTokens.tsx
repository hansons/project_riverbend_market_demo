import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  fetchReconciliation,
  fetchRedemptionsForDate,
  fetchTokenCurrencies,
  recordIssuance,
  setReimbursed,
} from '@/lib/tokens';
import { fetchAllVendors } from '@/lib/adminData';
import { fetchMarketDates } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { useKeyNav } from '@/lib/useKeyNav';
import { CURRENCY_LABEL, formatDate, formatMoney } from '@/lib/format';
import { TokenQuickEntry } from '../vendor/TokenQuickEntry';
import type { MarketDate } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function defaultDay(dates: MarketDate[]): string {
  if (!dates.length) return '';
  const today = todayISO();
  const past = dates.filter((d) => d.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  return (past[0] ?? dates[0]).date;
}

export function AdminTokens() {
  const { profile } = useAuth();
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const { data: currencies } = useAsync(fetchTokenCurrencies, [], []);
  const { data: vendors } = useAsync(fetchAllVendors, [], []);
  const { data: recon, reload: reloadRecon } = useAsync(fetchReconciliation, [], []);

  const [day, setDay] = useState('');
  const dayValue = day || defaultDay(dates);
  const dayIdx = dates.findIndex((d) => d.date === dayValue);
  function stepDay(delta: number) {
    const base = dayIdx < 0 ? 0 : dayIdx;
    const ni = base + delta;
    if (ni >= 0 && ni < dates.length) setDay(dates[ni].date);
  }
  // A/D (and ←/→) step between market days.
  useKeyNav({
    length: dates.length,
    index: dayIdx,
    onIndex: (i) => setDay(dates[i].date),
    prevKeys: ['a', 'arrowleft'],
    nextKeys: ['d', 'arrowright'],
  });
  const [vendorId, setVendorId] = useState('');
  const activeVendors = vendors.filter((v) => v.status === 'active');
  const vendorValue = vendorId || activeVendors[0]?.id || '';

  const { data: dayRows, loading: dayLoading, reload: reloadDay } = useAsync(
    () => (dayValue ? fetchRedemptionsForDate(dayValue) : Promise.resolve([])),
    [dayValue],
    [],
  );

  const [issCurrency, setIssCurrency] = useState('');
  const [issTokens, setIssTokens] = useState('');
  const [issAmount, setIssAmount] = useState('');
  const [issBusy, setIssBusy] = useState(false);
  const [issResult, setIssResult] = useState<'ok' | string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const dayRecon = recon.filter((r) => r.market_date === dayValue);

  async function addIssuance() {
    const cents = Math.round(parseFloat(issAmount || '0') * 100);
    const count = parseInt(issTokens || '0', 10) || 0;
    const cur = issCurrency || currencies[0]?.code || '';
    if (!dayValue || !cur || (cents <= 0 && count <= 0)) {
      setIssResult('Pick a day and currency, and enter an amount or token count.');
      return;
    }
    setIssBusy(true);
    setIssResult(null);
    const err = await recordIssuance({ market_date: dayValue, currency: cur, amount_cents: cents, token_count: count });
    setIssBusy(false);
    setIssResult(err ?? 'ok');
    if (!err) {
      setIssTokens('');
      setIssAmount('');
      reloadRecon();
    }
  }

  async function toggleReimbursed(id: string, current: boolean) {
    setBusy(id);
    await setReimbursed(id, !current);
    setBusy(null);
    reloadDay();
    reloadRecon();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Token reconciliation (SNAP / Double Up)</h2>
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
            <select className="field-input" value={dayValue} onChange={(e) => setDay(e.target.value)}>
              {dates.map((d) => (
                <option key={d.id} value={d.date}>
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

      {/* Reconciliation for the day */}
      <div className="card p-5">
        <p className="field-label">Issued vs. redeemed · {dayValue ? formatDate(dayValue) : '—'}</p>
        {dayRecon.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No token activity recorded for this day yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {dayRecon.map((r) => {
              const pct = r.issued_cents > 0 ? Math.min(100, Math.round((r.redeemed_cents / r.issued_cents) * 100)) : 0;
              return (
                <li key={r.currency} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-brand-ink">{r.currency_label}</span>
                    <span className="text-brand-muted">
                      {formatMoney(r.redeemed_cents)} redeemed / {formatMoney(r.issued_cents)} issued
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-brand-paper">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-brand-muted">
                    <span>Outstanding float: {formatMoney(r.outstanding_cents)}</span>
                    <span>Owed to vendors: {formatMoney(r.owed_to_vendors_cents)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Issuance (admin logs the central EBT terminal) */}
      <div className="card p-5">
        <p className="field-label">Log issuance (market EBT terminal)</p>
        <p className="mt-1 text-xs text-brand-muted">
          The dollars/tokens issued at the market booth for {dayValue ? formatDate(dayValue) : 'the selected day'}.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <select className="field-input" value={issCurrency || currencies[0]?.code || ''} onChange={(e) => setIssCurrency(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <input inputMode="numeric" className="field-input" value={issTokens} onChange={(e) => setIssTokens(e.target.value)} placeholder="Tokens" />
          <input inputMode="decimal" className="field-input" value={issAmount} onChange={(e) => setIssAmount(e.target.value)} placeholder="Amount ($)" />
          <button className="btn-primary" onClick={addIssuance} disabled={issBusy}>
            {issBusy ? 'Logging…' : 'Log issuance'}
          </button>
        </div>
        {issResult === 'ok' && <p className="mt-2 text-sm text-status-ok">✓ Logged</p>}
        {issResult && issResult !== 'ok' && <p className="mt-2 text-sm text-status-alert">{issResult}</p>}
      </div>

      {/* Record a vendor's redemption (the "walking the market" flow) */}
      <div className="card p-5">
        <p className="field-label">Record a vendor's redemption</p>
        <label className="mt-2 block">
          <span className="field-label">Vendor</span>
          <select className="field-input" value={vendorValue} onChange={(e) => setVendorId(e.target.value)}>
            {activeVendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <div className="mt-3">
          <TokenQuickEntry
            vendorId={vendorValue}
            dates={dates}
            currencies={currencies}
            recordedBy={profile?.full_name ?? 'Market staff'}
            lockedDate={dayValue}
            onRecorded={() => {
              reloadDay();
              reloadRecon();
            }}
          />
        </div>
      </div>

      {/* Redemptions list + reimbursement toggle */}
      <div className="card p-6">
        <h3 className="text-lg">Redemptions · {dayValue ? formatDate(dayValue) : '—'}</h3>
        {dayLoading ? (
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-brand-paper" />
        ) : dayRows.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No redemptions recorded for this day.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-line">
            {dayRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-brand-ink">{r.vendors?.name ?? 'Vendor'}</p>
                  <p className="text-sm text-brand-muted">
                    {CURRENCY_LABEL[r.currency] ?? r.currency} · {r.token_count} token{r.token_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-brand-ink">{formatMoney(r.amount_cents)}</span>
                  <button
                    onClick={() => toggleReimbursed(r.id, r.reimbursed)}
                    disabled={busy === r.id}
                    className={[
                      'rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper',
                      r.reimbursed ? 'text-status-ok' : 'text-brand-berry',
                    ].join(' ')}
                  >
                    {r.reimbursed ? '✓ Reimbursed' : 'Mark reimbursed'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

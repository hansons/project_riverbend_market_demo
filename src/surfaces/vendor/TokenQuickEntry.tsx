import { useState } from 'react';
import { recordRedemption } from '@/lib/tokens';
import { formatDate } from '@/lib/format';
import type { MarketDate, TokenCurrency } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Default to the most recent market day on/before today, else the earliest date. */
function defaultDate(dates: MarketDate[]): string {
  if (!dates.length) return '';
  const today = todayISO();
  const past = dates.filter((d) => d.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  return (past[0] ?? dates[0]).date;
}

/** Fast, mobile-friendly token-redemption entry. Shared by the vendor and admin
 *  surfaces — the admin passes whichever vendor it picked; the vendor passes its own id. */
export function TokenQuickEntry({
  vendorId,
  dates,
  currencies,
  recordedBy,
  onRecorded,
  lockedDate,
}: {
  vendorId: string;
  dates: MarketDate[];
  currencies: TokenCurrency[];
  recordedBy: string | null;
  onRecorded: () => void;
  /** When set (admin "walk the market" flow), the parent owns the date and the
   *  in-component date picker is hidden. */
  lockedDate?: string;
}) {
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('');
  const [tokens, setTokens] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'ok' | string | null>(null);

  const dateValue = lockedDate ?? (date || defaultDate(dates));
  const currencyValue = currency || currencies[0]?.code || '';

  async function record() {
    const cents = Math.round(parseFloat(amount || '0') * 100);
    const count = parseInt(tokens || '0', 10) || 0;
    if (!vendorId || !dateValue || !currencyValue || (cents <= 0 && count <= 0)) {
      setResult('Pick a day and currency, and enter an amount or token count.');
      return;
    }
    setBusy(true);
    setResult(null);
    const err = await recordRedemption({
      vendor_id: vendorId,
      market_date: dateValue,
      currency: currencyValue,
      amount_cents: cents,
      token_count: count,
      recorded_by: recordedBy,
    });
    setBusy(false);
    setResult(err ?? 'ok');
    if (!err) {
      setTokens('');
      setAmount('');
      onRecorded();
    }
  }

  return (
    <div className="rounded-xl border border-brand-line bg-brand-card p-4">
      {!lockedDate && (
        <label className="block">
          <span className="field-label">Market day</span>
          <select className="field-input" value={dateValue} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d.id} value={d.date}>
                {d.markets?.name ? `${d.markets.name} · ` : ''}
                {formatDate(d.date)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={lockedDate ? '' : 'mt-3'}>
        <span className="field-label">Currency</span>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {currencies.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              className={[
                'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                currencyValue === c.code
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-line bg-brand-card text-brand-ink/75',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Tokens</span>
          <input inputMode="numeric" className="field-input text-lg" value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="0" />
        </label>
        <label className="block">
          <span className="field-label">Amount ($)</span>
          <input inputMode="decimal" className="field-input text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button className="btn-primary w-full sm:w-auto" onClick={record} disabled={busy}>
          {busy ? 'Recording…' : 'Record'}
        </button>
        {result === 'ok' && <span className="text-sm text-status-ok">✓ Recorded</span>}
        {result && result !== 'ok' && <span className="text-sm text-status-alert">{result}</span>}
      </div>
    </div>
  );
}

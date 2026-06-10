import { fetchMyRedemptions, fetchTokenCurrencies } from '@/lib/tokens';
import { fetchMarketDates } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { CURRENCY_LABEL, formatDate, formatMoney } from '@/lib/format';
import { TokenQuickEntry } from './TokenQuickEntry';
import type { Vendor } from '@/lib/types';

export function VendorTokens({ vendor }: { vendor: Vendor }) {
  const { data: dates } = useAsync(fetchMarketDates, [], []);
  const { data: currencies } = useAsync(fetchTokenCurrencies, [], []);
  const { data: rows, loading, reload } = useAsync(() => fetchMyRedemptions(vendor.id), [vendor.id], []);

  const owed = rows.filter((r) => !r.reimbursed).reduce((s, r) => s + r.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl">Token sales (SNAP / Double Up)</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Record the SNAP, Double Up, and other tokens you took in each market day. Market staff
          reconcile and reimburse from what you enter here.
        </p>
        <div className="mt-5">
          <TokenQuickEntry vendorId={vendor.id} dates={dates} currencies={currencies} recordedBy={vendor.name} onRecorded={reload} />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg">My redemptions</h3>
          <div className="rounded-xl bg-brand-paper px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-brand-muted">Awaiting reimbursement</p>
            <p className="text-2xl font-semibold text-brand-primary-dark">{formatMoney(owed)}</p>
          </div>
        </div>
        {loading ? (
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-brand-paper" />
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No token sales recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-brand-ink">{CURRENCY_LABEL[r.currency] ?? r.currency}</p>
                  <p className="text-sm text-brand-muted">
                    {formatDate(r.market_date)} · {r.token_count} token{r.token_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-brand-ink">{formatMoney(r.amount_cents)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.reimbursed ? 'bg-status-ok/10 text-status-ok' : 'bg-status-warn/15 text-brand-berry'
                    }`}
                  >
                    {r.reimbursed ? 'Reimbursed' : 'Pending'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

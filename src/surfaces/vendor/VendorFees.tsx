import { fetchFees } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { formatDate, formatMoney } from '@/lib/format';
import type { FeeStatus, Vendor } from '@/lib/types';

const STATUS_PILL: Record<FeeStatus, { label: string; className: string }> = {
  due: { label: 'Due', className: 'bg-status-warn/15 text-brand-berry' },
  paid: { label: 'Paid', className: 'bg-status-ok/10 text-status-ok' },
  waived: { label: 'Waived', className: 'bg-brand-paper text-brand-muted' },
};

export function VendorFees({ vendor }: { vendor: Vendor }) {
  const { data: fees, loading } = useAsync(() => fetchFees(vendor.id), [vendor.id], []);
  const totalDue = fees.filter((f) => f.status === 'due').reduce((sum, f) => sum + f.amount_cents, 0);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Fees &amp; invoices</h2>
          <p className="mt-1 text-sm text-brand-muted">Your stall fees and membership dues.</p>
        </div>
        <div className="rounded-xl bg-brand-paper px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-brand-muted">Balance due</p>
          <p className="text-2xl font-semibold text-brand-primary-dark">{formatMoney(totalDue)}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 h-32 animate-pulse rounded-xl bg-brand-paper" />
      ) : fees.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">No fees on file.</p>
      ) : (
        <ul className="mt-5 divide-y divide-brand-line">
          {fees.map((f) => {
            const pill = STATUS_PILL[f.status];
            return (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-brand-ink">{f.period}</p>
                  <p className="text-sm text-brand-muted">
                    {f.description}
                    {f.due_date && f.status === 'due' ? ` · due ${formatDate(f.due_date)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-brand-ink">{formatMoney(f.amount_cents)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {totalDue > 0 && (
        <p className="mt-4 text-xs text-brand-muted">
          Online payment would go here in production (Stripe). This demo shows the balance only.
        </p>
      )}
    </div>
  );
}

import { fetchAllFees, fetchAllVendors, fetchScheduleForDate } from '@/lib/adminData';
import { fetchMarketDates } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { categoryEmoji, formatDate, formatMoney } from '@/lib/format';
import type { Fee, MarketDate, ScheduleWithVendor, Vendor } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="field-label">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-brand-primary-dark">{value}</p>
      {sub && <p className="text-xs text-brand-muted">{sub}</p>}
    </div>
  );
}

export function AdminReports() {
  const { data, loading } = useAsync<{
    vendors: Vendor[];
    fees: Fee[];
    nextDate: MarketDate | null;
    sched: ScheduleWithVendor[];
  }>(
    async () => {
      const [vendors, fees, dates] = await Promise.all([fetchAllVendors(), fetchAllFees(), fetchMarketDates()]);
      const today = todayISO();
      const nextDate: MarketDate | null =
        dates.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? dates[0] ?? null;
      const sched = nextDate ? await fetchScheduleForDate(nextDate.id) : [];
      return { vendors, fees, nextDate, sched };
    },
    [],
    { vendors: [], fees: [], nextDate: null, sched: [] },
  );

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />;

  const active = data.vendors.filter((v) => v.status === 'active').length;
  const pending = data.vendors.filter((v) => v.status === 'pending').length;
  const billed = data.fees.reduce((s, f) => s + f.amount_cents, 0);
  const paid = data.fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount_cents, 0);
  const due = data.fees.filter((f) => f.status === 'due').reduce((s, f) => s + f.amount_cents, 0);

  const byCategory = Object.entries(
    data.vendors
      .filter((v) => v.status === 'active')
      .reduce<Record<string, number>>((m, v) => ((m[v.category] = (m[v.category] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  const confirmed = data.sched.filter((s) => s.status === 'confirmed').length;
  const declined = data.sched.filter((s) => s.status === 'declined').length;
  const schedPending = data.sched.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active vendors" value={String(active)} sub={`${pending} pending application(s)`} />
        <Stat label="Collected" value={formatMoney(paid)} sub={`of ${formatMoney(billed)} billed`} />
        <Stat label="Outstanding" value={formatMoney(due)} sub="unpaid fees" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <p className="field-label">Active vendors by category</p>
          <ul className="mt-3 space-y-2">
            {byCategory.map(([cat, n]) => {
              const pct = Math.round((n / active) * 100);
              return (
                <li key={cat} className="text-sm">
                  <div className="flex justify-between">
                    <span>{categoryEmoji(cat)} {cat}</span>
                    <span className="text-brand-muted">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-brand-paper">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-5">
          <p className="field-label">
            Next market{data.nextDate ? ` · ${data.nextDate.markets?.name} ${formatDate(data.nextDate.date)}` : ''}
          </p>
          {data.nextDate ? (
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Confirmed" value={confirmed} className="text-status-ok" />
              <Row label="Pending" value={schedPending} className="text-brand-berry" />
              <Row label="Declined" value={declined} className="text-status-alert" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">No upcoming dates.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-brand-muted">
        Attendance counts, SNAP/token reconciliation, and CSV export would live here in production.
      </p>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${className}`}>{value}</span>
    </div>
  );
}

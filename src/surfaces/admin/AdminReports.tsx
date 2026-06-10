import { fetchAllFees, fetchAllVendors, fetchScheduleForDate } from '@/lib/adminData';
import { fetchMarketDates } from '@/lib/vendorData';
import { fetchAllRedemptions, fetchReconciliation } from '@/lib/tokens';
import { complianceRate, fetchAllDocuments } from '@/lib/documents';
import { computeForecast, fetchAttendance, fetchConfirmedCounts, fetchEventCounts } from '@/lib/attendance';
import { useAsync } from '@/lib/useAsync';
import { categoryEmoji, formatDate, formatMoney } from '@/lib/format';
import { downloadCSV, toCSV } from '@/lib/csv';
import type {
  Fee,
  MarketDate,
  MarketDayStat,
  ScheduleWithVendor,
  TokenReconciliationRow,
  TokenRedemptionReport,
  Vendor,
  VendorDocumentStatus,
} from '@/lib/types';

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

function Row({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${className ?? 'text-brand-ink'}`}>{value}</span>
    </div>
  );
}

function ExportButton({ onClick, label = 'CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-brand-line px-3 py-1 text-xs font-semibold hover:bg-brand-paper">
      ⬇ {label}
    </button>
  );
}

interface ReportData {
  vendors: Vendor[];
  fees: Fee[];
  nextDate: MarketDate | null;
  sched: ScheduleWithVendor[];
  recon: TokenReconciliationRow[];
  redemptions: TokenRedemptionReport[];
  docs: VendorDocumentStatus[];
  rate: number;
  attendance: MarketDayStat[];
  confirmedByDate: Record<string, number>;
  eventCountByDate: Record<string, number>;
}

export function AdminReports() {
  const { data, loading } = useAsync<ReportData>(
    async () => {
      const [vendors, fees, dates, recon, redemptions, docs, rate, attendance, confirmedByDate, eventCountByDate] =
        await Promise.all([
          fetchAllVendors(),
          fetchAllFees(),
          fetchMarketDates(),
          fetchReconciliation(),
          fetchAllRedemptions(),
          fetchAllDocuments(),
          complianceRate(),
          fetchAttendance(),
          fetchConfirmedCounts(),
          fetchEventCounts(),
        ]);
      const today = todayISO();
      const nextDate: MarketDate | null =
        dates.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? dates[0] ?? null;
      const sched = nextDate ? await fetchScheduleForDate(nextDate.id) : [];
      return { vendors, fees, nextDate, sched, recon, redemptions, docs, rate, attendance, confirmedByDate, eventCountByDate };
    },
    [],
    {
      vendors: [],
      fees: [],
      nextDate: null,
      sched: [],
      recon: [],
      redemptions: [],
      docs: [],
      rate: 0,
      attendance: [],
      confirmedByDate: {},
      eventCountByDate: {},
    },
  );

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />;

  const active = data.vendors.filter((v) => v.status === 'active').length;
  const pending = data.vendors.filter((v) => v.status === 'pending').length;
  const billed = data.fees.reduce((s, f) => s + f.amount_cents, 0);
  const paid = data.fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount_cents, 0);
  const due = data.fees.filter((f) => f.status === 'due').reduce((s, f) => s + f.amount_cents, 0);
  const waived = data.fees.filter((f) => f.status === 'waived').reduce((s, f) => s + f.amount_cents, 0);

  const byCategory = Object.entries(
    data.vendors
      .filter((v) => v.status === 'active')
      .reduce<Record<string, number>>((m, v) => ((m[v.category] = (m[v.category] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  const confirmed = data.sched.filter((s) => s.status === 'confirmed').length;
  const declined = data.sched.filter((s) => s.status === 'declined').length;
  const schedPending = data.sched.filter((s) => s.status === 'pending').length;
  const committed = confirmed + declined + schedPending;
  const fillRate = committed ? Math.round((confirmed / committed) * 100) : 0;

  const attendanceForecast = data.nextDate
    ? computeForecast({
        target: data.nextDate,
        history: data.attendance,
        confirmedByDate: data.confirmedByDate,
        eventCountByDate: data.eventCountByDate,
      })
    : null;
  const lastActual = data.nextDate
    ? data.attendance
        .filter((h) => h.market_id === data.nextDate!.market_id && h.attendance != null)
        .sort((a, b) => b.market_date.localeCompare(a.market_date))[0] ?? null
    : null;

  // Token reconciliation rolled up per currency (across all dates).
  const byCurrency = new Map<string, { label: string; issued: number; redeemed: number; outstanding: number; owed: number }>();
  for (const r of data.recon) {
    const cur = byCurrency.get(r.currency) ?? { label: r.currency_label, issued: 0, redeemed: 0, outstanding: 0, owed: 0 };
    cur.issued += r.issued_cents;
    cur.redeemed += r.redeemed_cents;
    cur.outstanding += r.outstanding_cents;
    cur.owed += r.owed_to_vendors_cents;
    byCurrency.set(r.currency, cur);
  }
  const currencyRows = [...byCurrency.values()];
  const owedTotal = currencyRows.reduce((s, c) => s + c.owed, 0);

  const docValid = data.docs.filter((d) => d.status === 'valid' || d.status === 'no_expiry').length;
  const docExpiring = data.docs.filter((d) => d.status === 'expiring').length;
  const docExpired = data.docs.filter((d) => d.status === 'expired').length;

  const vendorName = new Map(data.vendors.map((v) => [v.id, v.name]));

  // ── CSV exports (client-side, via csv.ts) ──
  function exportTokens() {
    const header = ['market_date', 'currency', 'vendor', 'token_count', 'amount_dollars', 'reimbursed'];
    const rows = data.redemptions.map((r) => [
      r.market_date,
      r.currency_label,
      r.vendor_name,
      String(r.token_count),
      (r.amount_cents / 100).toFixed(2),
      r.reimbursed ? 'yes' : 'no',
    ]);
    downloadCSV('riverbend-ebt-dufb-redemptions.csv', toCSV([header, ...rows]));
  }
  function exportCompliance() {
    const header = ['vendor', 'document', 'required', 'status', 'expires', 'verified'];
    const rows = data.docs.map((d) => [
      d.vendor_name,
      d.doc_label,
      d.doc_required ? 'yes' : 'no',
      d.status,
      d.expires_date ?? '',
      d.verified_at ? 'yes' : 'no',
    ]);
    downloadCSV('riverbend-document-compliance.csv', toCSV([header, ...rows]));
  }
  function exportFees() {
    const header = ['vendor', 'period', 'description', 'amount_dollars', 'status', 'due_date'];
    const rows = data.fees.map((f) => [
      vendorName.get(f.vendor_id) ?? f.vendor_id,
      f.period,
      f.description ?? '',
      (f.amount_cents / 100).toFixed(2),
      f.status,
      f.due_date ?? '',
    ]);
    downloadCSV('riverbend-fees.csv', toCSV([header, ...rows]));
  }
  function exportMix() {
    const header = ['category', 'active_vendors'];
    const rows = byCategory.map(([cat, n]) => [cat, String(n)]);
    downloadCSV('riverbend-vendor-mix.csv', toCSV([header, ...rows]));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active vendors" value={String(active)} sub={`${pending} pending application(s)`} />
        <Stat label="Collected" value={formatMoney(paid)} sub={`of ${formatMoney(billed)} billed`} />
        <Stat label="Outstanding" value={formatMoney(due)} sub="unpaid fees" />
        <Stat label="Doc compliance" value={`${data.rate}%`} sub="vendors with required docs valid" />
      </div>

      {/* EBT / SNAP / Double Up */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="field-label">EBT · SNAP · Double Up redemption</p>
          <ExportButton onClick={exportTokens} label="Grant CSV" />
        </div>
        {currencyRows.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No token activity recorded yet.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-3">
              {currencyRows.map((c) => {
                const pct = c.issued > 0 ? Math.min(100, Math.round((c.redeemed / c.issued) * 100)) : 0;
                return (
                  <li key={c.label} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-brand-ink">{c.label}</span>
                      <span className="text-brand-muted">
                        {formatMoney(c.redeemed)} redeemed / {formatMoney(c.issued)} issued
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-brand-paper">
                      <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-brand-muted">Owed to vendors (redeemed, not yet reimbursed): {formatMoney(owedTotal)}</p>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Document compliance */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="field-label">Document compliance</p>
            <ExportButton onClick={exportCompliance} />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Valid" value={docValid} className="text-status-ok" />
            <Row label="Expiring (≤30 days)" value={docExpiring} className="text-brand-berry" />
            <Row label="Expired" value={docExpired} className="text-status-alert" />
          </div>
        </div>

        {/* Fee status */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="field-label">Fee status</p>
            <ExportButton onClick={exportFees} />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Paid" value={formatMoney(paid)} className="text-status-ok" />
            <Row label="Due" value={formatMoney(due)} className="text-brand-berry" />
            <Row label="Waived" value={formatMoney(waived)} className="text-brand-muted" />
          </div>
        </div>

        {/* Next market attendance */}
        <div className="card p-5">
          <p className="field-label">
            Next market{data.nextDate ? ` · ${data.nextDate.markets?.name} ${formatDate(data.nextDate.date)}` : ''}
          </p>
          {data.nextDate ? (
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Confirmed" value={confirmed} className="text-status-ok" />
              <Row label="Pending" value={schedPending} className="text-brand-berry" />
              <Row label="Declined" value={declined} className="text-status-alert" />
              <Row label="Fill rate" value={`${fillRate}%`} />
              {attendanceForecast?.forecast != null && (
                <Row label="Attendance forecast" value={`${attendanceForecast.forecast} (${attendanceForecast.low}–${attendanceForecast.high})`} />
              )}
              {lastActual?.attendance != null && (
                <Row label="Last recorded" value={`${lastActual.attendance} · ${formatDate(lastActual.market_date)}`} />
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">No upcoming dates.</p>
          )}
        </div>

        {/* Vendor mix */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="field-label">Active vendors by category</p>
            <ExportButton onClick={exportMix} />
          </div>
          <ul className="mt-3 space-y-2">
            {byCategory.map(([cat, n]) => {
              const pct = active ? Math.round((n / active) * 100) : 0;
              return (
                <li key={cat} className="text-sm">
                  <div className="flex justify-between">
                    <span>
                      {categoryEmoji(cat)} {cat}
                    </span>
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
      </div>
    </div>
  );
}

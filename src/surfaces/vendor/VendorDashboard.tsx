import { fetchFees, fetchMarketDates, fetchMessages, fetchMySchedule, fetchOfferings } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { formatDate, formatMoney } from '@/lib/format';
import type { Vendor } from '@/lib/types';
import type { VendorSection } from './VendorShell';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function VendorDashboard({ vendor, onGo }: { vendor: Vendor; onGo: (s: VendorSection) => void }) {
  const { data, loading } = useAsync(
    async () => {
      const [fees, sched, dates, messages, offerings] = await Promise.all([
        fetchFees(vendor.id),
        fetchMySchedule(vendor.id),
        fetchMarketDates(),
        fetchMessages(vendor.id),
        fetchOfferings(vendor.id),
      ]);
      return { fees, sched, dates, messages, offerings };
    },
    [vendor.id],
    { fees: [], sched: [], dates: [], messages: [], offerings: [] },
  );

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-brand-card" />;
  }

  const balanceDue = data.fees.filter((f) => f.status === 'due').reduce((s, f) => s + f.amount_cents, 0);
  const confirmedIds = new Set(data.sched.filter((s) => s.status === 'confirmed').map((s) => s.market_date_id));
  const today = todayISO();
  const nextDate = data.dates
    .filter((d) => confirmedIds.has(d.id) && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextStall = nextDate ? data.sched.find((s) => s.market_date_id === nextDate.id)?.stall : null;
  const lastMessage = data.messages[data.messages.length - 1];
  const latestOffering = data.offerings[0];
  const openDates = data.dates.filter((d) => d.date >= today && !data.sched.some((s) => s.market_date_id === d.id)).length;

  const Card = ({
    title,
    children,
    to,
    cta,
  }: {
    title: string;
    children: React.ReactNode;
    to: VendorSection;
    cta: string;
  }) => (
    <button onClick={() => onGo(to)} className="card p-5 text-left transition hover:shadow-lift">
      <p className="field-label">{title}</p>
      <div className="mt-2 min-h-[3rem] text-brand-ink">{children}</div>
      <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">{cta} →</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Welcome back, {vendor.name.split(' ')[0]} 👋</h2>
        <p className="mt-1 text-sm text-brand-muted">Here’s where things stand this week.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Balance due" to="fees" cta="View fees">
          <span className="text-2xl font-semibold text-brand-primary-dark">{formatMoney(balanceDue)}</span>
          {balanceDue > 0 && <span className="ml-2 text-sm text-brand-berry">outstanding</span>}
        </Card>

        <Card title="Next market" to="schedule" cta="Manage schedule">
          {nextDate ? (
            <span>
              <span className="font-semibold">{nextDate.markets?.name}</span> · {formatDate(nextDate.date)}
              {nextStall && <span className="text-brand-muted"> · Stall {nextStall}</span>}
            </span>
          ) : (
            <span className="text-brand-muted">No confirmed dates yet</span>
          )}
          {openDates > 0 && (
            <span className="mt-1 block text-xs text-brand-berry">{openDates} date(s) need your response</span>
          )}
        </Card>

        <Card title="This week’s offering" to="offerings" cta="Post / edit">
          {latestOffering ? (
            <span>
              <span className="font-semibold">{latestOffering.headline ?? 'Posted'}</span>
              <span className="block text-xs text-brand-muted">Week of {formatDate(latestOffering.week_of)}</span>
            </span>
          ) : (
            <span className="text-brand-muted">Nothing posted yet</span>
          )}
        </Card>

        <Card title="Latest message" to="messages" cta="Open thread">
          {lastMessage ? (
            <span>
              <span className="text-xs font-semibold text-brand-muted">{lastMessage.author_name}</span>
              <span className="block truncate text-sm">{lastMessage.body}</span>
            </span>
          ) : (
            <span className="text-brand-muted">No messages</span>
          )}
        </Card>
      </div>
    </div>
  );
}

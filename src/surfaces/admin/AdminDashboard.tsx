import { fetchAllAnnouncements, fetchAllFees, fetchAllVendors } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { formatMoney } from '@/lib/format';
import type { AdminSection } from './AdminShell';

export function AdminDashboard({ onGo }: { onGo: (s: AdminSection) => void }) {
  const { data, loading } = useAsync(
    async () => {
      const [vendors, fees, ann] = await Promise.all([fetchAllVendors(), fetchAllFees(), fetchAllAnnouncements()]);
      return { vendors, fees, ann };
    },
    [],
    { vendors: [], fees: [], ann: [] },
  );

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-brand-card" />;

  const pending = data.vendors.filter((v) => v.status === 'pending').length;
  const active = data.vendors.filter((v) => v.status === 'active').length;
  const due = data.fees.filter((f) => f.status === 'due').reduce((s, f) => s + f.amount_cents, 0);
  const live = data.ann.filter((a) => a.active).length;

  const Card = ({ title, value, sub, to, cta, accent }: { title: string; value: string; sub: string; to: AdminSection; cta: string; accent?: boolean }) => (
    <button onClick={() => onGo(to)} className="card p-5 text-left transition hover:shadow-lift">
      <p className="field-label">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-brand-berry' : 'text-brand-primary-dark'}`}>{value}</p>
      <p className="text-xs text-brand-muted">{sub}</p>
      <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">{cta} →</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl">Market overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Applications" value={String(pending)} sub="awaiting review" to="applications" cta="Review" accent={pending > 0} />
        <Card title="Active vendors" value={String(active)} sub="on the roster" to="vendors" cta="Manage" />
        <Card title="Outstanding fees" value={formatMoney(due)} sub="unpaid" to="reports" cta="See reports" accent={due > 0} />
        <Card title="Announcements" value={String(live)} sub="live now" to="announcements" cta="Post" />
      </div>
      <p className="text-sm text-brand-muted">
        Everything here is the same data the vendors see — scoped by the database. Assign a stall and the
        vendor sees it instantly; approve an application and the farm goes live on the public site.
      </p>
    </div>
  );
}

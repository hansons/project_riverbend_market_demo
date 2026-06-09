import { fetchVendors, fetchMarkets } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate } from '@/lib/router';
import { SeasonStrip } from './SeasonStrip';
import { VendorCard } from './VendorCard';

const VALUE_PROPS = [
  { icon: '🌎', title: 'Grown nearby', body: 'Everything here is raised or made within an hour’s drive.' },
  { icon: '🤝', title: 'Meet the grower', body: 'Buy straight from the family that planted it.' },
  { icon: '⏱️', title: 'Peak freshness', body: 'Most of it was picked the morning of the market.' },
];

export function PublicHome() {
  const { tenant } = useTheme();
  const { data: vendors } = useAsync(fetchVendors, [], []);
  const { data: markets } = useAsync(fetchMarkets, [], []);
  const featured = vendors.filter((v) => v.featured).slice(0, 3);
  const nextMarket = markets[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-brand-line bg-gradient-to-b from-brand-primary/8 to-brand-paper">
        <div className="mx-auto max-w-content px-4 py-16 sm:py-20">
          <p className="eyebrow">{tenant.region ?? 'Your local market'}</p>
          <h1 className="mt-2 max-w-3xl text-4xl leading-tight sm:text-5xl">
            {tenant.tagline ?? 'Fresh from the field, every week.'}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-muted">
            Meet the farmers, bakers, and makers behind {tenant.name}. See what’s in season, then come
            say hello.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => navigate('/vendors')} className="btn-primary">
              Meet the vendors
            </button>
            <button onClick={() => navigate('/markets')} className="btn-outline">
              Plan your visit
            </button>
          </div>
          {nextMarket && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-card px-3 py-1.5 text-sm shadow-card">
              <span className="h-2 w-2 rounded-full bg-status-ok" />
              Next up: <span className="font-semibold">{nextMarket.name}</span> ·{' '}
              {nextMarket.day_of_week} {nextMarket.hours}
            </p>
          )}
        </div>
      </section>

      {/* What's in season */}
      <section className="mx-auto max-w-content px-4 py-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">This week</p>
            <h2 className="text-2xl">What’s in season</h2>
          </div>
        </div>
        <SeasonStrip />
      </section>

      {/* Value props */}
      <section className="bg-brand-card">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-12 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div key={v.title}>
              <div className="text-3xl">{v.icon}</div>
              <h3 className="mt-2 text-lg">{v.title}</h3>
              <p className="mt-1 text-sm text-brand-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured vendors */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-content px-4 py-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Say hello to</p>
              <h2 className="text-2xl">Featured vendors</h2>
            </div>
            <button onClick={() => navigate('/vendors')} className="btn-ghost">
              See all vendors →
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

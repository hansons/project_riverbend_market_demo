import { fetchVendors, fetchMarkets, fetchCurrentOfferings } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate } from '@/lib/router';
import { formatDate, thisSaturdayISO } from '@/lib/format';
import { SeasonStrip } from './SeasonStrip';
import type { Vendor, VendorOffering } from '@/lib/types';

// Editorial variant of the shopper home: a split hero (copy + photo), a
// two-column "what's in season", full-bleed photo cards for "what vendors are
// bringing", and a four-up value band. Selectable from the classic layout via
// the toggle in PublicShell. The classic PublicHome is left untouched.
export function PublicHomeAlt() {
  const { tenant } = useTheme();
  const { data: vendors } = useAsync(fetchVendors, [], []);
  const { data: markets } = useAsync(fetchMarkets, [], []);
  const reference = thisSaturdayISO();
  const { data: fresh } = useAsync(() => fetchCurrentOfferings(reference), [], []);
  const nextMarket = markets[0];

  type FreshItem = { o: VendorOffering; vendor: Vendor };
  const freshItems: FreshItem[] = fresh
    .map((o) => ({ o, vendor: vendors.find((v) => v.id === o.vendor_id) }))
    .filter((x): x is FreshItem => Boolean(x.vendor))
    .slice(0, 6);

  const region = tenant.region ?? 'the area';
  const valueProps = [
    { icon: '🌿', title: 'Grown nearby', body: `From local farms in ${region}` },
    { icon: '🧺', title: 'Picked fresh', body: 'Harvested and made with care' },
    { icon: '👥', title: 'Community first', body: 'Supporting local farmers, makers, and you' },
    {
      icon: '💚',
      title: nextMarket ? `See you ${nextMarket.day_of_week}!` : 'See you soon!',
      body: nextMarket ? `${nextMarket.name} · ${nextMarket.day_of_week}s ${nextMarket.hours}` : tenant.name,
    },
  ];

  return (
    <div>
      {/* Split hero — copy on the left, the market's banner photo on the right. */}
      <section className="border-b border-brand-line bg-gradient-to-b from-brand-primary/8 to-brand-paper">
        <div className="mx-auto grid max-w-content items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">📍 {tenant.region ?? 'Your local market'}</p>
            <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">
              {tenant.tagline ?? 'Fresh from the field, every week.'}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-muted">
              Meet the farmers, bakers, and makers behind {tenant.name}. See what’s in season, then
              come say hello.
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
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-card px-3 py-1.5 text-sm text-brand-ink shadow-card">
                <span className="h-2 w-2 rounded-full bg-status-ok" />
                Next up: <span className="font-semibold">{nextMarket.name}</span> ·{' '}
                {nextMarket.day_of_week} {nextMarket.hours}
              </p>
            )}
          </div>
          <div className="relative">
            {tenant.banner_url ? (
              <img
                src={tenant.banner_url}
                alt=""
                className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
              />
            ) : (
              <div className="aspect-[4/3] w-full rounded-3xl bg-gradient-to-br from-brand-primary/20 to-brand-accent/25" />
            )}
          </div>
        </div>
      </section>

      {/* What's in season — two-column split layout. */}
      <section className="mx-auto max-w-content px-4 py-12">
        <div className="mb-5">
          <p className="eyebrow">This week</p>
          <h2 className="text-2xl">What’s in season</h2>
        </div>
        <SeasonStrip layout="split" />
      </section>

      {/* Fresh this Saturday — full-bleed photo cards with white text. */}
      {freshItems.length > 0 && (
        <section className="mx-auto max-w-content px-4 pb-12">
          <div className="mb-5">
            <p className="eyebrow">Fresh this Saturday · {formatDate(reference)}</p>
            <h2 className="text-2xl">What vendors are bringing</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freshItems.map(({ o, vendor }) => (
              <button
                key={o.id}
                onClick={() => navigate(`/vendor/${vendor.slug}`)}
                className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-2xl border border-brand-line text-left shadow-card transition hover:shadow-lift"
              >
                {vendor.image_url ? (
                  <img
                    src={vendor.image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-primary-dark" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                <div className="relative p-4 text-white">
                  <p className="font-semibold leading-tight">{vendor.name}</p>
                  <p className="text-sm text-white/85">{o.headline ?? 'Bringing this week'}</p>
                  {o.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {o.items.slice(0, 4).map((it) => (
                        <span
                          key={it}
                          className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Value band — four-up, with the visit reminder as the last item. */}
      <section className="border-t border-brand-line bg-brand-paper">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <div key={v.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-lg">
                {v.icon}
              </span>
              <div>
                <h3 className="font-semibold text-brand-ink">{v.title}</h3>
                <p className="mt-0.5 text-sm text-brand-muted">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

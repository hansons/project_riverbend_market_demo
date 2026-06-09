import { fetchVendorBySlug, fetchVendorProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { navigate } from '@/lib/router';
import { categoryEmoji, formatPrice } from '@/lib/format';
import type { Vendor } from '@/lib/types';

export function VendorDetail({ slug }: { slug: string }) {
  const { data: vendor, loading } = useAsync<Vendor | null>(
    () => fetchVendorBySlug(slug),
    [slug],
    null,
  );
  const { data: products } = useAsync(
    () => (vendor ? fetchVendorProducts(vendor.id) : Promise.resolve([])),
    [vendor?.id],
    [],
  );

  if (loading) {
    return <div className="mx-auto max-w-content px-4 py-12">
      <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />
    </div>;
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 text-center">
        <p className="text-brand-muted">We couldn’t find that vendor.</p>
        <button onClick={() => navigate('/vendors')} className="btn-outline mt-4">
          ← Back to all vendors
        </button>
      </div>
    );
  }

  const inSeason = products.filter((p) => p.in_season);
  const offSeason = products.filter((p) => !p.in_season);

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <button onClick={() => navigate('/vendors')} className="btn-ghost mb-4 -ml-3">
        ← All vendors
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: identity + story */}
        <div>
          <div className="card overflow-hidden">
            <div className="aspect-[16/9] bg-brand-paper">
              {vendor.image_url ? (
                <img src={vendor.image_url} alt={vendor.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-6xl">
                  {categoryEmoji(vendor.category)}
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  {categoryEmoji(vendor.category)} {vendor.category}
                </span>
                {vendor.town && <span className="text-sm text-brand-muted">📍 {vendor.town}</span>}
              </div>
              <h1 className="mt-3 text-3xl">{vendor.name}</h1>
              {vendor.tagline && <p className="mt-1 text-lg text-brand-muted">{vendor.tagline}</p>}
              {vendor.story && <p className="mt-4 leading-relaxed text-brand-ink/90">{vendor.story}</p>}

              {vendor.practices.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {vendor.practices.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary-dark"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: visit + what they bring */}
        <div className="space-y-5">
          <div className="card p-5">
            <p className="field-label">Find them at</p>
            <div className="mt-2 space-y-1 text-sm">
              {vendor.market_days.length ? (
                vendor.market_days.map((d) => (
                  <p key={d} className="flex items-center gap-2">
                    <span className="text-brand-accent">●</span> {d} market
                  </p>
                ))
              ) : (
                <p className="text-brand-muted">Schedule coming soon.</p>
              )}
            </div>
            {vendor.email && (
              <a
                href={`mailto:${vendor.email}`}
                className="btn-outline mt-4 w-full"
              >
                Contact {vendor.name.split(' ')[0]}
              </a>
            )}
          </div>

          <div className="card p-5">
            <p className="field-label">What they bring</p>
            {products.length === 0 ? (
              <p className="mt-2 text-sm text-brand-muted">Stand list coming soon.</p>
            ) : (
              <ul className="mt-3 divide-y divide-brand-line">
                {[...inSeason, ...offSeason].map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <span className={p.in_season ? 'text-brand-ink' : 'text-brand-muted'}>
                      {p.name}
                      {!p.in_season && <span className="ml-2 text-xs">(out of season)</span>}
                    </span>
                    <span className="font-medium text-brand-primary-dark">
                      {formatPrice(p.price_cents, p.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

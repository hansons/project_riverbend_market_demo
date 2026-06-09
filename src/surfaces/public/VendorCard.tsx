import { navigate } from '@/lib/router';
import { categoryEmoji } from '@/lib/format';
import type { Vendor } from '@/lib/types';

export function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <button
      onClick={() => navigate(`/vendor/${vendor.slug}`)}
      className="card group overflow-hidden text-left transition hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-paper">
        {vendor.image_url ? (
          <img
            src={vendor.image_url}
            alt={vendor.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl">{categoryEmoji(vendor.category)}</div>
        )}
        {vendor.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-ink">
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-brand-primary-dark">
            {vendor.name}
          </h3>
          <span className="chip shrink-0">
            {categoryEmoji(vendor.category)} {vendor.category}
          </span>
        </div>
        {vendor.tagline && <p className="mt-1 text-sm text-brand-muted">{vendor.tagline}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-brand-muted">
          {vendor.town && <span>📍 {vendor.town}</span>}
          {vendor.market_days.length > 0 && <span>· {vendor.market_days.join(' & ')}</span>}
        </div>
      </div>
    </button>
  );
}

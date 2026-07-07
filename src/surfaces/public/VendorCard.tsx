import { navigate } from '@/lib/router';
import { categoryEmoji } from '@/lib/format';
import { useVisitList } from '@/lib/visitList';
import { VendorImage } from './VendorImage';
import type { Vendor } from '@/lib/types';

// Tapping the card opens the vendor's page. The "+ Visit" badge toggles the
// vendor into the shopper's visit list without navigating away.
export function VendorCard({ vendor }: { vendor: Vendor }) {
  const visit = useVisitList();
  const added = visit.has(vendor.slug);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/vendor/${vendor.slug}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/vendor/${vendor.slug}`);
        }
      }}
      className={`card group relative cursor-pointer overflow-hidden text-left transition hover:shadow-lift ${
        added ? 'ring-2 ring-brand-primary' : ''
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-paper">
        <VendorImage
          vendor={vendor}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {vendor.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-ink">
            Featured
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            visit.toggle(vendor.slug);
          }}
          aria-pressed={added}
          title={added ? `Remove ${vendor.name} from your visit list` : `Add ${vendor.name} to your visit list`}
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow transition ${
            added ? 'bg-brand-primary text-white' : 'bg-white/85 text-brand-ink/80 hover:bg-white'
          }`}
        >
          {added ? '✓ On list' : '+ Visit'}
        </button>
        {vendor.logo_url && (
          <div className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-lg border border-white/80 bg-white shadow">
            <img src={vendor.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight text-brand-primary-dark">{vendor.name}</h3>
          <span className="chip shrink-0 text-[11px]">
            {categoryEmoji(vendor.category)} {vendor.category}
          </span>
        </div>
        {vendor.tagline && <p className="mt-0.5 text-xs text-brand-muted line-clamp-1">{vendor.tagline}</p>}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-brand-muted">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {vendor.town && <span>📍 {vendor.town}</span>}
            {vendor.market_days.length > 0 && <span>· {vendor.market_days.join(' & ')}</span>}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vendor/${vendor.slug}`);
            }}
            className="shrink-0 font-semibold text-brand-primary-dark hover:underline"
          >
            View →
          </button>
        </div>
      </div>
    </div>
  );
}

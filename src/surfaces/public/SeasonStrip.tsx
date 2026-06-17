import { fetchSeasonality, fetchVendors, fetchAllProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { navigate } from '@/lib/router';
import { currentMonth, seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SeasonItem, Vendor } from '@/lib/types';

const PREPARED = 'Prepared Food';
// A category needs at least this many available items to earn its own section;
// anything sparser is pooled into "Also in season" so the items share lines.
const MIN_FOR_SECTION = 4;
const CATEGORY_ORDER = ['Vegetable', 'Fruit', 'Herb', 'Flowers', 'Nuts', 'Pantry'];

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
function nameMatches(item: string, product: string): boolean {
  if (product.toLowerCase().includes(item.toLowerCase())) return true;
  const iw = words(item);
  for (const w of words(product)) if (iw.has(w)) return true;
  return false;
}

type Avail = { s: SeasonItem; carriers: Vendor[] };

export function SeasonStrip({ layout = 'stacked' }: { layout?: 'stacked' | 'split' } = {}) {
  const { data, loading } = useAsync(
    async () => {
      const [items, vendors, products] = await Promise.all([
        fetchSeasonality(),
        fetchVendors(),
        fetchAllProducts(),
      ]);
      return { items, vendors, products };
    },
    [],
    {
      items: [] as SeasonItem[],
      vendors: [] as Vendor[],
      products: [] as { vendor_id: string; name: string; in_season: boolean }[],
    },
  );
  const month = currentMonth();

  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  if (!data.items.length) return isSupabaseConfigured ? null : <SetupNotice />;

  const carriersFor = (itemName: string): Vendor[] => {
    const ids = new Set(
      data.products.filter((p) => p.in_season && nameMatches(itemName, p.name)).map((p) => p.vendor_id),
    );
    return data.vendors.filter((v) => ids.has(v.id)).slice(0, 3);
  };

  // Keep only items a vendor currently carries; group by category.
  const avail = new Map<string, Avail[]>();
  for (const s of data.items) {
    const carriers = carriersFor(s.item);
    if (!carriers.length) continue;
    (avail.get(s.category) ?? avail.set(s.category, []).get(s.category)!).push({ s, carriers });
  }

  const byRelevance = (a: Avail, b: Avail) =>
    Number(!a.s.months.includes(month)) - Number(!b.s.months.includes(month)) || a.s.sort - b.s.sort;
  const sorted = (list: Avail[]) => [...list].sort(byRelevance);

  const prepared = sorted(avail.get(PREPARED) ?? []);
  const restCats = [
    ...CATEGORY_ORDER.filter((c) => avail.has(c)),
    ...[...avail.keys()].filter((c) => c !== PREPARED && !CATEGORY_ORDER.includes(c)).sort(),
  ];

  const dense: { cat: string; list: Avail[] }[] = [];
  const pooled: Avail[] = [];
  for (const c of restCats) {
    const list = sorted(avail.get(c) ?? []);
    if (list.length >= MIN_FOR_SECTION) dense.push({ cat: c, list });
    else pooled.push(...list);
  }
  pooled.sort((a, b) => a.s.category.localeCompare(b.s.category) || byRelevance(a, b));

  if (!prepared.length && !dense.length && !pooled.length) {
    return <p className="text-sm text-brand-muted">No vendors have posted availability yet this week.</p>;
  }

  const split = layout === 'split';

  const preparedBlock =
    prepared.length > 0 ? (
      <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-berry">
          🍴 Ready now — prepared foods
        </h3>
        <SeasonGrid items={prepared} cols={split ? 3 : 6} />
      </div>
    ) : null;

  const denseBlocks = dense.map(({ cat, list }) => (
    <div key={cat}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">{cat}</h3>
      <SeasonGrid items={list} cols={split ? 4 : 6} />
    </div>
  ));

  const pooledBlock =
    pooled.length > 0 ? (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
          Also in season
        </h3>
        <SeasonGrid items={pooled} />
      </div>
    ) : null;

  // Split layout: prepared-foods callout beside the main category grid, with the
  // pooled "also in season" row spanning full width below.
  if (split) {
    return (
      <div className="space-y-6">
        {preparedBlock ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            {preparedBlock}
            <div className="space-y-6">{denseBlocks}</div>
          </div>
        ) : (
          <div className="space-y-6">{denseBlocks}</div>
        )}
        {pooledBlock}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {preparedBlock}
      {denseBlocks}
      {pooledBlock}
    </div>
  );
}

function SeasonGrid({ items, cols = 6 }: { items: Avail[]; cols?: 3 | 4 | 6 }) {
  const colClass =
    cols === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : cols === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
  return (
    <div className={`grid grid-cols-2 gap-3 ${colClass}`}>
      {items.map(({ s, carriers }) => (
        <SeasonCard key={s.id} s={s} carriers={carriers} />
      ))}
    </div>
  );
}

function SeasonCard({ s, carriers }: Avail) {
  const style = seasonStyle(s.status);
  return (
    <div className="card flex flex-col p-3">
      <div className="flex items-start justify-between">
        <span className="text-2xl">{s.emoji ?? '🌿'}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
          {style.label}
        </span>
      </div>
      <p className="mt-2 font-semibold leading-tight text-brand-ink">{s.item}</p>
      <p className="text-xs text-brand-muted">{s.note ?? s.category}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {carriers.map((v) => (
          <button
            key={v.id}
            onClick={() => navigate(`/vendor/${v.slug}`)}
            title={`See ${v.name}`}
            className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary-dark transition hover:bg-brand-primary/20"
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  );
}

import { fetchSeasonality, fetchVendors, fetchAllProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { navigate } from '@/lib/router';
import { currentMonth, seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SeasonItem, Vendor } from '@/lib/types';

// Category sections, top to bottom. Anything not listed falls in after, A–Z.
const CATEGORY_ORDER = ['Prepared Food', 'Vegetable', 'Fruit', 'Herb', 'Flowers', 'Nuts', 'Pantry'];

// Words of 4+ letters, lower-cased — used to match a seasonal item to a product
// name ("Carrots" ↔ "Heirloom carrots", "Tamales & tacos" ↔ "Street tacos").
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
function nameMatches(item: string, product: string): boolean {
  if (product.toLowerCase().includes(item.toLowerCase())) return true;
  const iw = words(item);
  for (const w of words(product)) if (iw.has(w)) return true;
  return false;
}

export function SeasonStrip() {
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

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  }
  if (!data.items.length) {
    return isSupabaseConfigured ? null : <SetupNotice />;
  }

  // Active vendors currently carrying a given item (in-season product match).
  const carriersFor = (itemName: string): Vendor[] => {
    const ids = new Set(
      data.products.filter((p) => p.in_season && nameMatches(itemName, p.name)).map((p) => p.vendor_id),
    );
    return data.vendors.filter((v) => ids.has(v.id)).slice(0, 3);
  };

  // Group seasonal items by category, keeping only ones a vendor actually has now.
  const groups = new Map<string, SeasonItem[]>();
  for (const it of data.items) {
    const arr = groups.get(it.category) ?? [];
    arr.push(it);
    groups.set(it.category, arr);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
  ];
  const byRelevance = (a: SeasonItem, b: SeasonItem) =>
    Number(!a.months.includes(month)) - Number(!b.months.includes(month)) || a.sort - b.sort;

  const sections = orderedCats
    .map((cat) => ({
      cat,
      list: [...(groups.get(cat) ?? [])]
        .map((s) => ({ s, carriers: carriersFor(s.item) }))
        .filter((x) => x.carriers.length > 0)
        .sort((a, b) => byRelevance(a.s, b.s)),
    }))
    .filter((sec) => sec.list.length > 0);

  if (!sections.length) {
    return <p className="text-sm text-brand-muted">No vendors have posted availability yet this week.</p>;
  }

  return (
    <div className="space-y-6">
      {sections.map(({ cat, list }) => (
        <div key={cat}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">{cat}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {list.map(({ s, carriers }) => {
              const style = seasonStyle(s.status);
              return (
                <div key={s.id} className="card flex flex-col p-4">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{s.emoji ?? '🌿'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-brand-ink">{s.item}</p>
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
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

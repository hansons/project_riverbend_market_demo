import { fetchSeasonality, fetchVendors, fetchAllProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { navigate } from '@/lib/router';
import { currentMonth, seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SeasonItem, Vendor } from '@/lib/types';

// Category sections, top to bottom. Anything not listed falls in after, A–Z.
const CATEGORY_ORDER = ['Prepared Food', 'Vegetable', 'Fruit', 'Herb', 'Flowers', 'Nuts', 'Pantry'];

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
    { items: [] as SeasonItem[], vendors: [] as Vendor[], products: [] as { vendor_id: string; name: string; in_season: boolean }[] },
  );
  const month = currentMonth();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  }
  if (!data.items.length) {
    return isSupabaseConfigured ? null : <SetupNotice />;
  }

  // Which active vendors currently carry a given item (product name contains it + in-season).
  const carriersFor = (itemName: string): Vendor[] => {
    const lc = itemName.toLowerCase();
    const ids = new Set(
      data.products.filter((p) => p.in_season && p.name.toLowerCase().includes(lc)).map((p) => p.vendor_id),
    );
    return data.vendors.filter((v) => ids.has(v.id)).slice(0, 3);
  };

  // Group by category.
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

  return (
    <div className="space-y-6">
      {orderedCats.map((cat) => (
        <div key={cat}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">{cat}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[...(groups.get(cat) ?? [])].sort(byRelevance).map((s) => {
              const style = seasonStyle(s.status);
              const carriers = carriersFor(s.item);
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
                  {carriers.length > 0 && (
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

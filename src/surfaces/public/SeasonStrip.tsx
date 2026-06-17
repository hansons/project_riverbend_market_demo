import { fetchSeasonality, fetchVendors, fetchAllProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { navigate } from '@/lib/router';
import { seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SeasonItem, Vendor } from '@/lib/types';

// The "this week" panel is built dynamically from what active vendors are
// actually carrying in season (vendor_products), grouped into display
// categories and enriched with the curated seasonality status/emoji/note when
// an item name matches. Add a vendor or product and it shows up here on its own.

type ProductRow = { vendor_id: string; name: string; category: string | null; in_season: boolean };

// Raw product categories → the labelled groups shown here, in render order.
const GROUPS: { key: string; label: string; emoji: string; cats: string[] }[] = [
  { key: 'prepared', label: 'Prepared foods', emoji: '🍴', cats: ['Prepared'] },
  { key: 'veg', label: 'Vegetables', emoji: '🥬', cats: ['Vegetable'] },
  { key: 'fruit', label: 'Fruit', emoji: '🍎', cats: ['Fruit'] },
  { key: 'herb', label: 'Herbs', emoji: '🌿', cats: ['Herb'] },
  { key: 'mushroom', label: 'Mushrooms', emoji: '🍄', cats: ['Mushroom'] },
  { key: 'bakery', label: 'Bakery', emoji: '🍞', cats: ['Bread', 'Pastry'] },
  { key: 'meat', label: 'Meat & eggs', emoji: '🥩', cats: ['Meat', 'Eggs'] },
  { key: 'dairy', label: 'Cheese & dairy', emoji: '🧀', cats: ['Cheese', 'Dairy'] },
  { key: 'seafood', label: 'Seafood', emoji: '🐟', cats: ['Seafood'] },
  { key: 'drinks', label: 'Drinks', emoji: '☕', cats: ['Beverage', 'Coffee', 'Tea'] },
  { key: 'pantry', label: 'Pantry & sweets', emoji: '🍯', cats: ['Pantry', 'Confection', 'Pasta', 'Grain', 'Nuts'] },
  { key: 'flowers', label: 'Flowers', emoji: '💐', cats: ['Flowers'] },
  { key: 'plants', label: 'Plants & trees', emoji: '🌱', cats: ['Plant'] },
  { key: 'body', label: 'Body & home', emoji: '🧼', cats: ['Body', 'Home'] },
  { key: 'art', label: 'Art & crafts', emoji: '🎨', cats: ['Art'] },
  { key: 'services', label: 'Services', emoji: '🛠️', cats: ['Service'] },
];
const CAT_TO_GROUP = new Map<string, (typeof GROUPS)[number]>();
for (const g of GROUPS) for (const c of g.cats) CAT_TO_GROUP.set(c, g);

// Available-now items lead each group; "coming" trails.
const STATUS_RANK: Record<string, number> = { peak: 0, ready: 0, ending: 1, coming: 3 };
const rankOf = (status: string | null) => (status == null ? 2 : STATUS_RANK[status] ?? 2);

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
function shareWord(a: string, b: string): boolean {
  const aw = words(a);
  for (const w of words(b)) if (aw.has(w)) return true;
  return false;
}

type Offered = { name: string; emoji: string; status: string | null; note: string | null; carriers: Vendor[] };

export function SeasonStrip({ layout = 'stacked' }: { layout?: 'stacked' | 'split' } = {}) {
  const { data, loading } = useAsync(
    async () => {
      const [items, vendors, products] = await Promise.all([fetchSeasonality(), fetchVendors(), fetchAllProducts()]);
      return { items, vendors, products };
    },
    [],
    { items: [] as SeasonItem[], vendors: [] as Vendor[], products: [] as ProductRow[] },
  );

  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  if (!data.products.length) return isSupabaseConfigured ? null : <SetupNotice />;

  const vendorById = new Map(data.vendors.map((v) => [v.id, v]));
  // Curated seasonality match (status/emoji/note) by exact name or shared word.
  const seasonFor = (name: string): SeasonItem | undefined =>
    data.items.find((s) => s.item.toLowerCase() === name.toLowerCase() || shareWord(s.item, name));

  // group key → (lowercased item name → Offered)
  const buckets = new Map<string, Map<string, Offered>>();
  for (const p of data.products) {
    if (!p.in_season) continue;
    const vendor = vendorById.get(p.vendor_id); // active vendors only
    if (!vendor) continue;
    const g = CAT_TO_GROUP.get((p.category ?? '').trim());
    if (!g) continue;
    const nameKey = p.name.trim().toLowerCase();
    let bucket = buckets.get(g.key);
    if (!bucket) buckets.set(g.key, (bucket = new Map()));
    let entry = bucket.get(nameKey);
    if (!entry) {
      const s = seasonFor(p.name);
      entry = {
        name: p.name.trim(),
        emoji: s?.emoji ?? g.emoji,
        status: s?.status ?? null,
        note: s?.note ?? null,
        carriers: [],
      };
      bucket.set(nameKey, entry);
    }
    if (!entry.carriers.some((c) => c.id === vendor.id)) entry.carriers.push(vendor);
  }

  const groupList = GROUPS.filter((g) => buckets.get(g.key)?.size).map((g) => ({
    ...g,
    items: [...buckets.get(g.key)!.values()].sort(
      (a, b) => rankOf(a.status) - rankOf(b.status) || a.name.localeCompare(b.name),
    ),
  }));

  if (!groupList.length) {
    return <p className="text-sm text-brand-muted">No vendors have posted availability yet this week.</p>;
  }

  const split = layout === 'split';
  return (
    <div className="space-y-6">
      {groupList.map((g) =>
        g.key === 'prepared' ? (
          <div key={g.key} className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-berry">
              🍴 Ready now — prepared foods
            </h3>
            <ItemGrid items={g.items} cols={split ? 4 : 6} />
          </div>
        ) : (
          <div key={g.key}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
              <span>{g.emoji}</span>
              {g.label}
              <span className="font-normal normal-case tracking-normal text-brand-muted/70">· {g.items.length}</span>
            </h3>
            <ItemGrid items={g.items} cols={split ? 4 : 6} />
          </div>
        ),
      )}
    </div>
  );
}

function ItemGrid({ items, cols = 6 }: { items: Offered[]; cols?: 3 | 4 | 6 }) {
  const colClass =
    cols === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : cols === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
  return (
    <div className={`grid grid-cols-2 gap-3 ${colClass}`}>
      {items.map((it) => (
        <ItemCard key={it.name} it={it} />
      ))}
    </div>
  );
}

function ItemCard({ it }: { it: Offered }) {
  const style = it.status ? seasonStyle(it.status) : null;
  return (
    <div className="card flex flex-col p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{it.emoji}</span>
        {style && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>{style.label}</span>
        )}
      </div>
      <p className="mt-2 font-semibold leading-tight text-brand-ink">{it.name}</p>
      {it.note && <p className="text-xs text-brand-muted">{it.note}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {it.carriers.map((v) => (
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

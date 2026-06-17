import { fetchSeasonality, fetchVendors, fetchAllProducts, fetchFrontPageMarketDate, fetchAttendingForDate } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useVisitList } from '@/lib/visitList';
import type { SeasonItem, Vendor } from '@/lib/types';

// The "this week" panel is built dynamically from what active vendors are
// actually carrying in season (vendor_products), gathered into a few broad
// display sections and enriched with the curated seasonality status/emoji/note
// when an item name matches. Add a vendor or product and it shows up on its own.

type ProductRow = { vendor_id: string; name: string; category: string | null; in_season: boolean };

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// Raw product categories collapse into a handful of broad sections (in render
// order) so the panel stays compact. `cats` order also sub-orders items within
// a section (e.g. veg before fruit inside "Fresh produce").
const GROUPS: { key: string; label: string; emoji: string; cats: string[] }[] = [
  { key: 'prepared', label: 'Prepared foods & drinks', emoji: '🍴', cats: ['Prepared', 'Beverage', 'Coffee', 'Tea'] },
  { key: 'produce', label: 'Fresh produce', emoji: '🥬', cats: ['Vegetable', 'Fruit', 'Herb', 'Mushroom'] },
  { key: 'bakery', label: 'Bakery', emoji: '🍞', cats: ['Bread', 'Pastry'] },
  { key: 'protein', label: 'Meat, eggs & seafood', emoji: '🥩', cats: ['Meat', 'Eggs', 'Seafood'] },
  { key: 'dairy', label: 'Cheese & dairy', emoji: '🧀', cats: ['Cheese', 'Dairy'] },
  { key: 'pantry', label: 'Pantry & sweets', emoji: '🍯', cats: ['Pantry', 'Confection', 'Pasta', 'Grain', 'Nuts'] },
  { key: 'flowers', label: 'Flowers, plants & trees', emoji: '💐', cats: ['Flowers', 'Plant'] },
  { key: 'crafts', label: 'Crafts & services', emoji: '🛠️', cats: ['Body', 'Home', 'Art', 'Service'] },
];
const CAT_TO_GROUP = new Map<string, (typeof GROUPS)[number]>();
for (const g of GROUPS) for (const c of g.cats) CAT_TO_GROUP.set(c, g);

// Default emoji per raw category, so items keep a fitting glyph even inside a
// merged section (a fruit shows 🍎 within "Fresh produce").
const CAT_EMOJI: Record<string, string> = {
  Prepared: '🍴', Beverage: '🥤', Coffee: '☕', Tea: '🍵',
  Vegetable: '🥬', Fruit: '🍎', Herb: '🌿', Mushroom: '🍄',
  Bread: '🍞', Pastry: '🥐',
  Meat: '🥩', Eggs: '🥚', Seafood: '🐟',
  Cheese: '🧀', Dairy: '🥛',
  Pantry: '🍯', Confection: '🍫', Pasta: '🍝', Grain: '🌾', Nuts: '🌰',
  Flowers: '💐', Plant: '🌱',
  Body: '🧼', Home: '🕯️', Art: '🎨', Service: '🛠️',
};

// Available-now items lead each section; "coming" trails.
const STATUS_RANK: Record<string, number> = { peak: 0, ready: 0, ending: 1, coming: 3 };
const rankOf = (status: string | null) => (status == null ? 2 : STATUS_RANK[status] ?? 2);

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
function shareWord(a: string, b: string): boolean {
  const aw = words(a);
  for (const w of words(b)) if (aw.has(w)) return true;
  return false;
}

type Offered = { name: string; cat: string; emoji: string; status: string | null; note: string | null; carriers: Vendor[] };

export function SeasonStrip({ layout = 'stacked' }: { layout?: 'stacked' | 'split' } = {}) {
  const { data, loading } = useAsync(
    async () => {
      const [items, vendors, products] = await Promise.all([fetchSeasonality(), fetchVendors(), fetchAllProducts()]);
      // Limit the panel to vendors confirmed for the front-page market (the
      // flagship's next date), so items from vendors who won't be there are hidden.
      const fp = await fetchFrontPageMarketDate(todayISO());
      const attending = fp ? await fetchAttendingForDate(fp.dateId) : [];
      return { items, vendors, products, attending };
    },
    [],
    { items: [] as SeasonItem[], vendors: [] as Vendor[], products: [] as ProductRow[], attending: [] as string[] },
  );

  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  if (!data.products.length) return isSupabaseConfigured ? null : <SetupNotice />;

  const vendorById = new Map(data.vendors.map((v) => [v.id, v]));
  // Only show items carried by vendors attending the front-page market. Falls back
  // to all vendors if there's no attendance data yet (so the panel never blanks).
  const attendingSet = new Set(data.attending);
  const filterAttending = attendingSet.size > 0;
  // Curated seasonality match (status/emoji/note) by exact name or shared word.
  const seasonFor = (name: string): SeasonItem | undefined =>
    data.items.find((s) => s.item.toLowerCase() === name.toLowerCase() || shareWord(s.item, name));

  // group key → (lowercased item name → Offered)
  const buckets = new Map<string, Map<string, Offered>>();
  for (const p of data.products) {
    if (!p.in_season) continue;
    const vendor = vendorById.get(p.vendor_id); // active vendors only
    if (!vendor) continue;
    if (filterAttending && !attendingSet.has(vendor.id)) continue; // attending the front-page market
    const cat = (p.category ?? '').trim();
    const g = CAT_TO_GROUP.get(cat);
    if (!g) continue;
    const nameKey = p.name.trim().toLowerCase();
    let bucket = buckets.get(g.key);
    if (!bucket) buckets.set(g.key, (bucket = new Map()));
    let entry = bucket.get(nameKey);
    if (!entry) {
      const s = seasonFor(p.name);
      entry = {
        name: p.name.trim(),
        cat,
        emoji: s?.emoji ?? CAT_EMOJI[cat] ?? g.emoji,
        status: s?.status ?? null,
        note: s?.note ?? null,
        carriers: [],
      };
      bucket.set(nameKey, entry);
    }
    if (!entry.carriers.some((c) => c.id === vendor.id)) entry.carriers.push(vendor);
  }

  const groupList = GROUPS.filter((g) => buckets.get(g.key)?.size).map((g) => {
    const catRank = (c: string) => {
      const i = g.cats.indexOf(c);
      return i === -1 ? g.cats.length : i;
    };
    return {
      ...g,
      items: [...buckets.get(g.key)!.values()].sort(
        (a, b) =>
          catRank(a.cat) - catRank(b.cat) || rankOf(a.status) - rankOf(b.status) || a.name.localeCompare(b.name),
      ),
    };
  });

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
              🍴 Ready now — prepared foods &amp; drinks
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
    <div className={`grid grid-cols-2 gap-2 ${colClass}`}>
      {items.map((it) => (
        <ItemCard key={it.name} it={it} />
      ))}
    </div>
  );
}

// Compact card: emoji + status on one row, name clamped to two lines, the note
// kept as a hover tooltip, and carriers capped so rows stay short and scannable.
function ItemCard({ it }: { it: Offered }) {
  const visit = useVisitList();
  const style = it.status ? seasonStyle(it.status) : null;
  const shown = it.carriers.slice(0, 3);
  const extra = it.carriers.length - shown.length;
  return (
    <div className="card flex flex-col gap-1 p-2.5" title={it.note ?? undefined}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-lg leading-none">{it.emoji}</span>
        {style && (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style.className}`}>
            {style.label}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-tight text-brand-ink">{it.name}</p>
      <div className="mt-0.5 flex flex-wrap gap-1">
        {shown.map((v) => {
          const added = visit.has(v.slug);
          return (
            <button
              key={v.id}
              onClick={() => visit.toggle(v.slug)}
              title={added ? `Remove ${v.name} from your visit list` : `Add ${v.name} to your visit list`}
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium transition ${
                added
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-primary/10 text-brand-primary-dark hover:bg-brand-primary/20'
              }`}
            >
              {added ? '✓ ' : ''}
              {v.name}
            </button>
          );
        })}
        {extra > 0 && <span className="px-1 py-0.5 text-[10px] text-brand-muted">+{extra} more</span>}
      </div>
    </div>
  );
}

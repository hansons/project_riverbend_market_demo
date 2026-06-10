import { fetchSeasonality } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { currentMonth, seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SeasonItem } from '@/lib/types';

// Category sections, top to bottom. Anything not listed falls in after, A–Z.
const CATEGORY_ORDER = ['Prepared Food', 'Vegetable', 'Fruit', 'Herb', 'Flowers', 'Nuts', 'Pantry'];

export function SeasonStrip() {
  const { data: items, loading } = useAsync(fetchSeasonality, [], []);
  const month = currentMonth();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  }
  if (!items.length) {
    return isSupabaseConfigured ? null : <SetupNotice />;
  }

  // Group by category.
  const groups = new Map<string, SeasonItem[]>();
  for (const it of items) {
    const arr = groups.get(it.category) ?? [];
    arr.push(it);
    groups.set(it.category, arr);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
  ];

  // Within a section: items in season this month first, then by sort.
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
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{s.emoji ?? '🌿'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-brand-ink">{s.item}</p>
                  <p className="text-xs text-brand-muted">{s.note ?? s.category}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

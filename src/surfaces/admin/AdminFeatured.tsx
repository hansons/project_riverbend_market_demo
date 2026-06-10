import { useState } from 'react';
import { fetchAllVendors, setVendorFeatured } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { pickWeeklyFeatured, weekIndex } from '@/lib/featured';
import { categoryEmoji } from '@/lib/format';

export function AdminFeatured() {
  const { data: vendors, loading, reload } = useAsync(fetchAllVendors, [], []);
  const [busy, setBusy] = useState<string | null>(null);

  const active = vendors.filter((v) => v.status === 'active');
  const pool = active.filter((v) => v.featured);
  const spotlight = pickWeeklyFeatured(pool);

  async function toggle(id: string, featured: boolean) {
    setBusy(id);
    await setVendorFeatured(id, featured);
    setBusy(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Featured vendors</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Star the vendors you want in the rotation. The home page spotlights <strong>3 at a time</strong>{' '}
          and <strong>rotates weekly</strong> on its own — like a recurring announcement. Star at least 4
          to see it cycle.
        </p>
      </div>

      <div className="card border-brand-accent bg-brand-accent/5 p-5">
        <p className="field-label">Spotlight this week</p>
        {spotlight.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {spotlight.map((v) => (
              <span key={v.id} className="chip">
                {categoryEmoji(v.category)} {v.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-brand-muted">No featured vendors yet — star some below.</p>
        )}
        <p className="mt-2 text-[11px] text-brand-muted">
          {pool.length} starred · rotates every week (currently week #{weekIndex()})
        </p>
      </div>

      <div>
        <h3 className="text-lg">Active vendors ({active.length})</h3>
        {loading ? (
          <div className="mt-3 h-64 animate-pulse rounded-2xl bg-brand-card" />
        ) : (
          <div className="card mt-3 divide-y divide-brand-line">
            {active.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">
                  {categoryEmoji(v.category)} <span className="font-medium text-brand-ink">{v.name}</span>
                  <span className="ml-1 text-xs text-brand-muted">· {v.category}</span>
                </span>
                <button
                  onClick={() => toggle(v.id, !v.featured)}
                  disabled={busy === v.id}
                  className={[
                    'shrink-0 rounded-lg border px-3 py-1 text-sm font-semibold transition',
                    v.featured
                      ? 'border-brand-accent bg-brand-accent/15 text-brand-ink'
                      : 'border-brand-line text-brand-muted hover:bg-brand-paper',
                  ].join(' ')}
                >
                  {v.featured ? '★ Featured' : '☆ Feature'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

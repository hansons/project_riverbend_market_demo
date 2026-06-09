import { useMemo, useState } from 'react';
import { fetchVendors } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SetupNotice } from '@/components/SetupNotice';
import { VendorCard } from './VendorCard';

export function VendorBrowse() {
  const { data: vendors, loading } = useAsync(fetchVendors, [], []);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(vendors.map((v) => v.category))).sort()],
    [vendors],
  );

  const filtered = vendors.filter((v) => {
    const matchesCat = category === 'All' || v.category === category;
    const q = query.trim().toLowerCase();
    const matchesText =
      !q ||
      v.name.toLowerCase().includes(q) ||
      (v.tagline ?? '').toLowerCase().includes(q) ||
      v.practices.some((p) => p.toLowerCase().includes(q));
    return matchesCat && matchesText;
  });

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <p className="eyebrow">The market</p>
      <h1 className="text-3xl">Vendors</h1>
      <p className="mt-1 text-brand-muted">Browse everyone who sets up a stand this season.</p>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                'rounded-full border px-3 py-1 text-sm font-medium transition',
                category === c
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-line bg-brand-card text-brand-ink/70 hover:border-brand-primary/40',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors…"
          className="field-input sm:w-56"
        />
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-brand-card" />
            ))}
          </div>
        ) : !vendors.length ? (
          isSupabaseConfigured ? (
            <p className="text-brand-muted">No vendors yet.</p>
          ) : (
            <SetupNotice />
          )
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        ) : (
          <p className="text-brand-muted">No vendors match that search.</p>
        )}
      </div>
    </div>
  );
}

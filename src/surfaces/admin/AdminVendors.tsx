import { useMemo, useRef, useState } from 'react';
import { fetchAllVendors, setVendorStatus } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { useHotkey } from '@/lib/useKeyNav';
import { categoryEmoji, vendorStatusStyle } from '@/lib/format';
import type { VendorStatus } from '@/lib/types';

const FILTERS: (VendorStatus | 'all')[] = ['all', 'active', 'pending', 'suspended'];

export function AdminVendors() {
  const { data: vendors, loading, reload } = useAsync(fetchAllVendors, [], []);
  const [filter, setFilter] = useState<VendorStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey(['/'], () => searchRef.current?.focus()); // "/" jumps to search

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: vendors.length };
    for (const v of vendors) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [vendors]);

  const rows = vendors.filter((v) => {
    const okStatus = filter === 'all' || v.status === filter;
    const q = query.trim().toLowerCase();
    const okText = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
    return okStatus && okText;
  });

  async function setStatus(id: string, status: VendorStatus) {
    setBusy(id);
    await setVendorStatus(id, status);
    setBusy(null);
    reload();
  }

  return (
    <div>
      <h2 className="text-xl">Vendors</h2>
      <p className="mt-1 text-sm text-brand-muted">The full roster — only admins can see suspended/pending rows.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'rounded-full border px-3 py-1 text-sm font-medium capitalize transition',
                filter === f ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-line bg-brand-card text-brand-ink/70',
              ].join(' ')}
            >
              {f} {counts[f] ? `(${counts[f]})` : ''}
            </button>
          ))}
        </div>
        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search… ( / )" className="field-input sm:w-52" />
      </div>

      {loading ? (
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-brand-card" />
      ) : (
        <div className="card mt-5 divide-y divide-brand-line">
          {rows.map((v) => {
            const style = vendorStatusStyle(v.status);
            return (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-brand-ink">
                    {categoryEmoji(v.category)} {v.name}
                  </p>
                  <p className="text-xs text-brand-muted">{v.category} · {v.town ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.className}`}>{style.label}</span>
                  {v.status !== 'active' ? (
                    <button onClick={() => setStatus(v.id, 'active')} disabled={busy === v.id} className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper">
                      Activate
                    </button>
                  ) : (
                    <button onClick={() => setStatus(v.id, 'suspended')} disabled={busy === v.id} className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold text-status-alert hover:bg-brand-paper">
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="p-4 text-sm text-brand-muted">No vendors match.</p>}
        </div>
      )}
    </div>
  );
}

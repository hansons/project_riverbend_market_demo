import { useMemo, useRef, useState } from 'react';
import { fetchAllVendors, setVendorStatus, updateVendorMarkets } from '@/lib/adminData';
import { fetchMarkets } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useHotkey } from '@/lib/useKeyNav';
import { notifyVendorApproved } from '@/lib/push';
import { categoryEmoji, vendorStatusStyle } from '@/lib/format';
import { VendorManagersPanel } from './VendorManagersPanel';
import type { VendorStatus } from '@/lib/types';

// Stable seeded UUIDs for the two primary markets.
const SUMMER_MARKET_ID = '22220000-0000-4000-8000-000000000001'; // Saturday / Riverfront
const WINTER_MARKET_ID = '22220000-0000-4000-8000-000000000003'; // Indoor Winter

const FILTERS: (VendorStatus | 'all')[] = ['all', 'active', 'pending', 'suspended'];

export function AdminVendors() {
  const { data: vendors, loading, reload } = useAsync(fetchAllVendors, [], []);
  const { data: markets } = useAsync(fetchMarkets, [], []);
  const [filter, setFilter] = useState<VendorStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey(['/'], () => searchRef.current?.focus()); // "/" jumps to search
  const [openManagers, setOpenManagers] = useState<string | null>(null);

  // Show Summer/Winter eligibility only when both markets exist in the DB.
  const hasSummer = markets.some((m) => m.id === SUMMER_MARKET_ID);
  const hasWinter = markets.some((m) => m.id === WINTER_MARKET_ID);
  const showEligibility = hasSummer && hasWinter;

  type EligibilityMode = 'both' | 'summer' | 'winter';
  function eligibilityMode(marketIds: string[]): EligibilityMode {
    if (marketIds.length === 0) return 'both';
    if (marketIds.includes(SUMMER_MARKET_ID) && !marketIds.includes(WINTER_MARKET_ID)) return 'summer';
    if (marketIds.includes(WINTER_MARKET_ID) && !marketIds.includes(SUMMER_MARKET_ID)) return 'winter';
    return 'both';
  }
  async function setMarkets(id: string, mode: EligibilityMode) {
    setBusy(id);
    const ids = mode === 'both' ? [] : mode === 'summer' ? [SUMMER_MARKET_ID] : [WINTER_MARKET_ID];
    await updateVendorMarkets(id, ids);
    setBusy(null);
    reload();
  }

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
    if (status === 'active') void notifyVendorApproved(id); // best-effort push, never blocks
    setBusy(null);
    reload();
  }

  return (
    <div>
      <h2 className="text-xl">Vendors</h2>
      <p className="mt-1 text-sm text-brand-muted">
        The full roster — only admins can see suspended/pending rows. Open <strong>Managers</strong> on an
        active vendor to invite the people who run that stand (several allowed); access activates once
        provisioning is enabled.
      </p>

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
              <div key={v.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-ink">
                      {categoryEmoji(v.category)} {v.name}
                    </p>
                    <p className="text-xs text-brand-muted">{v.category} · {v.town ?? '—'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.className}`}>{style.label}</span>
                    {showEligibility && v.status === 'active' && (
                      <span className="inline-flex items-center gap-0.5 rounded-lg border border-brand-line p-0.5">
                        {(['both', 'summer', 'winter'] as const).map((mode) => {
                          const active = eligibilityMode(v.market_ids) === mode;
                          return (
                            <button
                              key={mode}
                              onClick={() => setMarkets(v.id, mode)}
                              disabled={busy === v.id}
                              title={mode === 'both' ? 'All markets' : mode === 'summer' ? 'Summer / Riverfront only' : 'Indoor Winter only'}
                              className={[
                                'rounded-md px-2 py-0.5 text-xs font-medium transition',
                                active
                                  ? 'bg-brand-primary text-white'
                                  : 'text-brand-ink/60 hover:bg-brand-paper',
                              ].join(' ')}
                            >
                              {mode === 'both' ? 'Both' : mode === 'summer' ? 'Summer' : 'Winter'}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    {v.status === 'active' && (
                      <button
                        onClick={() => setOpenManagers((cur) => (cur === v.id ? null : v.id))}
                        className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper"
                      >
                        Managers {openManagers === v.id ? '▲' : '▾'}
                      </button>
                    )}
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
                {openManagers === v.id && (
                  <div className="border-t border-brand-line bg-brand-paper/40 p-4">
                    <VendorManagersPanel vendor={v} />
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="p-4 text-sm text-brand-muted">No vendors match.</p>}
        </div>
      )}
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { fetchAllDocuments, signedDocUrl, unverifyDocument, verifyDocument } from '@/lib/documents';
import { useAsync } from '@/lib/useAsync';
import { useHotkey } from '@/lib/useKeyNav';
import { docStatusStyle, formatDate, relativeDays } from '@/lib/format';
import type { VendorDocumentStatus } from '@/lib/types';

type Filter = 'all' | 'expired' | 'expiring' | 'valid' | 'unverified';
const FILTERS: Filter[] = ['all', 'expired', 'expiring', 'valid', 'unverified'];

export function AdminDocuments() {
  const { profile } = useAuth();
  const { data: docs, loading, reload } = useAsync(fetchAllDocuments, [], []);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey(['/'], () => searchRef.current?.focus()); // "/" jumps to search

  const soon = docs
    .filter((d) => d.status === 'expired' || d.expiring_soon)
    .sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length, unverified: docs.filter((d) => !d.verified_at).length };
    for (const d of docs) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [docs]);

  const rows = docs.filter((d) => {
    const okFilter =
      filter === 'all' ? true : filter === 'unverified' ? !d.verified_at : d.status === filter;
    const q = query.trim().toLowerCase();
    const okText = !q || d.vendor_name.toLowerCase().includes(q) || d.doc_label.toLowerCase().includes(q);
    return okFilter && okText;
  });

  async function toggleVerify(d: VendorDocumentStatus) {
    setBusy(d.id);
    if (d.verified_at) await unverifyDocument(d.id);
    else await verifyDocument(d.id, profile?.id ?? '');
    setBusy(null);
    reload();
  }

  async function view(p: string | null) {
    if (!p) return;
    const url = await signedDocUrl(p);
    if (url) window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl">Vendor documents</h2>

      <div className="card p-5">
        <p className="field-label">Expiring soon</p>
        {soon.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">Nothing expired or expiring in the next 60 days. 🎉</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {soon.map((d) => {
              const pill = docStatusStyle(d.status);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium text-brand-ink">{d.vendor_name}</span>
                    <span className="text-brand-muted"> · {d.doc_label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-brand-muted">{d.expires_date ? relativeDays(d.expires_date) : ''}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendor or doc… ( / )" className="field-input sm:w-60" />
        </div>

        {loading ? (
          <div className="mt-5 h-64 animate-pulse rounded-2xl bg-brand-card" />
        ) : (
          <div className="card mt-5 divide-y divide-brand-line">
            {rows.map((d) => {
              const pill = docStatusStyle(d.status);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-ink">{d.vendor_name}</p>
                    <p className="text-xs text-brand-muted">
                      {d.doc_label}
                      {d.doc_required ? ' · required' : ''}
                      {d.expires_date ? ` · expires ${formatDate(d.expires_date)}` : ' · no expiry'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                    {d.file_url && (
                      <button onClick={() => view(d.file_url)} className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper">
                        View
                      </button>
                    )}
                    <button
                      onClick={() => toggleVerify(d)}
                      disabled={busy === d.id}
                      className={[
                        'rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper',
                        d.verified_at ? 'text-brand-muted' : 'text-status-ok',
                      ].join(' ')}
                    >
                      {d.verified_at ? '✓ Verified' : 'Verify'}
                    </button>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <p className="p-4 text-sm text-brand-muted">No documents match.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

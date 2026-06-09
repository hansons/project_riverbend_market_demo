import { useState } from 'react';
import { fetchAllVendors, setVendorStatus } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { categoryEmoji } from '@/lib/format';

export function AdminApplications() {
  const { data: vendors, loading, reload } = useAsync(fetchAllVendors, [], []);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = vendors.filter((v) => v.status === 'pending');

  async function decide(id: string, status: 'active' | 'suspended') {
    setBusy(id);
    await setVendorStatus(id, status);
    setBusy(null);
    reload();
  }

  return (
    <div>
      <h2 className="text-xl">Application queue</h2>
      <p className="mt-1 text-sm text-brand-muted">
        New vendor applications. Approving makes them live on the public site; declining hides them.
      </p>

      {loading ? (
        <div className="mt-5 h-40 animate-pulse rounded-2xl bg-brand-card" />
      ) : pending.length === 0 ? (
        <div className="card mt-5 p-6 text-sm text-brand-muted">
          🎉 No applications waiting. New submissions from the public “Sell with us” form land here.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {pending.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-brand-primary-dark">{v.name}</h3>
                    <span className="chip">{categoryEmoji(v.category)} {v.category}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-brand-muted">
                    {v.town ?? 'Location n/a'}
                    {v.email ? ` · ${v.email}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(v.id, 'active')} disabled={busy === v.id} className="btn-primary">
                    Approve
                  </button>
                  <button onClick={() => decide(v.id, 'suspended')} disabled={busy === v.id} className="btn-outline">
                    Decline
                  </button>
                </div>
              </div>
              {v.story && <p className="mt-3 text-sm text-brand-ink/90">{v.story}</p>}
              {v.practices.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.practices.map((p) => (
                    <span key={p} className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary-dark">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

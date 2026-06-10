import { useState } from 'react';
import { approveCategory, deleteCategory, fetchAllCategories } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';

export function AdminCategories() {
  const { data: cats, loading, reload } = useAsync(fetchAllCategories, [], []);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = cats.filter((c) => c.status === 'pending');
  const active = cats.filter((c) => c.status === 'active');

  async function approve(id: string) {
    setBusy(id);
    await approveCategory(id);
    setBusy(null);
    reload();
  }
  async function remove(id: string, msg: string) {
    if (!window.confirm(msg)) return;
    setBusy(id);
    await deleteCategory(id);
    setBusy(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Categories</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Approve new categories vendors request, or curate the shared list.
        </p>
      </div>

      <div>
        <h3 className="text-lg">
          Requests{pending.length > 0 && <span className="ml-2 rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs font-semibold text-brand-primary-dark">{pending.length}</span>}
        </h3>
        {loading ? (
          <div className="mt-3 h-20 animate-pulse rounded-2xl bg-brand-card" />
        ) : pending.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No pending requests.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-brand-primary-dark">{c.name}</p>
                  <p className="text-xs text-brand-muted">Requested by a vendor</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary px-3 py-1.5" disabled={busy === c.id} onClick={() => approve(c.id)}>
                    Approve
                  </button>
                  <button
                    className="btn-outline px-3 py-1.5"
                    disabled={busy === c.id}
                    onClick={() => remove(c.id, `Reject the "${c.name}" request?`)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg">Active categories ({active.length})</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {active.map((c) => (
            <span key={c.id} className="chip">
              {c.name}
              <button
                onClick={() => remove(c.id, `Remove category "${c.name}"? Products keep their label.`)}
                disabled={busy === c.id}
                title="Remove"
                className="ml-1 font-bold text-status-alert hover:text-status-alert/70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

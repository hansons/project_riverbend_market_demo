import { fetchAllVendors } from '@/lib/adminData';
import { fetchAllDocuments } from '@/lib/documents';
import { fetchAllProducts } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, toCSV } from '@/lib/csv';
import { categoryEmoji } from '@/lib/format';
import type { Vendor, VendorDocumentStatus } from '@/lib/types';

interface CheckItem {
  label: string;
  done: boolean;
}

// "Done-done" = the vendor's SETUP is complete. Recurring activity (weekly
// offerings, schedule) is intentionally excluded — that's ongoing, not setup.
function checklistFor(v: Vendor, hasProducts: boolean, docOk: boolean): CheckItem[] {
  return [
    { label: 'Cover photo', done: !!v.image_url },
    { label: 'Logo', done: !!v.logo_url },
    { label: 'Tagline', done: !!v.tagline },
    { label: 'Farm story', done: !!v.story },
    { label: 'Town', done: !!v.town },
    { label: 'Contact email', done: !!v.email },
    { label: 'Stand list', done: hasProducts },
    { label: 'Current insurance', done: docOk },
  ];
}

export function AdminReadiness() {
  const { data, loading } = useAsync(
    async () => {
      const [vendors, products, docs] = await Promise.all([
        fetchAllVendors(),
        fetchAllProducts(),
        fetchAllDocuments(),
      ]);
      return { vendors, productIds: products.map((p) => p.vendor_id), docs };
    },
    [],
    { vendors: [] as Vendor[], productIds: [] as string[], docs: [] as VendorDocumentStatus[] },
  );

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />;

  const productIds = new Set(data.productIds);
  const rows = data.vendors
    .filter((v) => v.status === 'active')
    .map((v) => {
      const docOk = data.docs.some(
        (d) => d.vendor_id === v.id && d.doc_required && (d.status === 'valid' || d.status === 'no_expiry'),
      );
      const items = checklistFor(v, productIds.has(v.id), docOk);
      const missing = items.filter((i) => !i.done);
      return { v, items, missing, done: missing.length === 0 };
    })
    .sort((a, b) => b.missing.length - a.missing.length || a.v.name.localeCompare(b.v.name));

  const doneCount = rows.filter((r) => r.done).length;

  function exportList() {
    const header = ['vendor', 'category', 'status', 'outstanding'];
    const out = rows.map((r) => [
      r.v.name,
      r.v.category,
      r.done ? 'done-done' : 'incomplete',
      r.missing.map((m) => m.label).join('; '),
    ]);
    downloadCSV('riverbend-vendor-readiness.csv', toCSV([header, ...out]));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl">Readiness</h2>
          <p className="mt-1 text-sm text-brand-muted">
            What each active vendor still needs to be “done-done” — {doneCount} of {rows.length} fully set up.
          </p>
        </div>
        <button
          onClick={exportList}
          className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper"
        >
          ⬇ Action list (CSV)
        </button>
      </div>

      <div className="card divide-y divide-brand-line">
        {rows.map((r) => (
          <div key={r.v.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-brand-ink">
                {categoryEmoji(r.v.category)} {r.v.name}
              </p>
              {r.done ? (
                <p className="mt-0.5 text-xs text-status-ok">All set</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.missing.map((m) => (
                    <span
                      key={m.label}
                      className="rounded-full bg-status-warn/15 px-2 py-0.5 text-xs font-semibold text-brand-berry"
                    >
                      Needs {m.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {r.done ? (
              <span className="shrink-0 rounded-full bg-status-ok/10 px-2 py-0.5 text-xs font-semibold text-status-ok">
                Done-done ✓
              </span>
            ) : (
              <span className="shrink-0 text-xs font-semibold text-brand-muted">
                {r.items.length - r.missing.length}/{r.items.length}
              </span>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-brand-muted">No active vendors.</p>}
      </div>
    </div>
  );
}

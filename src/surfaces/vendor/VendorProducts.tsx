import { useRef, useState } from 'react';
import { fetchVendorProducts } from '@/lib/data';
import { replaceProducts, type ProductInput } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import { formatPrice } from '@/lib/format';
import type { Vendor } from '@/lib/types';

const HEADER = ['name', 'category', 'unit', 'price', 'in_season', 'sort'];
const SAMPLE: string[][] = [
  HEADER,
  ['Sugar snap peas', 'Vegetable', 'lb', '6.00', 'true', '1'],
  ['Rainbow chard', 'Vegetable', 'bunch', '3.50', 'true', '2'],
  ['Heirloom tomatoes', 'Vegetable', 'lb', '5.00', 'false', '3'],
];

const parseBool = (s: string) => {
  const v = (s ?? '').trim().toLowerCase();
  return !(v === 'false' || v === 'no' || v === '0' || v === 'n');
};
const parsePrice = (s: string): number | null => {
  const n = parseFloat((s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? null : Math.round(n * 100);
};

export function VendorProducts({ vendor }: { vendor: Vendor }) {
  const { data: products, loading, reload } = useAsync(() => fetchVendorProducts(vendor.id), [vendor.id], []);
  const [preview, setPreview] = useState<ProductInput[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportCurrent() {
    const rows = [
      HEADER,
      ...products.map((p, i) => [
        p.name,
        p.category ?? '',
        p.unit ?? '',
        p.price_cents == null ? '' : (p.price_cents / 100).toFixed(2),
        String(p.in_season),
        String(p.sort || i + 1),
      ]),
    ];
    downloadCSV(`${vendor.slug}-stand-list.csv`, toCSV(rows));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    const objs = parseCSVObjects(await file.text());
    const parsed: ProductInput[] = objs
      .filter((o) => (o.name ?? '').trim())
      .map((o, i) => ({
        name: o.name.trim(),
        category: o.category?.trim() || null,
        unit: o.unit?.trim() || null,
        price_cents: parsePrice(o.price),
        in_season: o.in_season === undefined ? true : parseBool(o.in_season),
        sort: o.sort ? parseInt(o.sort, 10) || i + 1 : i + 1,
      }));
    if (!parsed.length) {
      setError('No rows with a name found. Header should be: name, category, unit, price, in_season, sort.');
      setPreview(null);
      return;
    }
    setPreview(parsed);
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    const err = await replaceProducts(vendor.id, preview);
    setBusy(false);
    if (err) setError(err);
    else {
      setPreview(null);
      reload();
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-xl">Stand list</h2>
        <p className="mt-1 text-sm text-brand-muted">
          The products & prices shown on your public page. Edit a few here, or update the whole list in a
          spreadsheet: <strong>export → edit → import</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => downloadCSV('stand-list-sample.csv', toCSV(SAMPLE))}>
            ⬇ Sample CSV
          </button>
          <button className="btn-outline" onClick={exportCurrent} disabled={!products.length}>
            ⬇ Export current
          </button>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>
            ⬆ Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </div>
        {error && <p className="mt-3 text-sm text-status-alert">{error}</p>}
      </div>

      {preview && (
        <div className="card border-brand-accent p-6">
          <p className="font-semibold text-brand-primary-dark">
            Import preview — {preview.length} item{preview.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-sm text-brand-berry">
            ⚠ Applying will <strong>replace</strong> your entire stand list with these rows.
          </p>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-brand-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-brand-paper text-left text-xs uppercase text-brand-muted">
                <tr><th className="p-2">Item</th><th className="p-2">Category</th><th className="p-2">Price</th><th className="p-2">In season</th></tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-t border-brand-line">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-brand-muted">{p.category ?? '—'}</td>
                    <td className="p-2">{formatPrice(p.price_cents, p.unit)}</td>
                    <td className="p-2">{p.in_season ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={apply} disabled={busy}>
              {busy ? 'Importing…' : `Replace stand list (${preview.length})`}
            </button>
            <button className="btn-ghost" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg">Current items ({products.length})</h3>
        {loading ? (
          <div className="mt-3 h-32 animate-pulse rounded-2xl bg-brand-card" />
        ) : products.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No items yet — import a CSV to get started.</p>
        ) : (
          <div className="card mt-3 divide-y divide-brand-line">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span className={p.in_season ? 'text-brand-ink' : 'text-brand-muted'}>
                  {p.name}
                  {!p.in_season && <span className="ml-2 text-xs">(out of season)</span>}
                </span>
                <span className="font-medium text-brand-primary-dark">{formatPrice(p.price_cents, p.unit)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

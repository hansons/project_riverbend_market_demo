import { useState } from 'react';
import { fetchVendorProducts } from '@/lib/data';
import {
  addProduct,
  deleteProduct,
  fetchProductCategories,
  replaceProducts,
  requestCategory,
  updateProduct,
  type ProductInput,
} from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import { CsvToolbar } from '@/components/CsvToolbar';
import { currentMonth, formatMonths, formatPrice, isProductInSeason, parseMonths } from '@/lib/format';
import type { ProductCategory, Vendor, VendorProduct } from '@/lib/types';

const HEADER = ['name', 'category', 'unit', 'price', 'in_season', 'season', 'sort'];
const SAMPLE: string[][] = [
  HEADER,
  ['Strawberries', 'Fruit', 'pint', '5.00', 'true', 'May-Jun', '1'],
  ['Sugar snap peas', 'Vegetable', 'lb', '6.00', 'true', 'May-Jun', '2'],
  ['Heirloom tomatoes', 'Vegetable', 'lb', '5.00', 'false', 'Jul-Sep', '3'],
  ['Aged cheddar', 'Cheese', 'wedge', '11.00', 'true', '', '4'],
];

const parseBool = (s: string) => {
  const v = (s ?? '').trim().toLowerCase();
  return !(v === 'false' || v === 'no' || v === '0' || v === 'n');
};
const parsePrice = (s: string): number | null => {
  const n = parseFloat((s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? null : Math.round(n * 100);
};

interface EditorValues {
  name: string;
  category: string;
  unit: string;
  price: string;
  in_season: boolean;
  season: string;
}
const EMPTY: EditorValues = { name: '', category: '', unit: '', price: '', in_season: true, season: '' };

const toInput = (v: EditorValues, sort: number): ProductInput => ({
  name: v.name.trim(),
  category: v.category.trim() || null,
  unit: v.unit.trim() || null,
  price_cents: parsePrice(v.price),
  in_season: v.in_season,
  season_months: parseMonths(v.season),
  sort,
});

export function VendorProducts({ vendor }: { vendor: Vendor }) {
  const { data: products, loading, reload } = useAsync(() => fetchVendorProducts(vendor.id), [vendor.id], []);
  const { data: categories, reload: reloadCats } = useAsync(fetchProductCategories, [], []);
  const [preview, setPreview] = useState<ProductInput[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function requestCat(name: string) {
    await requestCategory(vendor.id, name);
    reloadCats();
  }

  function exportCurrent() {
    const rows = [
      HEADER,
      ...products.map((p, i) => [
        p.name,
        p.category ?? '',
        p.unit ?? '',
        p.price_cents == null ? '' : (p.price_cents / 100).toFixed(2),
        String(p.in_season),
        formatMonths(p.season_months),
        String(p.sort || i + 1),
      ]),
    ];
    downloadCSV(`${vendor.slug}-stand-list.csv`, toCSV(rows));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
        season_months: parseMonths(o.season ?? ''),
        sort: o.sort ? parseInt(o.sort, 10) || i + 1 : i + 1,
      }));
    if (!parsed.length) {
      setError('No rows with a name found. Header should be: name, category, unit, price, in_season, season, sort.');
      setPreview(null);
      return;
    }
    setPreview(parsed);
  }

  async function applyImport() {
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

  async function add(v: EditorValues) {
    setBusy(true);
    await addProduct(vendor.id, toInput(v, products.length + 1));
    setBusy(false);
    setAdding(false);
    reload();
  }

  // Group products by category so the list self-organizes.
  const groups = new Map<string, VendorProduct[]>();
  for (const p of products) {
    const k = p.category || 'Uncategorized';
    const arr = groups.get(k) ?? [];
    arr.push(p);
    groups.set(k, arr);
  }
  const groupKeys = [...groups.keys()].sort((a, b) =>
    a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl">Stand list</h2>
            <p className="mt-1 text-sm text-brand-muted">
              The products &amp; prices on your public page, grouped by category. Edit items below, or
              update the whole list in a spreadsheet.
            </p>
          </div>
          <CsvToolbar
            onSample={() => downloadCSV('stand-list-sample.csv', toCSV(SAMPLE))}
            onExport={exportCurrent}
            onImport={onFile}
            exportDisabled={!products.length}
          />
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
                <tr><th className="p-2">Item</th><th className="p-2">Category</th><th className="p-2">Price</th><th className="p-2">Season</th><th className="p-2">In now</th></tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-t border-brand-line">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-brand-muted">{p.category ?? '—'}</td>
                    <td className="p-2">{formatPrice(p.price_cents, p.unit)}</td>
                    <td className="p-2 text-brand-muted">{formatMonths(p.season_months) || 'Year-round'}</td>
                    <td className="p-2">{isProductInSeason(p) ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={applyImport} disabled={busy}>
              {busy ? 'Importing…' : `Replace stand list (${preview.length})`}
            </button>
            <button className="btn-ghost" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Current items ({products.length})</h3>
          {!adding && (
            <button className="btn-outline px-3 py-1.5 text-sm" onClick={() => setAdding(true)}>+ Add item</button>
          )}
        </div>

        {adding && (
          <div className="mt-3">
            <ProductEditor initial={EMPTY} submitLabel="Add item" busy={busy} categories={categories} onRequestCategory={requestCat} onSubmit={add} onCancel={() => setAdding(false)} />
          </div>
        )}

        {loading ? (
          <div className="mt-3 h-32 animate-pulse rounded-2xl bg-brand-card" />
        ) : products.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No items yet — add one above or import a CSV.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {groupKeys.map((cat) => (
              <div key={cat}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">{cat}</h4>
                <div className="space-y-2">
                  {groups.get(cat)!.map((p) => (
                    <ProductRow key={p.id} product={p} categories={categories} onRequestCategory={requestCat} onChanged={reload} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  categories,
  onRequestCategory,
  onChanged,
}: {
  product: VendorProduct;
  categories: ProductCategory[];
  onRequestCategory: (name: string) => Promise<void>;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(v: EditorValues) {
    setBusy(true);
    await updateProduct(product.id, toInput(v, product.sort));
    setBusy(false);
    setEditing(false);
    onChanged();
  }
  async function remove() {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setBusy(true);
    await deleteProduct(product.id);
    setBusy(false);
    onChanged();
  }

  if (editing) {
    return (
      <ProductEditor
        initial={{
          name: product.name,
          category: product.category ?? '',
          unit: product.unit ?? '',
          price: product.price_cents == null ? '' : (product.price_cents / 100).toFixed(2),
          in_season: product.in_season,
          season: formatMonths(product.season_months),
        }}
        submitLabel="Save"
        busy={busy}
        categories={categories}
        onRequestCategory={onRequestCategory}
        onSubmit={save}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className={isProductInSeason(product) ? 'text-brand-ink' : 'text-brand-muted'}>
        {product.name}
        {product.season_months.length > 0 && (
          <span className="ml-2 text-xs text-brand-accent">{formatMonths(product.season_months)}</span>
        )}
        {!isProductInSeason(product) && <span className="ml-2 text-xs">(out of season)</span>}
      </span>
      <div className="flex items-center gap-3">
        <span className="font-medium text-brand-primary-dark">{formatPrice(product.price_cents, product.unit)}</span>
        <button onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-primary hover:underline">Edit</button>
        <button onClick={remove} disabled={busy} className="text-xs font-semibold text-status-alert hover:underline">Delete</button>
      </div>
    </div>
  );
}

function ProductEditor({
  initial,
  submitLabel,
  busy,
  categories,
  onRequestCategory,
  onSubmit,
  onCancel,
}: {
  initial: EditorValues;
  submitLabel: string;
  busy: boolean;
  categories: ProductCategory[];
  onRequestCategory: (name: string) => Promise<void>;
  onSubmit: (v: EditorValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState(initial.category);
  const [unit, setUnit] = useState(initial.unit);
  const [price, setPrice] = useState(initial.price);
  const [inSeason, setInSeason] = useState(initial.in_season);
  const [season, setSeason] = useState(initial.season);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [reqBusy, setReqBusy] = useState(false);

  const known = categories.some((c) => c.name === category);
  const months = parseMonths(season);
  const showInSeason = months.length > 0 ? months.includes(currentMonth()) : inSeason;

  async function requestNew() {
    const n = newCat.trim();
    if (!n) return;
    setReqBusy(true);
    await onRequestCategory(n);
    setReqBusy(false);
    setCategory(n);
    setNewCat('');
    setAddingCat(false);
  }

  return (
    <div className="rounded-xl border border-brand-accent bg-brand-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="field-label">Item name</span>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sugar snap peas" />
        </label>
        <label className="block">
          <span className="field-label">Category</span>
          <select
            className="field-input"
            value={category}
            onChange={(e) => (e.target.value === '__add__' ? setAddingCat(true) : setCategory(e.target.value))}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
                {c.status === 'pending' ? ' (pending review)' : ''}
              </option>
            ))}
            {category && !known && <option value={category}>{category}</option>}
            <option value="__add__">Other — add a category…</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Unit</span>
          <input className="field-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="lb / bunch / each" />
        </label>
        <label className="block">
          <span className="field-label">Price ($)</span>
          <input className="field-input" value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder="6.00" />
        </label>
        <label className="block">
          <span className="field-label">Season (months)</span>
          <input
            className="field-input"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="e.g. May–Jun · blank = year-round"
          />
        </label>
        <div>
          <span className="field-label">
            Availability{months.length > 0 && <span className="ml-1 text-brand-muted">(auto by season)</span>}
          </span>
          <button
            type="button"
            onClick={() => setInSeason((s) => !s)}
            disabled={months.length > 0}
            className={[
              'mt-1 w-full rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-90',
              showInSeason ? 'border-status-ok bg-status-ok/10 text-status-ok' : 'border-brand-line text-brand-muted',
            ].join(' ')}
          >
            {months.length > 0
              ? showInSeason
                ? '✓ In season now'
                : 'Out of season now'
              : inSeason
                ? '✓ In season'
                : 'Out of season'}
          </button>
        </div>
      </div>
      {months.length > 0 && (
        <p className="mt-2 text-xs text-brand-muted">
          Auto-listed {formatMonths(months)} — flips in and out of season on its own.
        </p>
      )}

      {addingCat && (
        <div className="mt-3 rounded-lg border border-brand-line bg-brand-card p-3">
          <span className="field-label">New category name</span>
          <div className="mt-1 flex flex-wrap gap-2">
            <input className="field-input mt-0 min-w-[12rem] flex-1" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Pickles & Ferments" />
            <button className="btn-primary" disabled={reqBusy || !newCat.trim()} onClick={requestNew}>
              {reqBusy ? 'Sending…' : 'Request'}
            </button>
            <button className="btn-ghost" onClick={() => setAddingCat(false)}>Cancel</button>
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            New categories are sent to the market admin for approval — you can use it on this item right away.
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={() => onSubmit({ name, category, unit, price, in_season: inSeason, season })}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { addOffering, addOfferingsBulk, fetchOfferings, type OfferingInput } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import { formatDate, thisSaturdayISO } from '@/lib/format';
import type { Vendor } from '@/lib/types';

const HEADER = ['week_of', 'headline', 'items', 'note'];
const SAMPLE: string[][] = [
  HEADER,
  ['2026-06-13', "This week's pick", 'Strawberries; Snap peas; Lettuce', 'Get there early'],
  ['2026-06-20', 'Tomatoes are in', 'Heirloom tomatoes; Basil; Garlic', ''],
];

export function VendorOfferings({ vendor }: { vendor: Vendor }) {
  const { data: offerings, loading, reload } = useAsync(() => fetchOfferings(vendor.id), [vendor.id], []);
  const [weekOf, setWeekOf] = useState(thisSaturdayISO());
  const [headline, setHeadline] = useState('');
  const [items, setItems] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OfferingInput[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function post() {
    if (!headline.trim() && !items.trim()) return;
    setSaving(true);
    setError(null);
    const err = await addOffering(vendor.id, {
      week_of: weekOf,
      headline: headline.trim(),
      items: items.split(',').map((i) => i.trim()).filter(Boolean),
      note: note.trim() || null,
    });
    setSaving(false);
    if (err) setError(err);
    else {
      setHeadline('');
      setItems('');
      setNote('');
      reload();
    }
  }

  function exportCurrent() {
    const rows = [
      HEADER,
      ...offerings.map((o) => [o.week_of, o.headline ?? '', o.items.join('; '), o.note ?? '']),
    ];
    downloadCSV(`${vendor.slug}-offerings.csv`, toCSV(rows));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    const parsed: OfferingInput[] = parseCSVObjects(await file.text())
      .filter((o) => (o.week_of ?? '').trim())
      .map((o) => ({
        week_of: o.week_of.trim(),
        headline: o.headline?.trim() || null,
        items: (o.items ?? '').split(';').map((i) => i.trim()).filter(Boolean),
        note: o.note?.trim() || null,
      }));
    if (!parsed.length) {
      setError('No rows with a week_of found. Header should be: week_of, headline, items, note.');
      return;
    }
    setPreview(parsed);
  }

  async function applyImport() {
    if (!preview) return;
    setSaving(true);
    const err = await addOfferingsBulk(vendor.id, preview);
    setSaving(false);
    if (err) setError(err);
    else {
      setPreview(null);
      reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl">Post this week’s “what I have”</h2>
        <p className="mt-1 text-sm text-brand-muted">Let shoppers know what you’re bringing.</p>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <label className="block">
              <span className="field-label">Week of</span>
              <input type="date" className="field-input" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
            </label>
            <label className="block flex-1">
              <span className="field-label">Headline</span>
              <input className="field-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Peak strawberry week" />
            </label>
          </div>
          <label className="block">
            <span className="field-label">Items (comma-separated)</span>
            <input className="field-input" value={items} onChange={(e) => setItems(e.target.value)} placeholder="Strawberries, Snap peas, Lettuce" />
          </label>
          <label className="block">
            <span className="field-label">Note (optional)</span>
            <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Get there early — limited flats" />
          </label>
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={post} disabled={saving}>
              {saving ? 'Posting…' : 'Post offering'}
            </button>
            {error && <span className="text-sm text-status-alert">{error}</span>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg">Bulk import / export</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Plan several weeks in a spreadsheet, then import them. (Items in a cell are separated by
          <code className="mx-1 rounded bg-brand-paper px-1">;</code>.) Imported posts are <strong>added</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => downloadCSV('offerings-sample.csv', toCSV(SAMPLE))}>⬇ Sample CSV</button>
          <button className="btn-outline" onClick={exportCurrent} disabled={!offerings.length}>⬇ Export current</button>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>⬆ Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </div>

        {preview && (
          <div className="mt-4 rounded-xl border border-brand-accent bg-brand-paper p-4">
            <p className="font-semibold text-brand-primary-dark">Add {preview.length} post{preview.length === 1 ? '' : 's'}?</p>
            <ul className="mt-2 space-y-1 text-sm">
              {preview.map((o, i) => (
                <li key={i} className="text-brand-ink">
                  <span className="text-brand-muted">{formatDate(o.week_of)}:</span> {o.headline ?? '(no headline)'} — {o.items.length} item(s)
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" onClick={applyImport} disabled={saving}>{saving ? 'Adding…' : 'Add posts'}</button>
              <button className="btn-ghost" onClick={() => setPreview(null)} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg">Recent posts</h3>
        {loading ? (
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-brand-card" />
        ) : offerings.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No posts yet — add your first above.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {offerings.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-brand-primary-dark">{o.headline ?? 'This week'}</p>
                  <span className="text-xs text-brand-muted">Week of {formatDate(o.week_of)}</span>
                </div>
                {o.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.items.map((it) => (
                      <span key={it} className="chip">{it}</span>
                    ))}
                  </div>
                )}
                {o.note && <p className="mt-2 text-sm text-brand-muted">{o.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

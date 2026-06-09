import { useState } from 'react';
import { addOffering, fetchOfferings } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import { formatDate, thisSaturdayISO } from '@/lib/format';
import type { Vendor } from '@/lib/types';

export function VendorOfferings({ vendor }: { vendor: Vendor }) {
  const { data: offerings, loading, reload } = useAsync(() => fetchOfferings(vendor.id), [vendor.id], []);
  const [weekOf, setWeekOf] = useState(thisSaturdayISO());
  const [headline, setHeadline] = useState('');
  const [items, setItems] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

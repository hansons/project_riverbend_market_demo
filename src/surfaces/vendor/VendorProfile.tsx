import { useState } from 'react';
import { updateVendor } from '@/lib/vendorData';
import { ImageUploader } from './ImageUploader';
import type { Vendor } from '@/lib/types';

const MARKET_DAYS = ['Saturday', 'Wednesday'];

export function VendorProfile({ vendor, onSaved }: { vendor: Vendor; onSaved: () => void }) {
  const [tagline, setTagline] = useState(vendor.tagline ?? '');
  const [story, setStory] = useState(vendor.story ?? '');
  const [town, setTown] = useState(vendor.town ?? '');
  const [category, setCategory] = useState(vendor.category);
  const [practices, setPractices] = useState(vendor.practices.join(', '));
  const [days, setDays] = useState<string[]>(vendor.market_days);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'ok' | string | null>(null);

  function toggleDay(d: string) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
    setResult(null);
  }

  async function saveImage(field: 'logo_url' | 'image_url', url: string) {
    await updateVendor(vendor.id, { [field]: url });
    onSaved();
  }

  async function save() {
    setSaving(true);
    setResult(null);
    const err = await updateVendor(vendor.id, {
      tagline: tagline.trim() || null,
      story: story.trim() || null,
      town: town.trim() || null,
      category: category.trim(),
      practices: practices.split(',').map((p) => p.trim()).filter(Boolean),
      market_days: days,
    });
    setSaving(false);
    setResult(err ?? 'ok');
    if (!err) onSaved();
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl">My Profile</h2>
      <p className="mt-1 text-sm text-brand-muted">
        This is what shoppers see on your public vendor page. Changes save straight to the database —
        and RLS only lets you edit <em>your own</em> farm.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ImageUploader
          vendorId={vendor.id}
          kind="logo"
          label="Logo"
          hint="Square works best · saved as 400px WebP"
          currentUrl={vendor.logo_url}
          shape="square"
          onUploaded={(url) => saveImage('logo_url', url)}
        />
        <ImageUploader
          vendorId={vendor.id}
          kind="cover"
          label="Cover photo"
          hint="Wide shot · saved as 1200px WebP"
          currentUrl={vendor.image_url}
          shape="wide"
          onUploaded={(url) => saveImage('image_url', url)}
        />
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="field-label">Tagline</span>
          <input className="field-input" value={tagline} onChange={(e) => { setTagline(e.target.value); setResult(null); }} />
        </label>

        <label className="block">
          <span className="field-label">Category</span>
          <input className="field-input" value={category} onChange={(e) => { setCategory(e.target.value); setResult(null); }} />
        </label>

        <label className="block">
          <span className="field-label">Town</span>
          <input className="field-input" value={town} onChange={(e) => { setTown(e.target.value); setResult(null); }} />
        </label>

        <label className="block">
          <span className="field-label">Farm story</span>
          <textarea
            className="field-input min-h-[120px]"
            value={story}
            onChange={(e) => { setStory(e.target.value); setResult(null); }}
          />
        </label>

        <label className="block">
          <span className="field-label">Practices (comma-separated)</span>
          <input
            className="field-input"
            value={practices}
            onChange={(e) => { setPractices(e.target.value); setResult(null); }}
            placeholder="Certified Organic, No-spray"
          />
        </label>

        <div>
          <span className="field-label">Market days</span>
          <div className="mt-2 flex gap-2">
            {MARKET_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={[
                  'rounded-full border px-3 py-1 text-sm font-medium transition',
                  days.includes(d)
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-brand-line bg-brand-card text-brand-ink/70',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {result === 'ok' && <span className="text-sm text-status-ok">✓ Saved</span>}
        {result && result !== 'ok' && <span className="text-sm text-status-alert">{result}</span>}
      </div>
    </div>
  );
}

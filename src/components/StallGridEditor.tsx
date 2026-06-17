import { useState } from 'react';
import { MarketMap } from './MarketMap';
import { StallSetList, type StallItem } from './StallSetList';
import { coordForLabel, saveMarketStalls, type StallPos } from '@/lib/stalls';

// Grid-based stall-set manager: add / remove / disable stalls with a live grid
// preview. Saves to market_stalls (the source of truth for the set). New stalls
// get default coordinates (A1–D12 grid slot, else market center) so they also
// appear on the satellite map, where they can be repositioned.
export function StallGridEditor({
  marketId,
  initialStalls,
  onSaved,
  onCancel,
}: {
  marketId: string;
  initialStalls: StallPos[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState<StallItem[]>(() =>
    initialStalls.map((s) => ({ label: s.label, disabled: !!s.disabled, category: s.category ?? undefined })),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<'ok' | string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function add(label: string): string | null {
    if (!label) return 'Enter a stall label.';
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) return 'That stall already exists.';
    setItems((cur) => [...cur, { label, disabled: false }]);
    setDirty(true);
    return null;
  }
  function remove(label: string) {
    setItems((cur) => cur.filter((i) => i.label !== label));
    setDirty(true);
  }
  function toggle(label: string) {
    setItems((cur) => cur.map((i) => (i.label === label ? { ...i, disabled: !i.disabled } : i)));
    setDirty(true);
  }
  function setCategory(label: string, category: string) {
    setItems((cur) => cur.map((i) => (i.label === label ? { ...i, category } : i)));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const byLabel = new Map(initialStalls.map((s) => [s.label, s]));
    const stalls: StallPos[] = items.map((it) => {
      const [lat, lng] = coordForLabel(it.label, byLabel.get(it.label));
      return { label: it.label, lat, lng, disabled: it.disabled, category: it.category };
    });
    const err = await saveMarketStalls(marketId, stalls);
    setSaving(false);
    if (err) setMsg(err);
    else {
      setDirty(false);
      setMsg('ok');
      onSaved();
    }
  }

  const selectedItem = items.find((i) => i.label === selected) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
      <div>
        <p className="mb-2 text-sm text-brand-muted">
          Click a stall to configure it. Add, remove, or disable stalls; new stalls drop onto the
          satellite map at the market center — switch to Satellite to position them.
        </p>
        <MarketMap stalls={items} colorBy="category" onCellClick={setSelected} highlight={selected} clickableDisabled />
      </div>
      <div>
        {selectedItem && (
          <div className="card mb-3 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-brand-ink">Stall {selectedItem.label}</p>
              <button onClick={() => setSelected(null)} className="text-xs text-brand-muted hover:underline">
                Close
              </button>
            </div>
            <label className="mt-2 block">
              <span className="field-label">Category</span>
              <input
                list="stall-categories"
                className="field-input mt-1"
                value={selectedItem.category ?? ''}
                onChange={(e) => setCategory(selectedItem.label, e.target.value)}
                placeholder="Category (optional)"
              />
            </label>
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-outline" onClick={() => toggle(selectedItem.label)}>
                {selectedItem.disabled ? 'Enable stall' : 'Disable stall'}
              </button>
              <button
                className="text-sm font-semibold text-status-alert hover:underline"
                onClick={() => {
                  remove(selectedItem.label);
                  setSelected(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        <StallSetList items={items} onAdd={add} onRemove={remove} onToggleDisable={toggle} onSetCategory={setCategory} />
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save stalls'}
        </button>
        <button className="btn-ghost" onClick={onCancel} disabled={saving}>
          Done
        </button>
        {msg === 'ok' && <span className="text-sm text-status-ok">✓ Saved</span>}
        {msg && msg !== 'ok' && <span className="text-sm text-status-alert">{msg}</span>}
      </div>
    </div>
  );
}

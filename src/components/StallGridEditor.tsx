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
    initialStalls.map((s) => ({ label: s.label, disabled: !!s.disabled })),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<'ok' | string | null>(null);

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

  async function save() {
    setSaving(true);
    setMsg(null);
    const byLabel = new Map(initialStalls.map((s) => [s.label, s]));
    const stalls: StallPos[] = items.map((it) => {
      const [lat, lng] = coordForLabel(it.label, byLabel.get(it.label));
      return { label: it.label, lat, lng, disabled: it.disabled };
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

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
      <div>
        <p className="mb-2 text-sm text-brand-muted">
          Add, remove, or disable stalls. New stalls drop onto the satellite map at the market center —
          switch to Satellite to position them.
        </p>
        <MarketMap stalls={items} />
      </div>
      <StallSetList items={items} onAdd={add} onRemove={remove} onToggleDisable={toggle} />
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

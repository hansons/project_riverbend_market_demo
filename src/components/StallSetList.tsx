import { useState } from 'react';

export interface StallItem {
  label: string;
  disabled: boolean;
  category?: string;
}

const CATEGORY_SUGGESTIONS = [
  'Produce',
  'Prepared Foods',
  'Bakery',
  'Dairy & Cheese',
  'Meat & Eggs',
  'Honey & Preserves',
  'Flowers',
  'Herbs & Plants',
  'Coffee & Tea',
  'Seafood',
  'Crafts & Body',
  'Service',
];

// Shared add / remove / disable / categorize list for a market's stall set. Used by
// both the Grid and Satellite editors so the controls behave identically.
export function StallSetList({
  items,
  onAdd,
  onRemove,
  onToggleDisable,
  onSetCategory,
}: {
  items: StallItem[];
  /** Returns an error message to show, or null on success. */
  onAdd: (label: string) => string | null;
  onRemove: (label: string) => void;
  onToggleDisable: (label: string) => void;
  onSetCategory: (label: string, category: string) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function add() {
    const e = onAdd(newLabel.trim());
    if (e) setErr(e);
    else {
      setNewLabel('');
      setErr(null);
    }
  }

  const disabledCount = items.filter((i) => i.disabled).length;

  return (
    <div className="flex flex-col">
      <datalist id="stall-categories">
        {CATEGORY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex gap-1.5">
        <input
          className="field-input"
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New stall (e.g. E1)"
        />
        <button className="btn-outline px-3" onClick={add}>
          Add
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-status-alert">{err}</p>}

      <div className="mt-2 max-h-[340px] divide-y divide-brand-line overflow-y-auto rounded-xl border border-brand-line">
        {items.map((it) => (
          <div key={it.label} className="px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className={it.disabled ? 'text-brand-muted line-through' : 'font-medium text-brand-ink'}>{it.label}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => onToggleDisable(it.label)} className="text-xs font-semibold text-brand-muted hover:underline">
                  {it.disabled ? 'Enable' : 'Disable'}
                </button>
                <button onClick={() => onRemove(it.label)} className="text-xs font-semibold text-status-alert hover:underline">
                  Remove
                </button>
              </div>
            </div>
            <input
              list="stall-categories"
              className="field-input mt-1 h-8 py-1 text-xs"
              value={it.category ?? ''}
              onChange={(e) => onSetCategory(it.label, e.target.value)}
              placeholder="Category (optional)"
            />
          </div>
        ))}
        {items.length === 0 && <p className="px-3 py-2 text-xs text-brand-muted">No stalls.</p>}
      </div>
      <p className="mt-1 text-[11px] text-brand-muted">
        {items.length} stalls · {disabledCount} disabled
      </p>
    </div>
  );
}

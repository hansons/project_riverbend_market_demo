import { useState } from 'react';

export interface StallItem {
  label: string;
  disabled: boolean;
}

// Shared add / remove / disable list for managing a market's stall set. Used by
// both the Grid and Satellite editors so the controls behave identically.
export function StallSetList({
  items,
  onAdd,
  onRemove,
  onToggleDisable,
}: {
  items: StallItem[];
  /** Returns an error message to show, or null on success. */
  onAdd: (label: string) => string | null;
  onRemove: (label: string) => void;
  onToggleDisable: (label: string) => void;
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

      <div className="mt-2 max-h-[320px] divide-y divide-brand-line overflow-y-auto rounded-xl border border-brand-line">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
            <span className={it.disabled ? 'text-brand-muted line-through' : 'text-brand-ink'}>{it.label}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleDisable(it.label)} className="text-xs font-semibold text-brand-muted hover:underline">
                {it.disabled ? 'Enable' : 'Disable'}
              </button>
              <button onClick={() => onRemove(it.label)} className="text-xs font-semibold text-status-alert hover:underline">
                Remove
              </button>
            </div>
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

// Keyboard-shortcuts help. Opened with "?" or the DemoBar keyboard button; closed
// with Esc, the ✕, or a backdrop click. Mirrors IntroOverlay's modal structure.
export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const ROWS: { keys: string; action: string }[] = [
    { keys: 'W / S · ↑ / ↓', action: 'Move between sections (the left rail)' },
    { keys: 'A / D · ← / →', action: 'Previous / next day (Stalls, Tokens, Attendance)' },
    { keys: '/', action: 'Jump to the search box (Vendors, Documents)' },
    { keys: '?', action: 'Show this shortcuts panel' },
    { keys: 'Esc', action: 'Close this panel' },
  ];

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="card my-auto w-full max-w-md p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Keyboard shortcuts</p>
            <h2 className="mt-1 text-2xl">Move without the mouse</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-paper text-brand-muted hover:bg-brand-line/40"
          >
            ✕
          </button>
        </div>

        <ul className="mt-5 divide-y divide-brand-line">
          {ROWS.map((r) => (
            <li key={r.keys} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-sm text-brand-ink">{r.action}</span>
              <kbd className="shrink-0 rounded-md border border-brand-line bg-brand-paper px-2 py-1 text-xs font-semibold text-brand-ink">
                {r.keys}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-brand-paper px-3 py-2 text-xs text-brand-muted">
          Shortcuts pause while you’re typing in a field.
        </p>
        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

import { useRef } from 'react';

// Compact CSV controls (sample / export / import) for a screen header.
// Owns the hidden file input and clears it after each pick.
export function CsvToolbar({
  onSample,
  onExport,
  onImport,
  exportDisabled,
}: {
  onSample: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportDisabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cls =
    'grid h-8 w-8 place-items-center rounded-lg border border-brand-line text-sm text-brand-muted transition hover:bg-brand-paper hover:text-brand-ink disabled:opacity-40';

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={cls} title="Download sample CSV" onClick={onSample}>
        📄
      </button>
      <button type="button" className={cls} title="Export CSV" onClick={onExport} disabled={exportDisabled}>
        ⬇
      </button>
      <button type="button" className={cls} title="Import CSV" onClick={() => fileRef.current?.click()}>
        ⬆
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          onImport(e);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
    </div>
  );
}

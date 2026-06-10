import { useRef, useState } from 'react';
import { uploadVendorImage } from '@/lib/vendorData';

export function ImageUploader({
  vendorId,
  kind,
  label,
  hint,
  currentUrl,
  shape,
  onUploaded,
}: {
  vendorId: string;
  kind: 'logo' | 'cover';
  label: string;
  hint: string;
  currentUrl: string | null;
  shape: 'square' | 'wide';
  onUploaded: (url: string) => Promise<void> | void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (ref.current) ref.current.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await uploadVendorImage(vendorId, kind, file);
    if (res.error || !res.url) {
      setError(res.error ?? 'Upload failed.');
      setBusy(false);
      return;
    }
    await onUploaded(res.url);
    setBusy(false);
  }

  const box = shape === 'square' ? 'h-20 w-20' : 'h-20 w-32';
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className={`${box} shrink-0 overflow-hidden rounded-xl border border-brand-line bg-brand-paper`}>
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className={`h-full w-full ${shape === 'square' ? 'object-contain p-1' : 'object-cover'}`}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xl text-brand-muted">🖼️</div>
          )}
        </div>
        <div>
          <button type="button" className="btn-outline" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? 'Processing…' : currentUrl ? 'Replace' : 'Upload'}
          </button>
          <input ref={ref} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <p className="mt-1 text-xs text-brand-muted">{hint}</p>
          {error && <p className="mt-1 text-xs text-status-alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}

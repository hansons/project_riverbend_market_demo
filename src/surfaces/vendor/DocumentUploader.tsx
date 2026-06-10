import { useRef, useState } from 'react';
import { uploadVendorDocument } from '@/lib/vendorData';

/** Private-bucket sibling of ImageUploader: accepts a PDF/JPG/PNG, no resize, and
 *  hands back the storage PATH (the caller stores it; a signed URL is fetched on read). */
export function DocumentUploader({
  vendorId,
  uploaded,
  onUploaded,
}: {
  vendorId: string;
  uploaded: boolean;
  onUploaded: (path: string) => void;
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
    const res = await uploadVendorDocument(vendorId, file);
    if (res.error || !res.path) {
      setError(res.error ?? 'Upload failed.');
      setBusy(false);
      return;
    }
    onUploaded(res.path);
    setBusy(false);
  }

  return (
    <div>
      <button type="button" className="btn-outline" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? 'Uploading…' : uploaded ? '✓ File attached — replace' : 'Attach file (PDF/JPG/PNG)'}
      </button>
      <input ref={ref} type="file" accept=".pdf,image/jpeg,image/png" onChange={onFile} className="hidden" />
      {error && <p className="mt-1 text-xs text-status-alert">{error}</p>}
    </div>
  );
}

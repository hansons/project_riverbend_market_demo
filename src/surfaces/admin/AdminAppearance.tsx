import { useRef, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { uploadMarketAsset, updateMarketBranding } from '@/lib/tenant';

export function AdminAppearance() {
  const { tenant, reload } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Appearance</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Set your market’s logo, favicon, and color palette. Changes apply to your public site and the
          portals for everyone.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg">Logo &amp; favicon</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Your logo shows in the site header; the favicon is the little icon in the browser tab. Images are
          resized and converted to WebP automatically on upload.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <AssetUploader
            kind="logo"
            label="Market logo"
            hint="Shown beside your market name in the header — a square mark works best."
            currentUrl={tenant.logo_url}
            onChanged={reload}
          />
          <AssetUploader
            kind="favicon"
            label="Favicon"
            hint="The browser-tab icon — keep it small and simple."
            currentUrl={tenant.favicon_url}
            onChanged={reload}
          />
        </div>
      </div>

      <ThemePicker />
    </div>
  );
}

function AssetUploader({
  kind,
  label,
  hint,
  currentUrl,
  onChanged,
}: {
  kind: 'logo' | 'favicon';
  label: string;
  hint: string;
  currentUrl: string | null;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setBusy(true);
    setErr(null);
    const res = await uploadMarketAsset(file, kind);
    if ('error' in res) {
      setErr(res.error);
      setBusy(false);
      return;
    }
    const uerr = await updateMarketBranding(kind === 'logo' ? { logo_url: res.url } : { favicon_url: res.url });
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const uerr = await updateMarketBranding(kind === 'logo' ? { logo_url: null } : { favicon_url: null });
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-line bg-brand-paper">
          {currentUrl ? (
            <img src={currentUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xl text-brand-muted">🖼️</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <button
            className="btn-outline px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? 'Uploading…' : currentUrl ? 'Replace' : 'Upload'}
          </button>
          {currentUrl && (
            <button className="text-xs font-semibold text-status-alert hover:underline" disabled={busy} onClick={remove}>
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
      {err && <p className="mt-1 text-xs text-status-alert">{err}</p>}
    </div>
  );
}

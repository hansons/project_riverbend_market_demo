import { useRef, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { uploadMarketAsset, updateMarketBranding, uploadFloorPlan } from '@/lib/tenant';
import { fetchAllMarketMaps, saveMarketFloorPlan } from '@/lib/stalls';
import { fetchMarkets } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';

type AssetKind = 'logo' | 'favicon' | 'banner';

const patchFor = (kind: AssetKind, url: string | null) =>
  kind === 'logo' ? { logo_url: url } : kind === 'favicon' ? { favicon_url: url } : { banner_url: url };

export function AdminAppearance() {
  const { tenant, reload } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Appearance</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Set your market’s logo, favicon, banner, and color palette. Changes apply to your public site and
          the portals for everyone.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg">Logo, favicon &amp; banner</h3>
        <p className="mt-1 text-sm text-brand-muted">
          The logo shows in the header, the favicon in the browser tab, and the banner behind the home-page
          headline. Images are resized and converted to WebP automatically on upload.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <AssetUploader
            kind="logo"
            label="Market logo"
            hint="Recommended: square, ~512×512px (a transparent PNG works great). Shown beside your market name."
            currentUrl={tenant.logo_url}
            onChanged={reload}
          />
          <AssetUploader
            kind="favicon"
            label="Favicon"
            hint="Recommended: square, 64×64px (any small square). The browser-tab icon."
            currentUrl={tenant.favicon_url}
            onChanged={reload}
          />
        </div>
        <div className="mt-5">
          <AssetUploader
            kind="banner"
            variant="wide"
            label="Home banner"
            hint="Recommended: wide landscape, ~1600×600px (3:1). Sits behind the home-page headline; leave empty for the default look."
            currentUrl={tenant.banner_url}
            onChanged={reload}
          />
        </div>
      </div>

      <ThemePicker />

      <FloorPlanManager />
    </div>
  );
}

function FloorPlanManager() {
  const { data: markets } = useAsync(fetchMarkets, [], []);
  const { data: allMaps, reload } = useAsync(fetchAllMarketMaps, [], {});

  return (
    <div className="card p-6">
      <h3 className="text-lg">Market floor plans</h3>
      <p className="mt-1 text-sm text-brand-muted">
        Upload a floor plan image for indoor or non-satellite venues. When set, the stall map switches from
        satellite tiles to the floor plan — stall positions are then placed on pixel coordinates.
      </p>
      <div className="mt-5 space-y-4">
        {markets.map((m) => {
          const currentUrl = allMaps[m.id]?.floor_plan_url ?? null;
          return (
            <FloorPlanUploader
              key={m.id}
              marketId={m.id}
              marketName={m.name}
              currentUrl={currentUrl}
              onChanged={reload}
            />
          );
        })}
        {!markets.length && <p className="text-sm text-brand-muted">No markets found.</p>}
      </div>
    </div>
  );
}

function FloorPlanUploader({
  marketId,
  marketName,
  currentUrl,
  onChanged,
}: {
  marketId: string;
  marketName: string;
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
    const res = await uploadFloorPlan(file);
    if ('error' in res) { setErr(res.error); setBusy(false); return; }
    const uerr = await saveMarketFloorPlan(marketId, res.url);
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const uerr = await saveMarketFloorPlan(marketId, null);
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-line bg-brand-paper p-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-line bg-brand-card">
        {currentUrl
          ? <img src={currentUrl} alt="" className="h-full w-full object-cover" />
          : <span className="text-2xl">🗺️</span>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-ink">{marketName}</p>
        <p className="text-xs text-brand-muted">{currentUrl ? 'Floor plan set — stall map uses image overlay' : 'No floor plan — uses satellite tiles'}</p>
        {err && <p className="mt-0.5 text-xs text-status-alert">{err}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-outline px-3 py-1.5 text-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? 'Uploading…' : currentUrl ? 'Replace' : 'Upload'}
        </button>
        {currentUrl && (
          <button className="text-xs font-semibold text-status-alert hover:underline" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
    </div>
  );
}

function AssetUploader({
  kind,
  label,
  hint,
  currentUrl,
  onChanged,
  variant = 'square',
}: {
  kind: AssetKind;
  label: string;
  hint: string;
  currentUrl: string | null;
  onChanged: () => void;
  variant?: 'square' | 'wide';
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
    const uerr = await updateMarketBranding(patchFor(kind, res.url));
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const uerr = await updateMarketBranding(patchFor(kind, null));
    setBusy(false);
    if (uerr) setErr(uerr);
    else onChanged();
  }

  const buttons = (
    <div className="flex items-center gap-3">
      <button className="btn-outline px-3 py-1.5 text-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? 'Uploading…' : currentUrl ? 'Replace' : 'Upload'}
      </button>
      {currentUrl && (
        <button className="text-xs font-semibold text-status-alert hover:underline" disabled={busy} onClick={remove}>
          Remove
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );

  return (
    <div>
      <p className="field-label">{label}</p>
      {variant === 'wide' ? (
        <div className="mt-1.5">
          <div className="aspect-[3/1] w-full overflow-hidden rounded-lg border border-brand-line bg-brand-paper">
            {currentUrl ? (
              <img src={currentUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-2xl text-brand-muted">🖼️</div>
            )}
          </div>
          <div className="mt-2">{buttons}</div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-line bg-brand-paper">
            {currentUrl ? (
              <img src={currentUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xl text-brand-muted">🖼️</span>
            )}
          </div>
          {buttons}
        </div>
      )}
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
      {err && <p className="mt-1 text-xs text-status-alert">{err}</p>}
    </div>
  );
}

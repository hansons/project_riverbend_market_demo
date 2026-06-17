import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAsync } from '@/lib/useAsync';
import { fetchMarkets } from '@/lib/data';
import { fetchAllMarketCenters, saveMarketCenter, DEFAULT_CENTER } from '@/lib/stalls';
import { updateMarket, createMarket, deleteMarket } from '@/lib/platform';
import type { Market } from '@/lib/types';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// A satellite map with a fixed centre crosshair; reports the map centre as the
// chosen location whenever the owner stops panning.
function LocationPicker({ value, onChange }: { value: [number, number]; onChange: (c: [number, number]) => void }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(value, 18);
    L.tileLayer(ESRI, { maxZoom: 22, maxNativeZoom: 19, attribution: ATTRIB }).addTo(map);
    map.on('moveend', () => {
      const c = map.getCenter();
      onChange([c.lat, c.lng]);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="relative">
      <div ref={elRef} className="h-60 w-full overflow-hidden rounded-xl border border-brand-line" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-translate-y-3 text-3xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">📍</span>
      </div>
    </div>
  );
}

function MarketConfigCard({
  market,
  initialCenter,
  onChanged,
}: {
  market: Market;
  initialCenter: [number, number];
  onChanged: () => void;
}) {
  const [name, setName] = useState(market.name);
  const [day, setDay] = useState(market.day_of_week);
  const [hours, setHours] = useState(market.hours);
  const [season, setSeason] = useState(market.season);
  const [location, setLocation] = useState(market.location);
  const [blurb, setBlurb] = useState(market.blurb ?? '');
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<'ok' | string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const err =
      (await updateMarket(market.id, {
        name: name.trim(),
        day_of_week: day,
        hours: hours.trim(),
        season: season.trim(),
        location: location.trim(),
        blurb: blurb.trim() || null,
      })) || (await saveMarketCenter(market.id, center[0], center[1]));
    setSaving(false);
    if (err) setMsg(err);
    else {
      setMsg('ok');
      onChanged();
    }
  }

  async function remove() {
    if (!window.confirm(`Remove “${market.name}”? This permanently deletes its market days and their stall assignments.`))
      return;
    setSaving(true);
    setMsg(null);
    const err = await deleteMarket(market.id);
    setSaving(false);
    if (err) setMsg(err);
    else onChanged();
  }

  return (
    <div className="card p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block">
            <span className="field-label">Market name</span>
            <input className="field-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Day</span>
              <select className="field-input mt-1" value={day} onChange={(e) => setDay(e.target.value)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Hours</span>
              <input className="field-input mt-1" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="9am – 1pm" />
            </label>
          </div>
          <label className="block">
            <span className="field-label">Season</span>
            <input className="field-input mt-1" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="April – November" />
          </label>
          <label className="block">
            <span className="field-label">Location</span>
            <input
              className="field-input mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Willow Bend Park, riverside lawn"
            />
          </label>
          <label className="block">
            <span className="field-label">Blurb</span>
            <textarea className="field-input mt-1" rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
          </label>
        </div>
        <div>
          <span className="field-label">Default map location (satellite center)</span>
          <p className="mb-1.5 mt-0.5 text-xs text-brand-muted">
            Pan so the 📍 sits on your market. This locks where the stall map opens — the Market Admin
            can’t move it.
          </p>
          <LocationPicker value={center} onChange={setCenter} />
          <p className="mt-1 text-[11px] text-brand-muted">
            {center[0].toFixed(5)}, {center[1].toFixed(5)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save market'}
        </button>
        <button className="text-sm font-semibold text-status-alert hover:underline" onClick={remove} disabled={saving}>
          Remove market
        </button>
        {msg === 'ok' && <span className="text-sm text-status-ok">✓ Saved</span>}
        {msg && msg !== 'ok' && <span className="text-sm text-status-alert">{msg}</span>}
      </div>
    </div>
  );
}

export function OwnerMarkets() {
  const { data: markets, loading, reload } = useAsync(fetchMarkets, [], []);
  const { data: centers, reload: reloadCenters } = useAsync(fetchAllMarketCenters, [], {});
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const sort = markets.reduce((m, x) => Math.max(m, x.sort), 0) + 1;
    await createMarket({
      name: 'New market',
      day_of_week: 'Saturday',
      season: 'Year-round',
      hours: '9am – 1pm',
      location: 'Set a location',
      blurb: null,
      sort,
    });
    setBusy(false);
    reload();
  }

  function refresh() {
    reload();
    reloadCenters();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl">Markets</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Configure each deployed market’s key details and its default map location. Branding stays with
          the Market Admin; the location is owner-controlled, so a deployment stays tied to one place.
        </p>
      </div>
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />
      ) : (
        <div className="space-y-5">
          {markets.map((m) => (
            <MarketConfigCard key={m.id} market={m} initialCenter={centers[m.id] ?? DEFAULT_CENTER} onChanged={refresh} />
          ))}
        </div>
      )}
      <button className="btn-outline" onClick={add} disabled={busy}>
        {busy ? 'Adding…' : '+ Add market'}
      </button>
    </div>
  );
}

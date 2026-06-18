import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAsync } from '@/lib/useAsync';
import { fetchMarkets } from '@/lib/data';
import {
  fetchAllMarketMaps,
  saveMarketMap,
  aspectClass,
  MAP_ASPECTS,
  DEFAULT_CENTER,
  type MapAspect,
  type MarketMapSettings,
} from '@/lib/stalls';
import { updateMarket, createMarket, deleteMarket } from '@/lib/platform';
import type { Market } from '@/lib/types';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// A satellite map with a draggable 📍 marker; reports the marker position as the
// chosen location. Drag the pin or click the map to move it.
function LocationPicker({
  value,
  zoom,
  aspect,
  onChange,
}: {
  value: [number, number];
  zoom: number;
  aspect: MapAspect;
  onChange: (center: [number, number], zoom: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.5, zoomDelta: 0.5 }).setView(value, zoom);
    L.tileLayer(ESRI, { maxZoom: 22, maxNativeZoom: 19, attribution: ATTRIB }).addTo(map);
    const icon = L.divIcon({
      className: '',
      html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">📍</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
    });
    const marker = L.marker(value, { draggable: true, icon }).addTo(map);
    // Report the pin position + current zoom whenever either changes.
    const emit = () => {
      const ll = marker.getLatLng();
      onChange([ll.lat, ll.lng], map.getZoom());
    };
    marker.on('dragend', emit);
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      emit();
    });
    map.on('zoomend', emit);
    mapRef.current = map;
    // Re-fit Leaflet whenever the chosen shape resizes the container (fires after
    // layout, so the satellite tiles reload for the new size instead of vanishing).
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={elRef} className={`${aspectClass(aspect)} overflow-hidden rounded-xl border border-brand-line`} />;
}

function MarketConfigCard({
  market,
  settings,
  onChanged,
}: {
  market: Market;
  settings: MarketMapSettings;
  onChanged: () => void;
}) {
  const [name, setName] = useState(market.name);
  const [day, setDay] = useState(market.day_of_week);
  const [hours, setHours] = useState(market.hours);
  const [season, setSeason] = useState(market.season);
  const [location, setLocation] = useState(market.location);
  const [blurb, setBlurb] = useState(market.blurb ?? '');
  const [center, setCenter] = useState<[number, number]>(settings.center ?? DEFAULT_CENTER);
  const [zoom, setZoom] = useState<number>(settings.zoom ?? 18);
  const [aspect, setAspect] = useState<MapAspect>(settings.aspect);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<'ok' | string | null>(null);
  const [open, setOpen] = useState(false);

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
      })) || (await saveMarketMap(market.id, center, zoom, aspect));
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold text-brand-primary-dark">{name || 'Untitled market'}</p>
          <p className="truncate text-xs text-brand-muted">
            {day}
            {location ? ` · ${location}` : ''}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-brand-muted">{open ? '▲ Collapse' : '▼ Edit'}</span>
      </button>
      {open && (
        <div className="mt-4">
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
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="field-label">Default map location &amp; shape</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-brand-line text-[11px]">
              {MAP_ASPECTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAspect(a)}
                  className={
                    aspect === a
                      ? 'bg-brand-primary px-2.5 py-1 font-semibold capitalize text-white'
                      : 'px-2.5 py-1 capitalize text-brand-ink/70 hover:bg-brand-paper'
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-1.5 text-xs text-brand-muted">
            Drag the 📍 onto your market (or click the map), then <strong>Save market</strong>. This locks
            where the stall map opens — the Market Admin can’t move it.
          </p>
          {/* key on aspect → recreate the map in the correctly-sized container
              (re-inits from center + zoom, so the chosen framing is preserved). */}
          <LocationPicker
            key={aspect}
            value={center}
            zoom={zoom}
            aspect={aspect}
            onChange={(c, z) => {
              setCenter(c);
              setZoom(z);
            }}
          />
          <p className="mt-1 text-[11px] text-brand-muted">
            {center[0].toFixed(5)}, {center[1].toFixed(5)} · zoom {zoom} · {aspect}
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
      )}
    </div>
  );
}

export function OwnerMarkets() {
  const { data: markets, loading, reload } = useAsync(fetchMarkets, [], []);
  const { data: maps, reload: reloadMaps } = useAsync(fetchAllMarketMaps, [], {});
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
    reloadMaps();
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
      {loading && !markets.length ? (
        <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />
      ) : (
        <div className="space-y-5">
          {markets.map((m) => (
            <MarketConfigCard
              key={m.id}
              market={m}
              settings={maps[m.id] ?? { center: null, zoom: null, aspect: 'landscape' }}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
      <button className="btn-outline" onClick={add} disabled={busy}>
        {busy ? 'Adding…' : '+ Add market'}
      </button>
    </div>
  );
}

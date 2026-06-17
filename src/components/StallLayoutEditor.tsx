import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { centroid, DEFAULT_CENTER, generateStallGrid, saveMarketStalls, type StallPos } from '@/lib/stalls';
import { StallSetList, type StallItem } from './StallSetList';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';

function stallIcon(label: string, disabled: boolean): L.DivIcon {
  const bg = disabled ? '#6b7280' : 'rgb(var(--brand-primary))';
  return L.divIcon({
    className: '',
    html: `<div style="opacity:${disabled ? 0.75 : 1};background:${bg};color:#fff;border:1px solid rgba(0,0,0,.4);border-radius:5px;font:600 11px sans-serif;display:flex;align-items:center;justify-content:center;width:30px;height:22px;box-shadow:0 1px 3px rgba(0,0,0,.45)">${label}</div>`,
    iconSize: [30, 22],
    iconAnchor: [15, 11],
  });
}

// Satellite stall manager: positions stalls on the imagery (drag), and adds /
// removes / disables them via the shared StallSetList. Saves the whole set per
// market (market_stalls is the source of truth).
export function StallLayoutEditor({
  marketId,
  initialStalls,
  onSaved,
  onCancel,
}: {
  marketId: string;
  initialStalls: StallPos[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const posRef = useRef<Record<string, [number, number]>>({});
  const [items, setItems] = useState<StallItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<'ok' | string | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const start = initialStalls.length ? initialStalls : generateStallGrid(DEFAULT_CENTER);
    posRef.current = Object.fromEntries(start.map((s) => [s.label, [s.lat, s.lng] as [number, number]]));
    const map = L.map(elRef.current, { scrollWheelZoom: false });
    L.tileLayer(ESRI, { maxZoom: 20, attribution: ATTRIB }).addTo(map);
    map.fitBounds(L.latLngBounds(start.map((s) => [s.lat, s.lng] as [number, number])), { padding: [40, 40], maxZoom: 20 });
    mapRef.current = map;
    setItems(start.map((s) => ({ label: s.label, disabled: !!s.disabled })));
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers to the item set; positions live in posRef.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const labels = new Set(items.map((i) => i.label));
    for (const label of Object.keys(markersRef.current)) {
      if (!labels.has(label)) {
        markersRef.current[label].remove();
        delete markersRef.current[label];
      }
    }
    for (const it of items) {
      const pos = posRef.current[it.label] ?? [map.getCenter().lat, map.getCenter().lng];
      posRef.current[it.label] = pos;
      const existing = markersRef.current[it.label];
      if (existing) {
        existing.setIcon(stallIcon(it.label, it.disabled));
      } else {
        const marker = L.marker(pos, { draggable: true, icon: stallIcon(it.label, it.disabled) }).addTo(map);
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          posRef.current[it.label] = [ll.lat, ll.lng];
          setDirty(true);
        });
        markersRef.current[it.label] = marker;
      }
    }
  }, [items]);

  function addStall(label: string): string | null {
    if (!label) return 'Enter a stall label.';
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) return 'That stall already exists.';
    const c = mapRef.current?.getCenter();
    if (c) posRef.current[label] = [c.lat, c.lng];
    setItems((cur) => [...cur, { label, disabled: false }]);
    setDirty(true);
    return null;
  }
  function removeStall(label: string) {
    setItems((cur) => cur.filter((i) => i.label !== label));
    delete posRef.current[label];
    setDirty(true);
  }
  function toggleDisable(label: string) {
    setItems((cur) => cur.map((i) => (i.label === label ? { ...i, disabled: !i.disabled } : i)));
    setDirty(true);
  }

  function resetGrid() {
    const center = centroid(Object.values(posRef.current).map(([lat, lng]) => ({ label: '', lat, lng }))) ?? DEFAULT_CENTER;
    const grid = generateStallGrid(center);
    for (const label of Object.keys(markersRef.current)) markersRef.current[label].remove();
    markersRef.current = {};
    posRef.current = Object.fromEntries(grid.map((s) => [s.label, [s.lat, s.lng] as [number, number]]));
    setItems(grid.map((s) => ({ label: s.label, disabled: false })));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const stalls: StallPos[] = items.map((it) => ({
      label: it.label,
      lat: posRef.current[it.label][0],
      lng: posRef.current[it.label][1],
      disabled: it.disabled,
    }));
    const err = await saveMarketStalls(marketId, stalls);
    setSaving(false);
    if (err) setMsg(err);
    else {
      setDirty(false);
      setMsg('ok');
      onSaved();
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
      <div>
        <p className="mb-2 text-sm text-brand-muted">
          Drag stalls to position them; add, remove, or disable them in the list. Save when done.
        </p>
        <div ref={elRef} className="h-[440px] w-full overflow-hidden rounded-2xl border border-brand-line" />
      </div>
      <StallSetList items={items} onAdd={addStall} onRemove={removeStall} onToggleDisable={toggleDisable} />
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save layout'}
        </button>
        <button className="btn-outline" onClick={resetGrid} disabled={saving}>
          Reset to grid
        </button>
        <button className="btn-ghost" onClick={onCancel} disabled={saving}>
          Done
        </button>
        {msg === 'ok' && <span className="text-sm text-status-ok">✓ Layout saved</span>}
        {msg && msg !== 'ok' && <span className="text-sm text-status-alert">{msg}</span>}
      </div>
    </div>
  );
}

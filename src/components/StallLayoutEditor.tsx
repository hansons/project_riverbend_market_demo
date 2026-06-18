import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categoryColor, centroid, DEFAULT_CENTER, generateStallGrid, saveMarketStalls, type StallPos } from '@/lib/stalls';
import { StallSetList, type StallItem } from './StallSetList';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';

function stallIcon(label: string, disabled: boolean, category: string | undefined, highlighted: boolean): L.DivIcon {
  const bg = disabled ? '#6b7280' : categoryColor(category) ?? 'rgb(var(--brand-primary))';
  const border = highlighted ? '2px solid rgb(var(--brand-accent))' : '1px solid rgba(0,0,0,.4)';
  const shadow = highlighted ? '0 0 0 2px rgba(255,255,255,.7),0 1px 5px rgba(0,0,0,.6)' : '0 1px 3px rgba(0,0,0,.45)';
  return L.divIcon({
    className: '',
    html: `<div style="opacity:${disabled ? 0.75 : 1};background:${bg};color:#fff;border:${border};border-radius:5px;font:600 11px sans-serif;display:flex;align-items:center;justify-content:center;width:30px;height:22px;box-shadow:${shadow}">${label}</div>`,
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
  center = DEFAULT_CENTER,
  onSaved,
  onCancel,
}: {
  marketId: string;
  initialStalls: StallPos[];
  center?: [number, number];
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
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const start = initialStalls.length ? initialStalls : generateStallGrid(center);
    posRef.current = Object.fromEntries(start.map((s) => [s.label, [s.lat, s.lng] as [number, number]]));
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomSnap: 0.5, zoomDelta: 0.5 });
    L.tileLayer(ESRI, { maxZoom: 20, attribution: ATTRIB }).addTo(map);
    map.fitBounds(L.latLngBounds(start.map((s) => [s.lat, s.lng] as [number, number])), { padding: [40, 40], maxZoom: 20 });
    mapRef.current = map;
    setItems(start.map((s) => ({ label: s.label, disabled: !!s.disabled, category: s.category ?? undefined })));
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
        existing.setIcon(stallIcon(it.label, it.disabled, it.category, selected === it.label));
      } else {
        const marker = L.marker(pos, {
          draggable: true,
          icon: stallIcon(it.label, it.disabled, it.category, selected === it.label),
        }).addTo(map);
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          posRef.current[it.label] = [ll.lat, ll.lng];
          setDirty(true);
        });
        marker.on('click', () => setSelected(it.label));
        markersRef.current[it.label] = marker;
      }
    }
  }, [items, selected]);

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
  function setCategory(label: string, category: string) {
    setItems((cur) => cur.map((i) => (i.label === label ? { ...i, category } : i)));
    setDirty(true);
  }

  function resetGrid() {
    const c = centroid(Object.values(posRef.current).map(([lat, lng]) => ({ label: '', lat, lng }))) ?? center;
    const grid = generateStallGrid(c);
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
      category: it.category,
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

  const selectedItem = items.find((i) => i.label === selected) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
      <div>
        <p className="mb-2 text-sm text-brand-muted">
          Drag stalls to position them; click one to configure it. Add, remove, or disable stalls in
          the list, then save.
        </p>
        <div ref={elRef} className="h-[440px] w-full overflow-hidden rounded-2xl border border-brand-line" />
      </div>
      <div>
        {selectedItem && (
          <div className="card mb-3 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-brand-ink">Stall {selectedItem.label}</p>
              <button onClick={() => setSelected(null)} className="text-xs text-brand-muted hover:underline">
                Close
              </button>
            </div>
            <label className="mt-2 block">
              <span className="field-label">Category</span>
              <input
                list="stall-categories"
                className="field-input mt-1"
                value={selectedItem.category ?? ''}
                onChange={(e) => setCategory(selectedItem.label, e.target.value)}
                placeholder="Category (optional)"
              />
            </label>
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-outline" onClick={() => toggleDisable(selectedItem.label)}>
                {selectedItem.disabled ? 'Enable stall' : 'Disable stall'}
              </button>
              <button
                className="text-sm font-semibold text-status-alert hover:underline"
                onClick={() => {
                  removeStall(selectedItem.label);
                  setSelected(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        <StallSetList items={items} onAdd={addStall} onRemove={removeStall} onToggleDisable={toggleDisable} onSetCategory={setCategory} />
      </div>
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

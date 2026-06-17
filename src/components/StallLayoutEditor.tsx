import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { centroid, DEFAULT_CENTER, generateStallGrid, saveMarketStalls, type StallPos } from '@/lib/stalls';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';

function stallIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="background:rgb(var(--brand-primary));color:#fff;border:1px solid rgb(var(--brand-primary-dark));border-radius:5px;font:600 11px sans-serif;display:flex;align-items:center;justify-content:center;width:30px;height:22px;box-shadow:0 1px 3px rgba(0,0,0,.45)">${label}</div>`,
    iconSize: [30, 22],
    iconAnchor: [15, 11],
  });
}

// Drag-to-place stall layout editor. Starts from the market's saved coordinates
// (or the default generated grid), lets staff drag each stall onto the imagery,
// and saves the positions per market.
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

    for (const s of start) {
      const m = L.marker([s.lat, s.lng], { draggable: true, icon: stallIcon(s.label) }).addTo(map);
      m.on('dragend', () => {
        const ll = m.getLatLng();
        posRef.current[s.label] = [ll.lat, ll.lng];
        setDirty(true);
        setMsg(null);
      });
      markersRef.current[s.label] = m;
    }
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetGrid() {
    const center = centroid(Object.values(posRef.current).map(([lat, lng]) => ({ label: '', lat, lng }))) ?? DEFAULT_CENTER;
    for (const s of generateStallGrid(center)) {
      const m = markersRef.current[s.label];
      if (m) {
        m.setLatLng([s.lat, s.lng]);
        posRef.current[s.label] = [s.lat, s.lng];
      }
    }
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    if (!marketId) {
      setMsg('Pick a market day first.');
      return;
    }
    setSaving(true);
    setMsg(null);
    const stalls: StallPos[] = Object.entries(posRef.current).map(([label, [lat, lng]]) => ({ label, lat, lng }));
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
    <div>
      <p className="mb-2 text-sm text-brand-muted">Drag each stall onto its real spot, then save. “Reset to grid” re-lays them in a neat block.</p>
      <div ref={elRef} className="h-[440px] w-full overflow-hidden rounded-2xl border border-brand-line" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
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

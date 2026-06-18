import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { navigate } from '@/lib/router';
import { aspectClass, categoryColor, DEFAULT_CENTER, generateStallGrid, type MapAspect, type StallPos } from '@/lib/stalls';
import type { MapOccupant } from './MarketMap';

// Satellite stall map over free Esri World Imagery tiles. Renders saved stall
// coordinates (from market_stalls) when provided, otherwise the default generated
// grid. Colors by occupancy state, or by category when colorBy='category'.

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';

// Stall footprint as a real ground size — geographic circles, so they scale with
// zoom (fill the view up close, shrink when zoomed out) and need no rotation to
// align with the market's real orientation. Radius sized to sit inside the
// generated grid spacing (~7 m × 4 m).
const STALL_RADIUS_M = 2.5; // ground radius in metres

function styleFor(occupied: boolean, highlighted: boolean, disabled: boolean, catColor: string | null, byCategory: boolean): L.PathOptions {
  if (highlighted) {
    return { color: 'rgb(var(--brand-accent))', weight: 2, fillColor: 'rgb(var(--brand-accent))', fillOpacity: 0.85 };
  }
  if (disabled) {
    return { color: '#6b7280', weight: 1, dashArray: '2 3', fillColor: '#6b7280', fillOpacity: 0.5 };
  }
  if (byCategory && catColor) {
    return { color: catColor, weight: 1, dashArray: occupied ? undefined : '2 3', fillColor: catColor, fillOpacity: occupied ? 0.72 : 0.5 };
  }
  if (occupied) {
    return { color: 'rgb(var(--brand-primary-dark))', weight: 1, fillColor: 'rgb(var(--brand-primary))', fillOpacity: 0.6 };
  }
  return { color: 'rgb(var(--brand-line))', weight: 1, dashArray: '3', fillColor: 'rgb(var(--brand-card))', fillOpacity: 0.3 };
}

export function MarketGeoMap({
  occupied = {},
  highlight,
  onCellClick,
  stalls,
  center = DEFAULT_CENTER,
  colorBy = 'status',
  aspect = 'landscape',
}: {
  occupied?: Record<string, MapOccupant>;
  highlight?: string | string[] | null;
  onCellClick?: (label: string) => void;
  stalls?: StallPos[];
  center?: [number, number];
  colorBy?: 'status' | 'category';
  aspect?: MapAspect;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const state = useRef({ occupied, highlight, onCellClick, stalls, center, colorBy });
  state.current = { occupied, highlight, onCellClick, stalls, center, colorBy };

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const positions = state.current.stalls?.length ? state.current.stalls : generateStallGrid(state.current.center);
    const map = L.map(elRef.current, { scrollWheelZoom: false, maxZoom: 22, zoomSnap: 0.5, zoomDelta: 0.5 });
    // Imagery is native to ~z19; allow zooming to 22 (Leaflet upscales the tiles)
    // so the stalls can grow to fill the view when you zoom right in. Half-step
    // zoom (zoomSnap/zoomDelta) lets you stop before the imagery turns blurry.
    L.tileLayer(ESRI, { maxZoom: 22, maxNativeZoom: 19, attribution: ATTRIB }).addTo(map);
    map.fitBounds(L.latLngBounds(positions.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 20 });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const { occupied: occMap, highlight: hi, stalls: st, center: ctr, colorBy: cb } = state.current;
    const positions = st?.length ? st : generateStallGrid(ctr);
    const hiSet = new Set(Array.isArray(hi) ? hi : hi ? [hi] : []);
    const byCategory = cb === 'category';
    for (const p of positions) {
      const occ = occMap[p.label];
      const disabled = !!p.disabled;
      const circle = L.circle([p.lat, p.lng], {
        radius: STALL_RADIUS_M,
        ...styleFor(Boolean(occ), hiSet.has(p.label), disabled, categoryColor(p.category), byCategory),
      });
      circle.bindTooltip(
        `${p.label}${p.category ? ` · ${p.category}` : ''} — ${disabled ? 'out of service' : occ ? occ.name : 'available'}`,
        { direction: 'top' },
      );
      circle.on('click', () => {
        if (disabled) return; // disabled stalls aren't assignable
        const { onCellClick: cbk, occupied: o } = state.current;
        if (cbk) cbk(p.label);
        else if (o[p.label]?.slug) navigate(`/vendor/${o[p.label]!.slug}`);
      });
      layer.addLayer(circle);

      // Always-visible stall number, centered on the stall (non-interactive).
      layer.addLayer(
        L.marker([p.lat, p.lng], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: '',
            html: `<div style="font:700 11px sans-serif;color:#fff;text-align:center;white-space:nowrap;text-shadow:0 0 2px #000,0 0 3px #000;opacity:${disabled ? '0.6' : '1'}">${p.label}</div>`,
            iconSize: [28, 14],
            iconAnchor: [14, 7],
          }),
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupied, highlight, stalls, center, colorBy]);

  const byCategory = colorBy === 'category';
  const cats = byCategory && stalls ? [...new Set(stalls.map((s) => (s.category ?? '').trim()).filter(Boolean))].sort() : [];

  return (
    <div>
      <div ref={elRef} className={`${aspectClass(aspect)} overflow-hidden rounded-2xl border border-brand-line`} />
      <div className="mt-2 flex flex-wrap gap-3 px-1 text-[11px] text-brand-muted">
        {byCategory ? (
          <>
            {cats.map((c) => (
              <Swatch key={c} fill={categoryColor(c) ?? '#9ca3af'} border={categoryColor(c) ?? '#9ca3af'} label={c} />
            ))}
            <Swatch fill="#6b7280" border="#6b7280" dashed label="Disabled" />
            <span className="text-brand-muted/80">· dashed = open, solid = assigned</span>
          </>
        ) : (
          <>
            <Swatch fill="rgb(var(--brand-card))" border="rgb(var(--brand-line))" dashed label="Available" />
            <Swatch fill="rgb(var(--brand-primary) / 0.6)" border="rgb(var(--brand-primary-dark))" label="Filled" />
            <Swatch fill="rgb(var(--brand-accent) / 0.85)" border="rgb(var(--brand-accent))" label="Highlighted" />
            <Swatch fill="#6b7280" border="#6b7280" dashed label="Disabled" />
          </>
        )}
      </div>
    </div>
  );
}

function Swatch({ fill, border, label, dashed }: { fill: string; border: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-4 rounded-sm" style={{ background: fill, border: `1px ${dashed ? 'dashed' : 'solid'} ${border}` }} />
      {label}
    </span>
  );
}

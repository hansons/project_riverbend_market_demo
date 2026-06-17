import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { navigate } from '@/lib/router';
import type { MapOccupant } from './MarketMap';

// Satellite stall map: the same A–D × 12 stall scheme as MarketMap, but plotted on
// a Leaflet map over free Esri World Imagery tiles. Stall positions are generated
// as a grid around a market center (display-first; a drag-to-place editor and
// per-market coordinates come later). Same props as MarketMap so it's a drop-in.

// Corvallis Farmers' Market (riverfront) — the demo's example location.
const DEFAULT_CENTER: [number, number] = [44.5663, -123.2566];
const ROWS = ['A', 'B', 'C', 'D'];
const COLS = 12;

// Degree offsets at ~44.57°N (≈111,320 m/° lat, ≈79,300 m/° lng).
const ROW_D = 7 / 111320; // ~7 m row spacing
const COL_D = 4 / 79300; // ~4 m column spacing
const H = 1.25 / 111320; // half stall height (~2.5 m)
const W = 1.5 / 79300; // half stall width (~3 m)

function styleFor(occupied: boolean, highlighted: boolean): L.PathOptions {
  if (highlighted) {
    return { color: 'rgb(var(--brand-accent))', weight: 2, fillColor: 'rgb(var(--brand-accent))', fillOpacity: 0.85 };
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
  center = DEFAULT_CENTER,
}: {
  occupied?: Record<string, MapOccupant>;
  highlight?: string | string[] | null;
  onCellClick?: (label: string) => void;
  center?: [number, number];
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Latest values for the click/redraw closures, so we never go stale.
  const state = useRef({ occupied, highlight, onCellClick });
  state.current = { occupied, highlight, onCellClick };

  // Create the map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center, zoom: 19, scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: 'Tiles © Esri, Maxar, Earthstar Geographics',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw / recolor stalls whenever occupancy or highlight changes.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const hiSet = new Set(Array.isArray(highlight) ? highlight : highlight ? [highlight] : []);
    ROWS.forEach((r, ri) => {
      for (let ci = 0; ci < COLS; ci++) {
        const label = `${r}${ci + 1}`;
        const lat = center[0] - (ri - 1.5) * ROW_D;
        const lng = center[1] + (ci - 5.5) * COL_D;
        const occ = state.current.occupied[label];
        const rect = L.rectangle(
          [
            [lat - H, lng - W],
            [lat + H, lng + W],
          ],
          styleFor(Boolean(occ), hiSet.has(label)),
        );
        rect.bindTooltip(occ ? `${label} — ${occ.name}` : `${label} — available`, { direction: 'top' });
        rect.on('click', () => {
          const { onCellClick: cb, occupied: occMap } = state.current;
          if (cb) cb(label);
          else if (occMap[label]?.slug) navigate(`/vendor/${occMap[label]!.slug}`);
        });
        layer.addLayer(rect);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupied, highlight, center]);

  return (
    <div>
      <div ref={elRef} className="h-[440px] w-full overflow-hidden rounded-2xl border border-brand-line" />
      <div className="mt-2 flex flex-wrap gap-3 px-1 text-[11px] text-brand-muted">
        <Swatch fill="rgb(var(--brand-card))" border="rgb(var(--brand-line))" dashed label="Available" />
        <Swatch fill="rgb(var(--brand-primary) / 0.6)" border="rgb(var(--brand-primary-dark))" label="Filled" />
        <Swatch fill="rgb(var(--brand-accent) / 0.85)" border="rgb(var(--brand-accent))" label="Highlighted" />
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

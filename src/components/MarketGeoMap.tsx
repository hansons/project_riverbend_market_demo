import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { navigate } from '@/lib/router';
import { DEFAULT_CENTER, generateStallGrid, type StallPos } from '@/lib/stalls';
import type { MapOccupant } from './MarketMap';

// Satellite stall map over free Esri World Imagery tiles. Renders saved stall
// coordinates (from market_stalls) when provided, otherwise the default generated
// grid. Same occupancy coloring + click behavior as MarketMap, so it's a drop-in.

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Tiles © Esri, Maxar, Earthstar Geographics';

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
  stalls,
  center = DEFAULT_CENTER,
}: {
  occupied?: Record<string, MapOccupant>;
  highlight?: string | string[] | null;
  onCellClick?: (label: string) => void;
  stalls?: StallPos[];
  center?: [number, number];
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const state = useRef({ occupied, highlight, onCellClick, stalls, center });
  state.current = { occupied, highlight, onCellClick, stalls, center };

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const positions = state.current.stalls?.length ? state.current.stalls : generateStallGrid(state.current.center);
    const map = L.map(elRef.current, { scrollWheelZoom: false });
    L.tileLayer(ESRI, { maxZoom: 20, attribution: ATTRIB }).addTo(map);
    map.fitBounds(L.latLngBounds(positions.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [40, 40],
      maxZoom: 20,
    });
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
    const { occupied: occMap, highlight: hi, stalls: st, center: ctr } = state.current;
    const positions = st?.length ? st : generateStallGrid(ctr);
    const hiSet = new Set(Array.isArray(hi) ? hi : hi ? [hi] : []);
    for (const p of positions) {
      const occ = occMap[p.label];
      const rect = L.rectangle(
        [
          [p.lat - H, p.lng - W],
          [p.lat + H, p.lng + W],
        ],
        styleFor(Boolean(occ), hiSet.has(p.label)),
      );
      rect.bindTooltip(occ ? `${p.label} — ${occ.name}` : `${p.label} — available`, { direction: 'top' });
      rect.on('click', () => {
        const { onCellClick: cb, occupied: o } = state.current;
        if (cb) cb(p.label);
        else if (o[p.label]?.slug) navigate(`/vendor/${o[p.label]!.slug}`);
      });
      layer.addLayer(rect);

      // Always-visible stall number, centered on the stall (non-interactive so
      // clicks fall through to the rectangle; white + shadow stays legible on imagery).
      layer.addLayer(
        L.marker([p.lat, p.lng], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: '',
            html: `<div style="font:700 11px sans-serif;color:#fff;text-align:center;white-space:nowrap;text-shadow:0 0 2px #000,0 0 3px #000">${p.label}</div>`,
            iconSize: [28, 14],
            iconAnchor: [14, 7],
          }),
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupied, highlight, stalls, center]);

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

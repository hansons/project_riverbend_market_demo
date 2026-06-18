import { supabase } from '@/lib/supabase';

// Geographic stall coordinates for the satellite stall map. The grid generator is
// the single source for the default A–D×12 layout (used as the fallback display and
// the editor's starting point); persisted positions live in market_stalls (0022).

export const DEFAULT_CENTER: [number, number] = [44.5663, -123.2566]; // Corvallis riverfront

const ROWS = ['A', 'B', 'C', 'D'];
const COLS = 12;
const ROW_D = 7 / 111320; // ~7 m row spacing (deg lat at ~44.57°N)
const COL_D = 4 / 79300; // ~4 m column spacing (deg lng)

export interface StallPos {
  label: string;
  lat: number;
  lng: number;
  disabled?: boolean;
  category?: string | null;
}

/** The default A–D × 12 stall grid around a center (matches the 0022 seed). */
export function generateStallGrid(center: [number, number] = DEFAULT_CENTER): StallPos[] {
  const out: StallPos[] = [];
  ROWS.forEach((r, ri) => {
    for (let ci = 0; ci < COLS; ci++) {
      out.push({
        label: `${r}${ci + 1}`,
        lat: center[0] - (ri - 1.5) * ROW_D,
        lng: center[1] + (ci - 5.5) * COL_D,
      });
    }
  });
  return out;
}

/** Coordinates for a stall: keep existing if present, else the generated-grid slot
 *  for an A1–D12 label, else the market center (to be repositioned on satellite). */
export function coordForLabel(label: string, existing?: StallPos, center: [number, number] = DEFAULT_CENTER): [number, number] {
  if (existing) return [existing.lat, existing.lng];
  const g = generateStallGrid(center).find((s) => s.label === label);
  return g ? [g.lat, g.lng] : center;
}

// Deterministic color per category (so the same category — incl. custom ones —
// always gets the same swatch). Returns null for no category.
const CATEGORY_PALETTE = [
  '#e11d48', '#f59e0b', '#16a34a', '#0ea5e9', '#8b5cf6', '#0d9488',
  '#ea580c', '#4f46e5', '#db2777', '#65a30d', '#06b6d4', '#c026d3',
];
export function categoryColor(category?: string | null): string | null {
  const s = (category ?? '').trim().toLowerCase();
  if (!s) return null;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

export function centroid(stalls: StallPos[]): [number, number] | null {
  if (!stalls.length) return null;
  const lat = stalls.reduce((s, p) => s + p.lat, 0) / stalls.length;
  const lng = stalls.reduce((s, p) => s + p.lng, 0) / stalls.length;
  return [lat, lng];
}

// ── Owner-set per-market map settings: default satellite center + shape ──
export type MapAspect = 'landscape' | 'portrait' | 'square';
export const MAP_ASPECTS: MapAspect[] = ['landscape', 'portrait', 'square'];

export interface MarketMapSettings {
  center: [number, number] | null;
  zoom: number | null;
  aspect: MapAspect;
  isActive: boolean;
}

export const DEFAULT_MAP_SETTINGS: MarketMapSettings = { center: null, zoom: null, aspect: 'landscape', isActive: false };

const toAspect = (v: string | null | undefined): MapAspect => (v === 'portrait' || v === 'square' ? v : 'landscape');

/** Tailwind container classes that frame a satellite map to the given shape. */
export function aspectClass(aspect: MapAspect): string {
  if (aspect === 'portrait') return 'mx-auto h-[560px] w-full max-w-[440px]';
  if (aspect === 'square') return 'mx-auto h-[440px] w-full max-w-[440px]';
  return 'h-[420px] w-full';
}

/** A market's owner-set map settings (center may be null → callers fall back to DEFAULT_CENTER). */
export async function fetchMarketMap(marketId: string): Promise<MarketMapSettings> {
  const { data } = await supabase
    .from('market_settings')
    .select('center_lat, center_lng, zoom, aspect, is_active')
    .eq('market_id', marketId)
    .maybeSingle();
  const r = data as {
    center_lat: number | null;
    center_lng: number | null;
    zoom: number | null;
    aspect: string | null;
    is_active: boolean | null;
  } | null;
  return {
    center: r && r.center_lat != null && r.center_lng != null ? [r.center_lat, r.center_lng] : null,
    zoom: r?.zoom ?? null,
    aspect: toAspect(r?.aspect),
    isActive: r?.is_active ?? false,
  };
}

/** Map settings for every market that has them, keyed by market id. */
export async function fetchAllMarketMaps(): Promise<Record<string, MarketMapSettings>> {
  const { data } = await supabase.from('market_settings').select('market_id, center_lat, center_lng, zoom, aspect, is_active');
  const rows =
    (data as {
      market_id: string;
      center_lat: number | null;
      center_lng: number | null;
      zoom: number | null;
      aspect: string | null;
      is_active: boolean | null;
    }[]) ?? [];
  const out: Record<string, MarketMapSettings> = {};
  for (const r of rows) {
    out[r.market_id] = {
      center: r.center_lat != null && r.center_lng != null ? [r.center_lat, r.center_lng] : null,
      zoom: r.zoom ?? null,
      aspect: toAspect(r.aspect),
      isActive: r.is_active ?? false,
    };
  }
  return out;
}

/** Make `marketId` the single active/front-page market (owner only — RLS enforces). */
export async function setActiveMarket(marketId: string): Promise<string | null> {
  const clr = await supabase.from('market_settings').update({ is_active: false }).neq('market_id', marketId);
  if (clr.error) return clr.error.message;
  const { error } = await supabase
    .from('market_settings')
    .upsert({ market_id: marketId, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'market_id' });
  return error?.message ?? null;
}

/** Set a market's default map center + zoom + shape (owner only — RLS enforces). */
export async function saveMarketMap(
  marketId: string,
  center: [number, number],
  zoom: number,
  aspect: MapAspect,
): Promise<string | null> {
  const { error } = await supabase.from('market_settings').upsert(
    { market_id: marketId, center_lat: center[0], center_lng: center[1], zoom, aspect, updated_at: new Date().toISOString() },
    { onConflict: 'market_id' },
  );
  return error?.message ?? null;
}

/** Saved stall coordinates for a market (empty if the layout hasn't been placed). */
export async function fetchMarketStalls(marketId: string): Promise<StallPos[]> {
  const { data } = await supabase.from('market_stalls').select('label, lat, lng, disabled, category').eq('market_id', marketId);
  return (data as StallPos[]) ?? [];
}

/** Replace a market's saved layout, including the full stall set (admin only — RLS enforces). */
export async function saveMarketStalls(marketId: string, stalls: StallPos[]): Promise<string | null> {
  const del = await supabase.from('market_stalls').delete().eq('market_id', marketId);
  if (del.error) return del.error.message;
  if (!stalls.length) return null;
  const rows = stalls.map((s) => ({
    market_id: marketId,
    label: s.label,
    lat: s.lat,
    lng: s.lng,
    disabled: !!s.disabled,
    category: s.category?.trim() || null,
  }));
  const { error } = await supabase.from('market_stalls').insert(rows);
  return error?.message ?? null;
}

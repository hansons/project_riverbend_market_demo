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

export function centroid(stalls: StallPos[]): [number, number] | null {
  if (!stalls.length) return null;
  const lat = stalls.reduce((s, p) => s + p.lat, 0) / stalls.length;
  const lng = stalls.reduce((s, p) => s + p.lng, 0) / stalls.length;
  return [lat, lng];
}

/** Saved stall coordinates for a market (empty if the layout hasn't been placed). */
export async function fetchMarketStalls(marketId: string): Promise<StallPos[]> {
  const { data } = await supabase.from('market_stalls').select('label, lat, lng, disabled').eq('market_id', marketId);
  return (data as StallPos[]) ?? [];
}

/** Replace a market's saved layout, including the full stall set (admin only — RLS enforces). */
export async function saveMarketStalls(marketId: string, stalls: StallPos[]): Promise<string | null> {
  const del = await supabase.from('market_stalls').delete().eq('market_id', marketId);
  if (del.error) return del.error.message;
  if (!stalls.length) return null;
  const rows = stalls.map((s) => ({ market_id: marketId, label: s.label, lat: s.lat, lng: s.lng, disabled: !!s.disabled }));
  const { error } = await supabase.from('market_stalls').insert(rows);
  return error?.message ?? null;
}

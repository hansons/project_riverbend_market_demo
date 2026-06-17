import { supabase } from '@/lib/supabase';
import type { Market } from '@/lib/types';

/** Restore the demo to its seeded state (server-side; superadmin only via RLS). */
export async function resetDemo(): Promise<string | null> {
  const { error } = await supabase.rpc('reset_demo');
  return error?.message ?? null;
}

// ── Owner-managed markets (superadmin only via RLS) ──
type MarketFields = Pick<Market, 'name' | 'day_of_week' | 'season' | 'hours' | 'location' | 'blurb' | 'sort'>;

export async function updateMarket(id: string, patch: Partial<MarketFields>): Promise<string | null> {
  const { error } = await supabase.from('markets').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function createMarket(input: MarketFields): Promise<string | null> {
  const { error } = await supabase.from('markets').insert(input);
  return error?.message ?? null;
}

/** Delete a market. Its dates/assignments cascade (FK); the plain-uuid map tables
 *  (no FK) are cleaned up explicitly. */
export async function deleteMarket(id: string): Promise<string | null> {
  await supabase.from('market_stalls').delete().eq('market_id', id);
  await supabase.from('market_settings').delete().eq('market_id', id);
  const { error } = await supabase.from('markets').delete().eq('id', id);
  return error?.message ?? null;
}

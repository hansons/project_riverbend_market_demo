import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Tenant } from '@/lib/types';

// Riverbend brand, also used as the offline fallback so the app is themed even
// before Supabase is connected. Mirrors the active tenant row in seed.sql.
export const FALLBACK_TENANT: Tenant = {
  id: 'fallback',
  slug: 'riverbend',
  name: 'Riverbend Farmers Market',
  tagline: 'Grown nearby. Picked this morning.',
  region: 'Willamette Valley, OR',
  is_active: true,
  brand: {
    primary: '47 93 58',
    'primary-dark': '36 74 46',
    accent: '224 165 38',
    berry: '181 83 42',
    ink: '42 38 32',
    paper: '251 247 239',
    card: '255 255 255',
    muted: '107 99 84',
    line: '231 222 201',
  },
};

export async function fetchActiveTenant(): Promise<Tenant> {
  if (!isSupabaseConfigured) return FALLBACK_TENANT;
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return (data as Tenant) ?? FALLBACK_TENANT;
}

export async function fetchTenants(): Promise<Tenant[]> {
  if (!isSupabaseConfigured) return [FALLBACK_TENANT];
  const { data } = await supabase.from('tenants').select('*').order('created_at');
  return (data as Tenant[] | null)?.length ? (data as Tenant[]) : [FALLBACK_TENANT];
}

/** Promote one tenant to active (super-admin only; enforced by RLS). */
export async function setActiveTenant(id: string): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase not configured';
  const off = await supabase.from('tenants').update({ is_active: false }).neq('id', id);
  if (off.error) return off.error.message;
  const on = await supabase.from('tenants').update({ is_active: true }).eq('id', id);
  return on.error?.message ?? null;
}

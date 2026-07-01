import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toWebp } from '@/lib/image';
import type { Brand, Tenant, Theme } from '@/lib/types';

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
  logo_url: null,
  favicon_url: null,
  banner_url: null,
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

/** Brand theme presets the admin/owner can apply. */
export async function fetchThemes(): Promise<Theme[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('themes').select('*').order('sort');
  return (data as Theme[]) ?? [];
}

/** Persist a theme's palette onto the active market (admin+; enforced by RLS). */
export async function applyThemeToActive(brand: Partial<Brand>): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase not configured';
  const { error } = await supabase.from('tenants').update({ brand }).eq('is_active', true);
  return error?.message ?? null;
}

/** Upload a market logo/favicon/banner (admin) → WebP in the shared bucket; returns its public URL. */
export async function uploadMarketAsset(
  file: File,
  kind: 'logo' | 'favicon' | 'banner',
): Promise<{ url: string } | { error: string }> {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured' };
  const maxDim = kind === 'favicon' ? 96 : kind === 'banner' ? 1600 : 480;
  const blob = await toWebp(file, maxDim, kind === 'banner' ? 0.82 : 0.9);
  const path = `market/${kind}-${Date.now()}.webp`;
  const up = await supabase.storage.from('vendor-photos').upload(path, blob, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (up.error) return { error: up.error.message };
  return { url: supabase.storage.from('vendor-photos').getPublicUrl(path).data.publicUrl };
}

/** Upload a floor plan image (PNG/JPG/WebP) → WebP in the shared bucket; returns public URL.
 *  Floor plans are kept at full resolution (up to 3000px) so stall pixel coordinates remain accurate. */
export async function uploadFloorPlan(file: File): Promise<{ url: string } | { error: string }> {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured' };
  const blob = await toWebp(file, 3000, 0.92);
  const path = `market/floor-plan-${Date.now()}.webp`;
  const up = await supabase.storage.from('vendor-photos').upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (up.error) return { error: up.error.message };
  return { url: supabase.storage.from('vendor-photos').getPublicUrl(path).data.publicUrl };
}

/** Set the active market's logo and/or favicon URL (admin+; enforced by RLS). */
export async function updateMarketBranding(patch: {
  logo_url?: string | null;
  favicon_url?: string | null;
  banner_url?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase not configured';
  const { error } = await supabase.from('tenants').update(patch).eq('is_active', true);
  return error?.message ?? null;
}

/** Promote one tenant to active (super-admin only; enforced by RLS). */
export async function setActiveTenant(id: string): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase not configured';
  const off = await supabase.from('tenants').update({ is_active: false }).neq('id', id);
  if (off.error) return off.error.message;
  const on = await supabase.from('tenants').update({ is_active: true }).eq('id', id);
  return on.error?.message ?? null;
}

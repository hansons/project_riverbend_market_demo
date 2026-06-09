import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Announcement,
  AnnouncementAudience,
  Market,
  SeasonItem,
  Vendor,
  VendorProduct,
} from '@/lib/types';

// Read helpers for the public/shopper surface. Everything here is RLS-public,
// so these work with the anon client (no login). When Supabase isn't connected
// yet they return empty and the UI shows a setup notice.

export async function fetchMarkets(): Promise<Market[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('markets').select('*').order('sort');
  return (data as Market[]) ?? [];
}

export async function fetchVendors(): Promise<Vendor[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('name');
  return (data as Vendor[]) ?? [];
}

export async function fetchVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.from('vendors').select('*').eq('slug', slug).maybeSingle();
  return (data as Vendor) ?? null;
}

export async function fetchVendorProducts(vendorId: string): Promise<VendorProduct[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('sort');
  return (data as VendorProduct[]) ?? [];
}

export async function fetchSeasonality(): Promise<SeasonItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('seasonality').select('*').order('sort');
  return (data as SeasonItem[]) ?? [];
}

/** Active announcements for the given audiences (public site passes public+all). */
export async function fetchActiveAnnouncements(
  audiences: AnnouncementAudience[],
): Promise<Announcement[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .in('audience', audiences)
    .order('created_at', { ascending: false });
  return (data as Announcement[]) ?? [];
}

export interface ApplicationInput {
  name: string;
  category: string;
  town: string;
  email: string;
  tagline: string;
  story: string;
  practices: string[];
  market_days: string[];
}

/** Public "Sell with us" submission → a pending vendor that lands in the admin queue. */
export async function submitApplication(input: ApplicationInput): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase not configured';
  const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${base || 'vendor'}-${Date.now().toString(36)}`;
  const { error } = await supabase.from('vendors').insert({
    slug,
    name: input.name,
    category: input.category,
    tagline: input.tagline || null,
    story: input.story || null,
    town: input.town || null,
    email: input.email || null,
    practices: input.practices,
    market_days: input.market_days,
    status: 'pending',
  });
  return error?.message ?? null;
}

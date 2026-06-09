import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Market, SeasonItem, Vendor, VendorProduct } from '@/lib/types';

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

import { supabase } from '@/lib/supabase';
import { toWebp } from '@/lib/image';
import type {
  Fee,
  MarketDate,
  Message,
  MessageSender,
  ProductCategory,
  ScheduleStatus,
  Vendor,
  VendorOffering,
  VendorScheduleRow,
} from '@/lib/types';

// All reads/writes here run as the signed-in vendor. Row-Level Security (0003)
// guarantees they only ever touch rows for their own vendor_id — the app code
// doesn't filter for security, it just asks and the database scopes the answer.

export async function fetchVendorById(id: string): Promise<Vendor | null> {
  const { data } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle();
  return (data as Vendor) ?? null;
}

export async function updateVendor(
  id: string,
  patch: Partial<
    Pick<Vendor, 'tagline' | 'story' | 'town' | 'category' | 'practices' | 'market_days' | 'image_url' | 'logo_url'>
  >,
): Promise<string | null> {
  const { error } = await supabase.from('vendors').update(patch).eq('id', id);
  return error?.message ?? null;
}

/** Rescale + WebP-convert in the browser, upload to Storage, return a public URL. */
export async function uploadVendorImage(
  vendorId: string,
  kind: 'logo' | 'cover',
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const blob = await toWebp(file, kind === 'logo' ? 400 : 1200);
    const path = `${vendorId}/${kind}.webp`;
    const { error } = await supabase.storage
      .from('vendor-photos')
      .upload(path, blob, { upsert: true, contentType: 'image/webp' });
    if (error) return { url: null, error: error.message };
    const { data } = supabase.storage.from('vendor-photos').getPublicUrl(path);
    // Cache-bust: the path is reused on re-upload, so vary the query string.
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

// ── Weekly offerings ──
export async function fetchOfferings(vendorId: string): Promise<VendorOffering[]> {
  const { data } = await supabase
    .from('vendor_offerings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('week_of', { ascending: false });
  return (data as VendorOffering[]) ?? [];
}

export async function addOffering(
  vendorId: string,
  o: { week_of: string; headline: string; items: string[]; note: string | null },
): Promise<string | null> {
  const { error } = await supabase.from('vendor_offerings').insert({ vendor_id: vendorId, ...o });
  return error?.message ?? null;
}

// ── Stand list (products) — bulk replace from a CSV import ──
export interface ProductInput {
  name: string;
  category: string | null;
  unit: string | null;
  price_cents: number | null;
  in_season: boolean;
  season_months: number[];
  sort: number;
}

export async function replaceProducts(vendorId: string, products: ProductInput[]): Promise<string | null> {
  const del = await supabase.from('vendor_products').delete().eq('vendor_id', vendorId);
  if (del.error) return del.error.message;
  if (products.length === 0) return null;
  const rows = products.map((p) => ({ vendor_id: vendorId, ...p }));
  const { error } = await supabase.from('vendor_products').insert(rows);
  return error?.message ?? null;
}

export async function addProduct(vendorId: string, p: ProductInput): Promise<string | null> {
  const { error } = await supabase.from('vendor_products').insert({ vendor_id: vendorId, ...p });
  return error?.message ?? null;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<string | null> {
  const { error } = await supabase.from('vendor_products').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteProduct(id: string): Promise<string | null> {
  const { error } = await supabase.from('vendor_products').delete().eq('id', id);
  return error?.message ?? null;
}

// ── Product categories (active list + this vendor's own pending requests) ──
export async function fetchProductCategories(): Promise<ProductCategory[]> {
  const { data } = await supabase.from('product_categories').select('*').order('name');
  return (data as ProductCategory[]) ?? [];
}

export async function requestCategory(vendorId: string, name: string): Promise<string | null> {
  const { error } = await supabase
    .from('product_categories')
    .insert({ name: name.trim(), status: 'pending', requested_by: vendorId });
  return error?.message ?? null;
}

// ── Weekly offerings — bulk append from a CSV import ──
export interface OfferingInput {
  week_of: string;
  headline: string | null;
  items: string[];
  note: string | null;
}

export async function addOfferingsBulk(vendorId: string, offerings: OfferingInput[]): Promise<string | null> {
  if (offerings.length === 0) return null;
  const rows = offerings.map((o) => ({ vendor_id: vendorId, ...o }));
  const { error } = await supabase.from('vendor_offerings').insert(rows);
  return error?.message ?? null;
}

export async function updateOffering(id: string, patch: OfferingInput): Promise<string | null> {
  const { error } = await supabase.from('vendor_offerings').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteOffering(id: string): Promise<string | null> {
  const { error } = await supabase.from('vendor_offerings').delete().eq('id', id);
  return error?.message ?? null;
}

// ── Schedule ──
export async function fetchMarketDates(): Promise<MarketDate[]> {
  const { data } = await supabase
    .from('market_dates')
    .select('*, markets(name, day_of_week)')
    .order('date');
  return (data as MarketDate[]) ?? [];
}

export async function fetchMySchedule(vendorId: string): Promise<VendorScheduleRow[]> {
  const { data } = await supabase.from('vendor_schedule').select('*').eq('vendor_id', vendorId);
  return (data as VendorScheduleRow[]) ?? [];
}

export async function setScheduleStatus(
  vendorId: string,
  marketDateId: string,
  status: ScheduleStatus,
): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_schedule')
    .upsert(
      { vendor_id: vendorId, market_date_id: marketDateId, status },
      { onConflict: 'vendor_id,market_date_id' },
    );
  return error?.message ?? null;
}

// ── Fees ──
export async function fetchFees(vendorId: string): Promise<Fee[]> {
  const { data } = await supabase
    .from('fees')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return (data as Fee[]) ?? [];
}

// ── Messages ──
export async function fetchMessages(vendorId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at');
  return (data as Message[]) ?? [];
}

export async function sendMessage(
  vendorId: string,
  sender: MessageSender,
  authorName: string,
  body: string,
): Promise<string | null> {
  const { error } = await supabase
    .from('messages')
    .insert({ vendor_id: vendorId, sender, author_name: authorName, body });
  return error?.message ?? null;
}

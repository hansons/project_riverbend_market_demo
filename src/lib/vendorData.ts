import { supabase } from '@/lib/supabase';
import type {
  Fee,
  MarketDate,
  Message,
  MessageSender,
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
  patch: Partial<Pick<Vendor, 'tagline' | 'story' | 'town' | 'category' | 'practices' | 'market_days'>>,
): Promise<string | null> {
  const { error } = await supabase.from('vendors').update(patch).eq('id', id);
  return error?.message ?? null;
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

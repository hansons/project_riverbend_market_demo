import { supabase } from '@/lib/supabase';
import type {
  Announcement,
  AnnouncementAudience,
  Fee,
  MarketEvent,
  ProductCategory,
  ScheduleStatus,
  ScheduleWithVendor,
  Vendor,
  VendorStatus,
} from '@/lib/types';

// Admin reads/writes. RLS (is_admin) lets these see and touch every vendor's
// rows — the same queries a vendor runs return only their own.

// ── Vendors / applications ──
export async function fetchAllVendors(): Promise<Vendor[]> {
  const { data } = await supabase.from('vendors').select('*').order('name');
  return (data as Vendor[]) ?? [];
}

export async function setVendorStatus(id: string, status: VendorStatus): Promise<string | null> {
  const { error } = await supabase.from('vendors').update({ status }).eq('id', id);
  return error?.message ?? null;
}

export async function setVendorFeatured(id: string, featured: boolean): Promise<string | null> {
  const { error } = await supabase.from('vendors').update({ featured }).eq('id', id);
  return error?.message ?? null;
}

// ── Stall assignment ──
export async function fetchScheduleForDate(marketDateId: string): Promise<ScheduleWithVendor[]> {
  const { data } = await supabase
    .from('vendor_schedule')
    .select('id, vendor_id, market_date_id, status, stall, vendors(name, category, status)')
    .eq('market_date_id', marketDateId);
  // PostgREST types the embedded vendor as an array; the FK makes it one object.
  return (data as unknown as ScheduleWithVendor[]) ?? [];
}

export async function setStall(scheduleId: string, stall: string): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_schedule')
    .update({ stall: stall.trim() || null })
    .eq('id', scheduleId);
  return error?.message ?? null;
}

// ── Announcements ──
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return (data as Announcement[]) ?? [];
}

export async function createAnnouncement(a: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
}): Promise<string | null> {
  const { error } = await supabase.from('announcements').insert(a);
  return error?.message ?? null;
}

export async function setAnnouncementActive(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from('announcements').update({ active }).eq('id', id);
  return error?.message ?? null;
}

// ── Product categories ──
export async function fetchAllCategories(): Promise<ProductCategory[]> {
  const { data } = await supabase.from('product_categories').select('*').order('name');
  return (data as ProductCategory[]) ?? [];
}

export async function approveCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from('product_categories').update({ status: 'active' }).eq('id', id);
  return error?.message ?? null;
}

export async function deleteCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from('product_categories').delete().eq('id', id);
  return error?.message ?? null;
}

// ── Events ──
export interface EventInput {
  title: string;
  description: string | null;
  date: string;
  market_id: string | null;
  category: string | null;
  featured: boolean;
}

export async function fetchAllEvents(): Promise<MarketEvent[]> {
  const { data } = await supabase.from('events').select('*, markets(name, day_of_week)').order('date');
  return (data as unknown as MarketEvent[]) ?? [];
}

export async function createEvent(e: EventInput): Promise<string | null> {
  const { error } = await supabase.from('events').insert(e);
  return error?.message ?? null;
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<string | null> {
  const { error } = await supabase.from('events').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteEvent(id: string): Promise<string | null> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  return error?.message ?? null;
}

// ── Reports ──
export async function fetchAllFees(): Promise<Fee[]> {
  const { data } = await supabase.from('fees').select('*');
  return (data as Fee[]) ?? [];
}

export interface ScheduleCount {
  status: ScheduleStatus;
  count: number;
}

export async function fetchScheduleCounts(marketDateId: string): Promise<Record<ScheduleStatus, number>> {
  const { data } = await supabase
    .from('vendor_schedule')
    .select('status')
    .eq('market_date_id', marketDateId);
  const counts: Record<ScheduleStatus, number> = { confirmed: 0, declined: 0, pending: 0 };
  for (const row of (data as { status: ScheduleStatus }[]) ?? []) counts[row.status]++;
  return counts;
}

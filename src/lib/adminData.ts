import { supabase } from '@/lib/supabase';
import type {
  Announcement,
  AnnouncementAudience,
  FeaturedScheduleRow,
  Fee,
  MarketEvent,
  Profile,
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

// ── Administrators (read-only list; provisioning not yet wired) ──
export async function fetchAdmins(): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'superadmin'])
    .order('full_name');
  return (data as Profile[]) ?? [];
}

/** Accounts linked to one vendor (its managers). Many profiles may share a
 *  vendor_id, so a vendor can have several managers. */
export async function fetchVendorManagers(vendorId: string): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*').eq('vendor_id', vendorId).order('full_name');
  return (data as Profile[]) ?? [];
}

// ── Featured spotlight schedule ──
export async function fetchFeaturedSchedule(): Promise<FeaturedScheduleRow[]> {
  const { data } = await supabase
    .from('featured_schedule')
    .select('id, vendor_id, week_of, vendors(name, category)')
    .order('week_of');
  return (data as unknown as FeaturedScheduleRow[]) ?? [];
}

export async function addFeaturedWeek(vendorId: string, weekOf: string): Promise<string | null> {
  const { error } = await supabase
    .from('featured_schedule')
    .upsert({ vendor_id: vendorId, week_of: weekOf }, { onConflict: 'vendor_id,week_of' });
  return error?.message ?? null;
}

export async function removeFeaturedWeek(id: string): Promise<string | null> {
  const { error } = await supabase.from('featured_schedule').delete().eq('id', id);
  return error?.message ?? null;
}

// ── Stall assignment ──
export async function fetchScheduleForDate(marketDateId: string): Promise<ScheduleWithVendor[]> {
  const { data } = await supabase
    .from('vendor_schedule')
    .select('id, vendor_id, market_date_id, status, stalls, vendors(name, category, status)')
    .eq('market_date_id', marketDateId);
  // PostgREST types the embedded vendor as an array; the FK makes it one object.
  return (data as unknown as ScheduleWithVendor[]) ?? [];
}

export async function setStalls(scheduleId: string, stalls: string[]): Promise<string | null> {
  const { error } = await supabase.from('vendor_schedule').update({ stalls }).eq('id', scheduleId);
  return error?.message ?? null;
}

/** Add an active vendor to a market day as confirmed (preserves any existing stalls). */
export async function addVendorToDay(vendorId: string, marketDateId: string): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_schedule')
    .upsert(
      { vendor_id: vendorId, market_date_id: marketDateId, status: 'confirmed' },
      { onConflict: 'vendor_id,market_date_id' },
    );
  return error?.message ?? null;
}

/** Add an active vendor to a market day as confirmed AND place them on stalls (one step). */
export async function addVendorToDayWithStall(
  vendorId: string,
  marketDateId: string,
  stalls: string[],
): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_schedule')
    .upsert(
      { vendor_id: vendorId, market_date_id: marketDateId, status: 'confirmed', stalls },
      { onConflict: 'vendor_id,market_date_id' },
    );
  return error?.message ?? null;
}

export async function removeFromDay(scheduleId: string): Promise<string | null> {
  const { error } = await supabase.from('vendor_schedule').delete().eq('id', scheduleId);
  return error?.message ?? null;
}

/** Clone the confirmed lineup (vendors + stalls) from one market date onto another. */
export async function copyAssignments(fromDateId: string, toDateId: string): Promise<string | null> {
  const rows = await fetchScheduleForDate(fromDateId);
  const payload = rows
    .filter((r) => r.status === 'confirmed')
    .map((r) => ({ vendor_id: r.vendor_id, market_date_id: toDateId, status: 'confirmed', stalls: r.stalls }));
  if (!payload.length) return null;
  const { error } = await supabase
    .from('vendor_schedule')
    .upsert(payload, { onConflict: 'vendor_id,market_date_id' });
  return error?.message ?? null;
}

// ── Season import/export ──
export interface ScheduleExportRow {
  date: string;
  market: string;
  vendor: string;
  slug: string;
  stalls: string[];
  status: string;
}

/** Every assignment across all market dates (admin sees all via RLS). */
export async function fetchAllSchedule(): Promise<ScheduleExportRow[]> {
  const { data } = await supabase
    .from('vendor_schedule')
    .select('status, stalls, vendors(name, slug), market_dates(date, markets(name))');
  const rows =
    (data as unknown as {
      status: string;
      stalls: string[] | null;
      vendors: { name: string; slug: string } | null;
      market_dates: { date: string; markets: { name: string } | null } | null;
    }[]) ?? [];
  return rows
    .filter((r) => r.vendors && r.market_dates)
    .map((r) => ({
      date: r.market_dates!.date,
      market: r.market_dates!.markets?.name ?? '',
      vendor: r.vendors!.name,
      slug: r.vendors!.slug,
      stalls: r.stalls ?? [],
      status: r.status,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.vendor.localeCompare(b.vendor));
}

/** Bulk add/update assignments (one row per vendor+date), keyed on the unique constraint. */
export async function upsertScheduleBulk(
  rows: { vendor_id: string; market_date_id: string; status: string; stalls: string[] }[],
): Promise<string | null> {
  if (!rows.length) return null;
  const { error } = await supabase.from('vendor_schedule').upsert(rows, { onConflict: 'vendor_id,market_date_id' });
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

/** Bulk add announcements from a CSV import. */
export async function addAnnouncementsBulk(
  rows: { title: string; body: string; audience: AnnouncementAudience; active: boolean }[],
): Promise<string | null> {
  if (!rows.length) return null;
  const { error } = await supabase.from('announcements').insert(rows);
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

/** Bulk add events from a CSV import. */
export async function addEventsBulk(events: EventInput[]): Promise<string | null> {
  if (!events.length) return null;
  const { error } = await supabase.from('events').insert(events);
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

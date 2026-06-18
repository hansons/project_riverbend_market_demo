import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isProductInSeason } from '@/lib/format';
import type {
  Announcement,
  AnnouncementAudience,
  Market,
  MarketEvent,
  SeasonItem,
  Vendor,
  VendorOffering,
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

// ─── Market map: public stall assignments (confirmed, active vendors) ───
export interface StallAssignment {
  stall: string;
  vendor: string;
  slug: string;
}

/** Confirmed stall assignments for a market date (public-readable), one row per cell. */
export async function fetchAssignmentsForDate(marketDateId: string): Promise<StallAssignment[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_schedule')
    .select('stalls, vendors(name, slug, status)')
    .eq('market_date_id', marketDateId)
    .eq('status', 'confirmed');
  const rows = (data as unknown as { stalls: string[] | null; vendors: { name: string; slug: string; status: string } | null }[]) ?? [];
  return rows
    .filter((r) => r.vendors && r.vendors.status === 'active' && r.stalls && r.stalls.length)
    .flatMap((r) => r.stalls!.map((stall) => ({ stall, vendor: r.vendors!.name, slug: r.vendors!.slug })));
}

/** A vendor's own confirmed stall assignments (market_date_id + stalls). */
export async function fetchVendorConfirmed(vendorId: string): Promise<{ market_date_id: string; stalls: string[] }[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_schedule')
    .select('market_date_id, stalls')
    .eq('vendor_id', vendorId)
    .eq('status', 'confirmed');
  return ((data as { market_date_id: string; stalls: string[] }[]) ?? []).filter((r) => r.stalls && r.stalls.length);
}

/** The flagship market (lowest sort) and its next date on/after `fromISO`. The
 *  shopper front page keys off this so the cards + visit map reflect the main
 *  upcoming market — not whichever market happens to fall soonest on the calendar. */
/** The owner-chosen active market id, falling back to the lowest-sort market. */
async function activeMarketId(): Promise<string | null> {
  const { data: active } = await supabase.from('market_settings').select('market_id').eq('is_active', true).limit(1);
  const id = ((active as { market_id: string }[]) ?? [])[0]?.market_id;
  if (id) return id;
  const { data: mk } = await supabase.from('markets').select('id').order('sort').limit(1);
  return ((mk as { id: string }[]) ?? [])[0]?.id ?? null;
}

export async function fetchFrontPageMarketDate(
  fromISO: string,
): Promise<{ marketId: string; dateId: string | null; dateISO: string | null } | null> {
  if (!isSupabaseConfigured) return null;
  const marketId = await activeMarketId();
  if (!marketId) return null;
  const { data: dt } = await supabase
    .from('market_dates')
    .select('id, date')
    .eq('market_id', marketId)
    .gte('date', fromISO)
    .order('date')
    .limit(1);
  const row = ((dt as { id: string; date: string }[]) ?? [])[0];
  // Return the market even with no upcoming date — the map still frames the owner's
  // location; assignments/attendance just stay empty until dates exist.
  return { marketId, dateId: row?.id ?? null, dateISO: row?.date ?? null };
}

/** The active/front-page market record (owner-chosen, else lowest sort). */
export async function fetchActiveMarket(): Promise<Market | null> {
  if (!isSupabaseConfigured) return null;
  const marketId = await activeMarketId();
  if (!marketId) return null;
  const { data } = await supabase.from('markets').select('*').eq('id', marketId).maybeSingle();
  return (data as Market) ?? null;
}

/** Vendor ids confirmed (and active) for a market date — i.e. who's actually attending. */
export async function fetchAttendingForDate(marketDateId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_schedule')
    .select('vendor_id, vendors(status)')
    .eq('market_date_id', marketDateId)
    .eq('status', 'confirmed');
  const rows = (data as unknown as { vendor_id: string; vendors: { status: string } | null }[]) ?? [];
  return rows.filter((r) => r.vendors?.status === 'active').map((r) => r.vendor_id);
}

/** Upcoming community events (on/after `fromISO`), with their market joined. */
export async function fetchUpcomingEvents(fromISO: string): Promise<MarketEvent[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('events')
    .select('*, markets(name, day_of_week)')
    .gte('date', fromISO)
    .order('date');
  return (data as unknown as MarketEvent[]) ?? [];
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

/** Vendors explicitly scheduled to be featured for the applicable week (latest week_of ≤ reference). */
export async function fetchFeaturedForWeek(reference: string): Promise<Vendor[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('featured_schedule')
    .select('week_of, vendors(*)')
    .lte('week_of', reference)
    .order('week_of', { ascending: false });
  const rows = (data as unknown as { week_of: string; vendors: Vendor | null }[]) ?? [];
  if (!rows.length) return [];
  const latest = rows[0].week_of;
  return rows
    .filter((r) => r.week_of === latest && r.vendors && r.vendors.status === 'active')
    .map((r) => r.vendors as Vendor);
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

/** Lightweight product index (active vendors only, via RLS) for matching items to vendors. */
export async function fetchAllProducts(): Promise<{ vendor_id: string; name: string; category: string | null; in_season: boolean }[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('vendor_products').select('vendor_id, name, category, in_season, season_months');
  const rows = (data as { vendor_id: string; name: string; category: string | null; in_season: boolean; season_months: number[] }[]) ?? [];
  // Effective in-season: scheduled products auto-flip by month.
  return rows.map((r) => ({ vendor_id: r.vendor_id, name: r.name, category: r.category ?? null, in_season: isProductInSeason(r) }));
}

export async function fetchSeasonality(): Promise<SeasonItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('seasonality').select('*').order('sort');
  return (data as SeasonItem[]) ?? [];
}

// ─── Weekly offerings on the public side (auto-rotates by date) ──────
export async function fetchVendorOfferings(vendorId: string): Promise<VendorOffering[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_offerings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('week_of', { ascending: false });
  return (data as VendorOffering[]) ?? [];
}

/** Latest offering per vendor with week_of on/before the reference date. */
export async function fetchCurrentOfferings(referenceISO: string): Promise<VendorOffering[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('vendor_offerings')
    .select('*')
    .lte('week_of', referenceISO)
    .order('week_of', { ascending: false });
  const seen = new Set<string>();
  const out: VendorOffering[] = [];
  for (const o of (data as VendorOffering[]) ?? []) {
    if (!seen.has(o.vendor_id)) {
      seen.add(o.vendor_id);
      out.push(o);
    }
  }
  return out;
}

/** The offering a shopper should see "now": newest one dated on/before reference. */
export function pickCurrentOffering(
  offerings: VendorOffering[],
  referenceISO: string,
): VendorOffering | null {
  return (
    offerings
      .filter((o) => o.week_of <= referenceISO)
      .sort((a, b) => b.week_of.localeCompare(a.week_of))[0] ?? null
  );
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

// Database row shapes (mirror supabase/migrations). Kept hand-written and small
// rather than generated — this is a demo, not a typegen pipeline.

export type AppRole = 'shopper' | 'vendor' | 'admin' | 'superadmin';
export type VendorStatus = 'pending' | 'active' | 'suspended';
export type SeasonStatus = 'peak' | 'coming' | 'ending';

/** Brand tokens are "R G B" triplets so they drop straight into CSS variables. */
export interface Brand {
  primary: string;
  'primary-dark': string;
  accent: string;
  berry: string;
  ink: string;
  paper: string;
  card: string;
  muted: string;
  line: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  region: string | null;
  brand: Partial<Brand>;
  is_active: boolean;
}

export interface Theme {
  id: string;
  name: string;
  brand: Partial<Brand>;
  sort: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  vendor_id: string | null;
}

export interface Market {
  id: string;
  name: string;
  day_of_week: string;
  season: string;
  hours: string;
  location: string;
  blurb: string | null;
  sort: number;
}

export interface MarketEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  market_id: string | null;
  category: string | null;
  featured: boolean;
  markets?: { name: string; day_of_week: string } | null; // joined
}

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  story: string | null;
  town: string | null;
  practices: string[];
  market_days: string[];
  image_url: string | null;
  logo_url: string | null;
  email: string | null;
  status: VendorStatus;
  featured: boolean;
}

export interface VendorProduct {
  id: string;
  vendor_id: string;
  name: string;
  category: string | null;
  unit: string | null;
  price_cents: number | null;
  in_season: boolean;
  sort: number;
}

export interface SeasonItem {
  id: string;
  item: string;
  category: string;
  emoji: string | null;
  status: SeasonStatus | string;
  months: number[];
  note: string | null;
  sort: number;
}

// ─── Vendor portal (Slice 2) ─────────────────────────────────────────
export type ScheduleStatus = 'confirmed' | 'declined' | 'pending';
export type FeeStatus = 'due' | 'paid' | 'waived';
export type MessageSender = 'vendor' | 'admin';

export interface VendorOffering {
  id: string;
  vendor_id: string;
  week_of: string;
  headline: string | null;
  items: string[];
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface MarketDate {
  id: string;
  market_id: string;
  date: string;
  label: string | null;
  sort: number;
  markets?: { name: string; day_of_week: string } | null; // joined
}

export interface VendorScheduleRow {
  id: string;
  vendor_id: string;
  market_date_id: string;
  status: ScheduleStatus;
  stalls: string[];
  note: string | null;
}

export interface Fee {
  id: string;
  vendor_id: string;
  period: string;
  description: string | null;
  amount_cents: number;
  status: FeeStatus;
  due_date: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  vendor_id: string;
  sender: MessageSender;
  author_name: string;
  body: string;
  created_at: string;
}

// ─── Product categories (managed, with request flow) ────────────────
export type CategoryStatus = 'active' | 'pending';

export interface ProductCategory {
  id: string;
  name: string;
  status: CategoryStatus;
  requested_by: string | null;
  created_at: string;
}

// ─── Admin portal (Slice 3) ──────────────────────────────────────────
export type AnnouncementAudience = 'public' | 'vendors' | 'all';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  active: boolean;
  created_at: string;
}

/** A vendor_schedule row joined with its vendor (admin stall-assignment view). */
export interface ScheduleWithVendor {
  id: string;
  vendor_id: string;
  market_date_id: string;
  status: ScheduleStatus;
  stalls: string[];
  vendors?: { name: string; category: string; status: VendorStatus } | null;
}

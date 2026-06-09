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

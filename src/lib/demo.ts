import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/lib/types';

// The four one-click demo personas. "Entering" a persona signs in to a real
// seeded Supabase account (except Shopper, which is the signed-out public view),
// so Row-Level Security genuinely enforces what each role can see and do.

export interface DemoPersona {
  key: 'shopper' | 'vendor' | 'admin' | 'owner';
  role: AppRole;
  label: string;
  blurb: string;
  /** null = anonymous public shopper (sign out). */
  email: string | null;
  emoji: string;
}

export const DEMO_PASSWORD = 'demo1234';

export const PERSONAS: DemoPersona[] = [
  {
    key: 'shopper',
    role: 'shopper',
    label: 'Shopper',
    blurb: 'Browse the public market — no login needed',
    email: null,
    emoji: '🧺',
  },
  {
    key: 'vendor',
    role: 'vendor',
    label: 'Vendor',
    blurb: 'Fern Hollow Farm — manage my stand',
    email: 'vendor@riverbend.demo',
    emoji: '🌾',
  },
  {
    key: 'admin',
    role: 'admin',
    label: 'Market Admin',
    blurb: 'Run the market — vendors, stalls, reports',
    email: 'admin@riverbend.demo',
    emoji: '🛠️',
  },
  {
    key: 'owner',
    role: 'superadmin',
    label: 'Platform Owner',
    blurb: 'Lodestone view — re-skin & configure',
    email: 'owner@riverbend.demo',
    emoji: '⚙️',
  },
];

export const personaForRole = (role: AppRole | null | undefined): DemoPersona =>
  PERSONAS.find((p) => p.role === role) ?? PERSONAS[0];

/** Enter a persona. Returns an error string if sign-in failed, else null. */
export async function enterAs(p: DemoPersona): Promise<string | null> {
  if (!p.email) {
    await supabase.auth.signOut();
    return null;
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: p.email,
    password: DEMO_PASSWORD,
  });
  return error?.message ?? null;
}

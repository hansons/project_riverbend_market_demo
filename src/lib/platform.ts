import { supabase } from '@/lib/supabase';

/** Restore the demo to its seeded state (server-side; superadmin only via RLS). */
export async function resetDemo(): Promise<string | null> {
  const { error } = await supabase.rpc('reset_demo');
  return error?.message ?? null;
}

import { supabase } from '@/lib/supabase';
import type {
  TokenCurrency,
  TokenIssuance,
  TokenReconciliationRow,
  TokenRedemption,
  TokenRedemptionReport,
} from '@/lib/types';

// EBT/SNAP/Double Up token tracking (0018) — reconciliation, NOT card processing.
// RLS: issuance is admin-only; a vendor self-reports own redemptions, admins any.

export async function fetchTokenCurrencies(): Promise<TokenCurrency[]> {
  const { data } = await supabase.from('token_currencies').select('*').eq('active', true).order('sort');
  return (data as TokenCurrency[]) ?? [];
}

// ── Redemptions ──
export async function fetchMyRedemptions(vendorId: string): Promise<TokenRedemption[]> {
  const { data } = await supabase
    .from('token_redemption')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('market_date', { ascending: false });
  return (data as TokenRedemption[]) ?? [];
}

/** Admin: every vendor's redemptions for one market day (joined vendor name). */
export async function fetchRedemptionsForDate(marketDate: string): Promise<TokenRedemption[]> {
  const { data } = await supabase
    .from('token_redemption')
    .select('*, vendors(name)')
    .eq('market_date', marketDate)
    .order('created_at');
  return (data as unknown as TokenRedemption[]) ?? [];
}

/** Admin: all redemptions, flattened for the grant CSV (joined names + labels). */
export async function fetchAllRedemptions(): Promise<TokenRedemptionReport[]> {
  const { data } = await supabase
    .from('report_token_redemptions')
    .select('*')
    .order('market_date', { ascending: false });
  return (data as TokenRedemptionReport[]) ?? [];
}

export interface RedemptionInput {
  vendor_id: string;
  market_date: string;
  currency: string;
  amount_cents: number;
  token_count: number;
  recorded_by?: string | null;
}

export async function recordRedemption(r: RedemptionInput): Promise<string | null> {
  const { error } = await supabase.from('token_redemption').insert(r);
  return error?.message ?? null;
}

export async function updateRedemption(id: string, patch: Partial<RedemptionInput>): Promise<string | null> {
  const { error } = await supabase.from('token_redemption').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteRedemption(id: string): Promise<string | null> {
  const { error } = await supabase.from('token_redemption').delete().eq('id', id);
  return error?.message ?? null;
}

/** Admin-only (trigger enforces): mark reimbursed; reimbursed_at is auto-stamped. */
export async function setReimbursed(id: string, reimbursed: boolean): Promise<string | null> {
  const { error } = await supabase.from('token_redemption').update({ reimbursed }).eq('id', id);
  return error?.message ?? null;
}

// ── Issuance (admin-only; RLS enforces) ──
export async function fetchIssuance(): Promise<TokenIssuance[]> {
  const { data } = await supabase
    .from('token_issuance')
    .select('*')
    .order('market_date', { ascending: false });
  return (data as TokenIssuance[]) ?? [];
}

export interface IssuanceInput {
  market_date: string;
  currency: string;
  amount_cents: number;
  token_count: number;
}

export async function recordIssuance(i: IssuanceInput): Promise<string | null> {
  const { error } = await supabase.from('token_issuance').insert(i);
  return error?.message ?? null;
}

// ── Reconciliation ──
export async function fetchReconciliation(): Promise<TokenReconciliationRow[]> {
  const { data } = await supabase
    .from('token_reconciliation')
    .select('*')
    .order('market_date', { ascending: false });
  return (data as TokenReconciliationRow[]) ?? [];
}

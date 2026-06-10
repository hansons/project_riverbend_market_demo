import { supabase } from '@/lib/supabase';
import type { DocType, VendorDocumentStatus } from '@/lib/types';

// Compliance documents (0016). RLS scopes the answer: a vendor sees/writes only
// their own; admins see/manage all. The vendor_documents_status view recomputes
// valid / expiring / expired (and the 60/30/7 windows) on every read.

export async function fetchDocumentTypes(): Promise<DocType[]> {
  const { data } = await supabase.from('doc_types').select('*').eq('active', true).order('sort');
  return (data as DocType[]) ?? [];
}

export async function fetchMyDocuments(vendorId: string): Promise<VendorDocumentStatus[]> {
  const { data } = await supabase
    .from('vendor_documents_status')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('expires_date', { nullsFirst: false });
  return (data as VendorDocumentStatus[]) ?? [];
}

export async function fetchAllDocuments(): Promise<VendorDocumentStatus[]> {
  const { data } = await supabase
    .from('vendor_documents_status')
    .select('*')
    .order('expires_date', { nullsFirst: false });
  return (data as VendorDocumentStatus[]) ?? [];
}

export interface DocumentInput {
  doc_type: string;
  file_url: string | null;
  issued_date: string | null;
  expires_date: string | null;
  notes: string | null;
}

export async function addDocument(vendorId: string, d: DocumentInput): Promise<string | null> {
  const { error } = await supabase.from('vendor_documents').insert({ vendor_id: vendorId, ...d });
  return error?.message ?? null;
}

export async function deleteDocument(id: string): Promise<string | null> {
  const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
  return error?.message ?? null;
}

/** Admin-only: stamp verification. verifiedBy is the admin's profile id (FK profiles.id). */
export async function verifyDocument(id: string, verifiedBy: string): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_documents')
    .update({ verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', id);
  return error?.message ?? null;
}

export async function unverifyDocument(id: string): Promise<string | null> {
  const { error } = await supabase
    .from('vendor_documents')
    .update({ verified_by: null, verified_at: null })
    .eq('id', id);
  return error?.message ?? null;
}

/** Resolve a private-bucket path to a short-lived signed URL for viewing/downloading. */
export async function signedDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('vendor-documents').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Admin-only RPC: market-wide % of active vendors holding all required docs valid. */
export async function complianceRate(): Promise<number> {
  const { data } = await supabase.rpc('doc_compliance_rate');
  return typeof data === 'number' ? data : 0;
}

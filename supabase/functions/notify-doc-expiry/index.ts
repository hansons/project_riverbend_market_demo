// Riverbend Farmers Market — Lodestone capability demo
// Edge Function: notify-doc-expiry
//
// Emails market admins (and optionally the owning vendor) when a compliance
// document hits the 60/30/7-day windows before expiry. Driven daily by the
// pg_cron job in migration 0017. This is the email half of the doc-expiry
// alerts; the in-app "Expiring soon" panel needs nothing server-side.
//
// Auth: the cron caller must send `Authorization: Bearer <CRON_SECRET>`. Deploy
// with `--no-verify-jwt` (the cron sends a static secret, not a user JWT). The
// function talks to the DB with the service-role key, which bypasses RLS so it
// can read every vendor's docs and write notification_log.
//
// Secrets (supabase secrets set …): RESEND_API_KEY, CRON_SECRET, NOTIFY_FROM,
// NOTIFY_VENDOR ("true"/"false"). SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
// injected automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'onboarding@resend.dev';
const NOTIFY_VENDOR = Deno.env.get('NOTIFY_VENDOR') === 'true';

interface ExpiringDoc {
  id: string;
  doc_label: string;
  vendor_name: string;
  vendor_email: string | null;
  expires_date: string | null;
  days_until_expiry: number | null;
  due_60: boolean;
  due_30: boolean;
  due_7: boolean;
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  if (!RESEND_KEY || to.length === 0) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  });
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // Docs hitting exactly the 60/30/7-day windows (the view computes the flags).
  const { data: docs, error } = await db
    .from('vendor_documents_status')
    .select('id, doc_label, vendor_name, vendor_email, expires_date, days_until_expiry, due_60, due_30, due_7')
    .or('due_60.eq.true,due_30.eq.true,due_7.eq.true');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const { data: admins } = await db.from('profiles').select('email').in('role', ['admin', 'superadmin']);
  const adminTo = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);

  let sent = 0;
  for (const d of (docs ?? []) as ExpiringDoc[]) {
    const window = d.due_7 ? 7 : d.due_30 ? 30 : 60;

    // De-dup: insert the log row; if it already existed, skip (already emailed).
    const { data: logged } = await db
      .from('notification_log')
      .upsert({ doc_id: d.id, sent_for_window: window }, { onConflict: 'doc_id,sent_for_window', ignoreDuplicates: true })
      .select('id');
    if (!logged || logged.length === 0) continue;

    const to = NOTIFY_VENDOR && d.vendor_email ? [...adminTo, d.vendor_email] : adminTo;
    if (to.length === 0) continue;

    await sendEmail(
      to,
      `Document expiring in ${window} days — ${d.vendor_name}`,
      `<p><strong>${d.vendor_name}</strong>'s ${d.doc_label} expires on ${d.expires_date}` +
        ` (${d.days_until_expiry} days). Please follow up for an updated document.</p>`,
    );
    sent++;
  }

  return new Response(JSON.stringify({ checked: docs?.length ?? 0, emailed: sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

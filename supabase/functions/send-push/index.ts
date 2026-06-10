// Riverbend Farmers Market — Lodestone capability demo
// Edge Function: send-push
//
// Delivers Web Push notifications. Called from the browser (CORS):
//   • { test: true }                  → send a test to the caller's own devices
//   • { vendor_id, kind | title,body }→ admin-only; notify a vendor's devices
//
// Auth: the caller's JWT identifies them (Supabase verifies it). Vendor-targeted
// sends require the caller to be an admin. Delivery uses the service-role key
// (bypasses RLS); endpoints that return 404/410 are pruned.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or URL).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:notify@riverbend.demo';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESSAGES: Record<string, { title: string; body: string; url: string }> = {
  test: { title: 'Riverbend notifications are on ✅', body: 'This is a test — you’re all set.', url: '/' },
  approved: { title: '🎉 You’re approved!', body: 'Your application was approved — welcome to the market.', url: '/' },
  doc_verified: { title: '✓ Document verified', body: 'Market staff verified one of your documents.', url: '/' },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'Push is not configured (missing VAPID keys).' }, 500);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await db.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return json({ error: 'Not signed in.' }, 401);

  const body = await req.json().catch(() => ({}));

  let msg: { title: string; body: string; url: string };
  let subs: SubRow[] = [];

  if (body.test) {
    msg = MESSAGES.test;
    const { data } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', uid);
    subs = (data as SubRow[]) ?? [];
  } else if (body.vendor_id) {
    const { data: prof } = await db.from('profiles').select('role').eq('id', uid).maybeSingle();
    if (!prof || !['admin', 'superadmin'].includes(prof.role)) return json({ error: 'Admins only.' }, 403);
    msg = MESSAGES[body.kind as string] ?? {
      title: body.title ?? 'Riverbend Market',
      body: body.body ?? '',
      url: body.url ?? '/',
    };
    const { data } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('vendor_id', body.vendor_id);
    subs = (data as SubRow[]) ?? [];
  } else {
    return json({ error: 'Nothing to send.' }, 400);
  }

  const payload = JSON.stringify(msg);
  let sent = 0;
  let pruned = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await db.from('push_subscriptions').delete().eq('id', s.id);
        pruned++;
      }
    }
  }
  return json({ sent, pruned });
});

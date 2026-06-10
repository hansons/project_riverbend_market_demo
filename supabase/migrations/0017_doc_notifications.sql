-- Riverbend Farmers Market — Lodestone capability demo
-- 0017: doc-expiry EMAIL notifications. A de-dup log so a document is emailed at
-- most once per 60/30/7-day window, plus the (commented) pg_cron job that pings
-- the notify-doc-expiry Edge Function daily.
--
-- The IN-APP "expiring soon" alert needs nothing here — it is served by the
-- vendor_documents_status view (0016). This migration is only the email pipeline,
-- the first server-side notification infrastructure in this repo.
--
-- REQUIRES DASHBOARD CONFIG before email works (see the commented block below):
--   1. Enable the pg_cron and pg_net extensions for this project.
--   2. Deploy the function:  supabase functions deploy notify-doc-expiry --no-verify-jwt
--   3. Set secrets:          supabase secrets set RESEND_API_KEY=… CRON_SECRET=… NOTIFY_FROM=… NOTIFY_VENDOR=false
--   4. Run the cron.schedule below with THIS project's ref + the CRON_SECRET.
-- The schedule block ships commented out so this migration applies cleanly everywhere.

create table notification_log (
  id              uuid primary key default gen_random_uuid(),
  doc_id          uuid not null references vendor_documents(id) on delete cascade,
  sent_for_window int not null,                 -- 60 | 30 | 7
  sent_at         timestamptz not null default now(),
  unique (doc_id, sent_for_window)              -- the de-dup guarantee
);
create index notification_log_doc_idx on notification_log(doc_id);

alter table notification_log enable row level security;
-- Admin read only. The Edge Function writes with the service-role key (bypasses RLS);
-- there is no client write path.
create policy notification_log_select on notification_log for select to authenticated
  using (is_admin());

-- ─── Daily schedule (RUN MANUALLY after deploy — see header) ─────────
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'doc-expiry-daily',
--   '0 15 * * *',                                  -- 15:00 UTC ≈ 08:00 America/Los_Angeles
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT_REF>.functions.supabase.co/notify-doc-expiry',
--     headers := jsonb_build_object(
--                  'Content-Type', 'application/json',
--                  'Authorization', 'Bearer <CRON_SECRET>'),
--     body    := '{}'::jsonb
--   );
--   $$
-- );

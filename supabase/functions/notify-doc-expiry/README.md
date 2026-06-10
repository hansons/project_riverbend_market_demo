# notify-doc-expiry

Emails market admins (and optionally the owning vendor) when a compliance document
hits the **60 / 30 / 7-day** windows before expiry. This is the email half of the
doc-expiry alerts — the in-app "Expiring soon" panel (Admin → Documents) works with
no setup. The DB side (de-dup log + cron) lives in migration `0017_doc_notifications.sql`.

## One-time setup (Supabase dashboard / CLI)

1. **Enable extensions** (Dashboard → Database → Extensions): `pg_cron`, `pg_net`.
2. **Deploy the function:**
   ```
   supabase functions deploy notify-doc-expiry --no-verify-jwt
   ```
   `--no-verify-jwt` because the cron sends a static `CRON_SECRET` bearer, not a user JWT.
3. **Set secrets:**
   ```
   supabase secrets set RESEND_API_KEY=re_xxx CRON_SECRET=<random> NOTIFY_FROM='alerts@<verified-domain>' NOTIFY_VENDOR=false
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do not set them.
4. **Schedule it:** run the (commented) `cron.schedule` block at the bottom of
   `migrations/0017_doc_notifications.sql`, substituting this project's ref and the `CRON_SECRET`.
5. **Resend:** verify the sender domain (SPF/DKIM). Until then, the default `onboarding@resend.dev`
   sandbox sender works for testing.

## Manual test

```
curl -X POST 'https://<PROJECT_REF>.functions.supabase.co/notify-doc-expiry' \
  -H 'Authorization: Bearer <CRON_SECRET>'
```

Returns `{ "checked": N, "emailed": M }`. A second call sends nothing more (the
`notification_log` unique constraint dedups per document per window).

## Cost / ops

Resend's free tier covers demo volume; cron + pg_net usage is negligible. Failures
surface in Dashboard → Edge Functions → Logs; `notification_log` is the audit trail.

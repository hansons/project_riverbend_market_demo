# Deploying Riverbend for a real market

This repo is a **capability demo**. Running it for a real farmers market — isolated
from any other market — takes two phases:

1. **Productionize the codebase once** (strip the demo scaffolding, add real auth). →
   produces a reusable "production template."
2. **Spin up one isolated instance per market** (its own database, hosting, domain).

> Isolation model: **instance-per-market (silo).** Each market gets its **own Supabase
> project + own Cloudflare Pages deployment + own domain** → separate Postgres databases,
> so there is zero chance of cross-market data leakage. (The `tenants` table is
> *branding* only; market data is not `tenant_id`-scoped, so a single shared deployment
> would require a schema migration — see "Scaling" at the end. Don't pool for a handful
> of markets.)

---

## Phase 1 — Productionize the codebase (do once)

The demo is **not safe to expose to real users as-is.** Close these before any real deploy:

- [ ] **Remove the persona switcher + intro.** `src/components/DemoBar.tsx` (the
      `enterAs` / `PERSONAS` "View as" switch), `src/components/IntroOverlay.tsx`, and
      `src/lib/demo.ts` let anyone become admin with one click. Replace with a real
      sign-in screen (Google SSO is already wired in `src/auth/AuthContext.tsx`; add
      email/magic-link if wanted). **No role-switching UI in production.**
- [ ] **Remove the demo reset.** `reset_demo()` + `_load_demo_data()` (migration `0007`)
      and the Platform-Owner "Demo controls" section **wipe real data**. Delete them and
      `scripts/seed-demo-users.mjs`.
- [ ] **Build account provisioning.** Today roles are assigned by the seed script. Real
      flow: vendor uses the public **apply** form → admin approves → the vendor's signed-in
      account links to their `vendor_id` (claim-by-invite token, or admin assigns). This is
      the main net-new build.
- [ ] **Replace `supabase/seed.sql`** (the 23 fictional vendors) with the market's real
      data, or ship an empty seed and enter data via the admin UI.
- [ ] **Wire the stubbed infra:** email (Resend domain SPF/DKIM, enable `pg_cron`+`pg_net`,
      schedule the `0017` cron) and push (VAPID keys + secrets, deploy `send-push`, add PNG
      192/512 + apple-touch-icon for clean PWA install).
- [ ] **Legal:** privacy policy + ToS pages; document handling of vendor PII and the
      uploaded **insurance documents** (`vendor-documents` bucket) — real liability there.
- [ ] **Backups/monitoring:** Supabase PITR (paid tier) or scheduled `pg_dump`; error tracking.

Outcome: a `production` branch/template with the demo scaffolding gone and real auth in.

---

## Phase 2 — Per-market deployment runbook (~½–1 day each)

Repeat for each market. Everything below is that market's own resources.

1. **Supabase project.** Create one (region near the market). Record `Project URL`,
   `anon` key, `service_role` key.
2. **Schema.** Apply migrations `0001`–`0021` **in order** (SQL editor, or
   `supabase link` + `supabase db push`). Confirm the storage buckets (`vendor-photos`
   public, `vendor-documents` private) and RLS policies exist.
3. **Data.** Load this market's vendors, markets, `market_dates`, and categories (real
   seed or via the admin UI). Do **not** load the demo seed.
4. **Auth.** Enable the **Google** provider in Supabase Auth. Set **Site URL** and
   **Redirect URLs** to the production domain (step 8). Add email/magic-link if used.
5. **Edge Functions + secrets.**
   ```
   supabase functions deploy notify-doc-expiry --no-verify-jwt
   supabase functions deploy send-push
   supabase secrets set RESEND_API_KEY=… CRON_SECRET=… NOTIFY_FROM='alerts@<domain>' \
                        VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT='mailto:…'
   ```
   Enable `pg_cron` + `pg_net`; run the `cron.schedule` block in `0017` with this
   project's ref. (See each function's `README.md`.)
6. **Branding.** Set the active row in `tenants` (name, `brand` JSON, logo/favicon/banner).
   Branding stays config — no rebuild.
7. **Cloudflare Pages.** New project from the repo (or this market's branch). Build
   command `npm run build`, output `dist`. Env vars:
   ```
   VITE_SUPABASE_URL=<project url>
   VITE_SUPABASE_ANON_KEY=<anon key>
   VITE_VAPID_PUBLIC_KEY=<vapid public>     # omit to hide the notifications UI
   ```
   (`public/_redirects` already handles SPA routing.)
8. **Domain.** Add the market's custom domain (or `market.ldstn.us`) in Pages. Update
   Supabase Auth **Site/Redirect URLs** and the **Google OAuth** authorized origins +
   redirect URIs to match it.
9. **First admin.** Sign in once with Google, then promote that user:
   `update profiles set role = 'admin' where email = '<admin email>';`
10. **Smoke test.** Admin signs in → add a vendor → vendor signs in → confirm RLS
    isolation (a vendor sees only their own rows) → test email + push → verify the
    persona switcher and `reset_demo` are gone.

---

## Market intake checklist (collect up front)

- Market name, region; brand colors, logo, favicon, home banner.
- Domain (their own, or a Lodestone subdomain).
- Market days / seasons / locations; vendor roster + product categories.
- Admin contact(s) who will hold admin accounts.
- Notifications? → Resend sending domain (email) and whether to enable web push (VAPID).

---

## Cost & scaling

- **Per market:** Supabase + Cloudflare Pages + Resend free tiers cover farmers-market
  scale → **~$0–25/mo** + a domain (~$10–15/yr).
- **Operational tradeoff:** silo means **N projects to migrate + redeploy** on every
  change. Fine — and scriptable — up to ~15–20 markets. Past that, the fan-out is the
  pain point and it's worth revisiting the **pooled model** (one deployment, `tenant_id`
  on every table, RLS scoped by tenant) as a deliberate product-line decision.

# Riverbend Farmers Market — a Lodestone capability demo

A live, role-secured web app you can hand a prospect so they can **click through and
feel "this could be my organization."** The market ("Riverbend Farmers Market") is
**fictional** — it's an illustrative skin over a real, production-shaped stack.

> **What this is / isn't.** This is a generic **Lodestone Consulting** capability
> showcase — a fictional market, deliberately not tied to any real client, so it can be
> shown to anyone. It demonstrates the stack and the role-based UX; it is not a client
> deliverable.

## What it shows off

Four role experiences, each entered with one click from the demo bar. Switching a
persona signs into a **real seeded Supabase account**, so **Row-Level Security
genuinely enforces** what each role can see and do — this isn't a clickable mockup.

| Persona | Role | What they get |
|---|---|---|
| 🧺 **Shopper** | (public, no login) | What's in season, browse/match vendors, vendor pages, market info |
| 🌾 **Vendor** | `vendor` | Profile/farm story, weekly offerings, schedule, fees, messages |
| 🛠️ **Market Admin** | `admin` | Application queue, vendor mgmt, stall assignment, comms, reports |
| ⚙️ **Platform Owner** | `superadmin` | Live re-skin to another brand; tenant config; "it's a platform" |

## Stack

Vite + React 19 + TypeScript + Tailwind · Supabase (Postgres / Auth / RLS) ·
deploys static to Cloudflare Pages. Forked from the Sparrow staff-portal pattern.

## Build status (slices)

- ✅ **Slice 0** — scaffold, brand/theme (CSS-var driven), auth + one-click personas, deploy config
- ✅ **Slice 1** — public/shopper surface + market seed data
- ⬜ **Slice 2** — vendor portal
- ⬜ **Slice 3** — admin portal
- ⬜ **Slice 4** — platform view + live re-skin
- ⬜ **Slice 5** — polish + deploy

Until 2–4 land, the vendor/admin/owner personas show a placeholder that still proves
the authenticated, RLS-gated session works.

---

## Setup runbook

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
[supabase.com](https://supabase.com) → New project. Then **Settings → API** gives you
the values below.

### 3. Environment
```bash
cp .env.example .env.local
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is browser-safe —
RLS gates everything).

### 4. Schema + data
In the Supabase **SQL editor** (or `supabase db push`), run in order:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_market.sql`
3. `supabase/seed.sql`

### 5. Demo personas (one-click logins)
This creates the four demo accounts and elevates their roles. It needs the
**service_role** secret (Settings → API) and never ships to the browser:
```bash
SUPABASE_URL=https://YOUR-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret \
npm run seed:users
```
Every demo account uses the password `demo1234`.

### 6. Run
```bash
npm run dev
```
The shopper view works immediately; use the demo bar to enter the other roles.

### Google SSO (optional)
Not required — the demo runs on the seeded password logins. To add it: Supabase →
**Authentication → Providers → Google**, set the callback to
`https://<project-ref>.supabase.co/auth/v1/callback`, and add your dev + Pages origins
under **URL Configuration**. New Google sign-ins land as `shopper`.

---

## Deploy to Cloudflare Pages

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `public/_redirects` already maps all routes to the SPA. (Routing is hash-based, so it
  works even without the redirect rule.)

Add your Pages URL to Supabase **Authentication → URL Configuration** so auth redirects
are allowed.

---

## How the pieces fit

```
src/
  main.tsx                 ThemeProvider + AuthProvider + App
  App.tsx                  picks the surface from the signed-in role
  components/
    DemoBar.tsx            the persona switcher (one-click RLS logins)
    SurfacePlaceholder.tsx stand-in for vendor/admin/owner (Slices 2–4)
    SetupNotice.tsx        shown when Supabase isn't connected yet
  surfaces/public/         Slice 1 — the shopper experience
  auth/AuthContext.tsx     session + profile
  theme/ThemeProvider.tsx  tenant brand → CSS variables (powers live re-skin)
  lib/                     supabase client, types, data queries, demo personas, router
supabase/
  migrations/              0001 (tenants/profiles/RLS) + 0002 (market domain)
  seed.sql                 tenants, markets, vendors, products, seasonality
scripts/seed-demo-users.mjs  creates the four demo auth users
```

**Branding is data.** `tenants.brand` holds `"R G B"` triplets; `ThemeProvider` writes
them to CSS variables that every Tailwind `brand-*` color reads. Slice 4's live re-skin
is just switching the active tenant.

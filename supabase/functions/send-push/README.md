# send-push

Delivers Web Push notifications to vendors' subscribed devices. Foreground/background
delivery is handled by the browser push services; this function signs and posts the
payloads (VAPID) and prunes dead endpoints. Subscriptions live in `push_subscriptions`
(migration `0021`).

## One-time setup

1. **Generate VAPID keys** (once):
   ```
   npx web-push generate-vapid-keys
   ```
   Gives a public + private key pair.

2. **Front-end env** — add the *public* key so the browser can subscribe. In the
   build env (Cloudflare Pages → Settings → Environment variables, and local `.env`):
   ```
   VITE_VAPID_PUBLIC_KEY=<public key>
   ```
   The "🔔 Notifications" card in the vendor dashboard stays hidden until this is set.

3. **Function secrets** — the *private* key never leaves the server:
   ```
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT='mailto:you@yourdomain'
   ```
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set them.

4. **Deploy** (keep JWT verification ON — the function needs the caller's identity):
   ```
   supabase functions deploy send-push
   ```

## How it's called

- The vendor's **"Send test"** button → `{ test: true }` → notifies the caller's own devices.
- Approving a vendor in **Admin → Vendors** → `{ vendor_id, kind: 'approved' }` (admin-only).
- Add more events by invoking with `{ vendor_id, kind }` (`doc_verified` is pre-defined) or
  an explicit `{ vendor_id, title, body, url }`.

## Notes / platform caveats

- **iPhone/iPad:** Web Push only works once the site is **installed to the Home Screen**
  (iOS 16.4+). A normal Safari tab cannot receive it. Desktop + Android Chrome work in-browser.
- Requires HTTPS (Cloudflare Pages ✓) and the registered service worker at `/sw.js`.
- A more robust trigger model is Supabase **Database Webhooks** (fire on row changes
  regardless of source) calling this function with the service role — a future upgrade
  from the current app-side invocation.
- For a polished installed icon (esp. iOS), add PNG `192`/`512` + an `apple-touch-icon`
  to `public/` and reference them in `manifest.webmanifest` / `index.html` (currently SVG).

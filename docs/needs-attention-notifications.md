# "Needs attention" — routed notification system (design, deferred)

**Status:** Design captured 2026-06-18. **Not built yet** — owner chose "keep the plan for now."
Companion change shipped same day: an in-app **Add market day** control in Admin → Stalls, so the
"no upcoming market days" gap is fixable without a reseed (the original trigger for this idea).

## The problem it solves

Today, missing/incomplete state surfaces as dead-end hints (e.g. "This market has no upcoming
market days yet — add a market day before scheduling vendors"). The hint tells you *what's* wrong
but not *who* should fix it or *where* to go. We want gaps to become **routed action items**: each
gap knows which role should act and links them straight to the fix.

## Concept

A **check registry** — each check is a small, pure rule evaluated against data already in the app:

```
{ id, detect(data) -> boolean, role: 'owner'|'admin'|'vendor',
  severity: 'blocker'|'nudge', title, cta: { label, link } }
```

Each role's shell renders a **"Needs attention"** panel + a badge count, listing only the checks
that fire for that role, each with a one-click CTA to the fix. Mostly derivable from existing
queries — **no new tables required** for the in-app surface. Time-sensitive checks can later also
fire **Web Push** (infra already exists, migration 0021).

## Checks by role

**Owner (superadmin)**
- Market has no upcoming dates (the current trigger). → CTA: add a market day.
- Market missing map location / center. → CTA: Owner → Markets card.
- No active demo market set. → CTA: set demo market.

**Admin**
- Pending vendor applications awaiting review.
- Confirmed-but-unplaced vendors for an upcoming day.
- Open stalls before a near market day.
- Expiring / expired vendor documents (overlaps migration 0017 doc notifications).
- Overdue fees.
- A market day with no confirmed lineup.
- Pending category requests.

**Vendor**
- Incomplete profile (no cover/logo).
- Missing / expired documents.
- Unanswered schedule invites (pending status).
- Unpaid fees.

## Surfaces & routing

- **In-app (first):** per-role "Needs attention" panel + badge, computed client-side from existing
  reads. Routing = each check's `role` field decides which shell shows it.
- **Web Push (later):** reuse the existing push system for blocker-severity, time-sensitive checks
  (expiring docs, an unfilled day approaching).
- Severity drives styling: `blocker` (red, can't operate) vs `nudge` (amber, improve readiness).

## Reuse / leverage

- **AdminReadiness** already encodes vendor "done-done" checks — the vendor-role checks generalize from it.
- **Doc-expiry notifications** (migration 0017) already model an expiring-document alert.
- **Web Push** (migration 0021) is the delivery channel for the push tier.

## Suggested first slice (when resumed)

Owner + Admin **in-app** panel with ~4–6 checks (no market dates, unplaced vendors, open stalls,
pending apps/docs/fees), each with a CTA. Add vendor-role checks and the push tier afterward.

## Out of scope (for the first build)

- Email delivery.
- A persisted notifications table / read-state tracking (in-app is computed live; add persistence
  only if we need dismiss/snooze or push dedup).

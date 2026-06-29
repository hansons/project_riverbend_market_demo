import { useState } from 'react';
import {
  fetchVendors,
  fetchActiveMarket,
  fetchCurrentOfferings,
  fetchUpcomingEvents,
  fetchFeaturedForWeek,
  fetchFrontPageMarketDate,
} from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate } from '@/lib/router';
import { categoryEmoji, eventCategoryEmoji, thisSaturdayISO } from '@/lib/format';
import { pickWeeklyFeatured } from '@/lib/featured';
import { useVisitList } from '@/lib/visitList';
import type { MarketEvent, Vendor, VendorOffering } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function formatNextDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

const FALLBACK_HERO = 'https://images.unsplash.com/uxJ1Sb0nwYw?auto=format&fit=crop&w=900&q=80';

const WHY_LODESTONE = [
  { icon: '👥', title: 'Vendor Updates',  old: 'Texts, emails, spreadsheets',     next: 'Vendors self-update in real time' },
  { icon: '🗺️', title: 'Market Map',      old: 'Static PDFs and printed sheets',  next: 'Live map everyone can access' },
  { icon: '📣', title: 'Announcements',   old: 'Social media only',               next: 'Website, email, and vendor feed' },
  { icon: '📋', title: 'Applications',    old: 'Forms scattered everywhere',      next: 'One intake workflow for all vendors' },
  { icon: '💬', title: 'Communication',   old: 'Repeated DMs & phone calls',      next: 'One hub for info & updates' },
];

const MAP_ROWS = ['A', 'B', 'C', 'D'];
const MAP_COLS = 6;

export function PublicHome() {
  const { tenant } = useTheme();
  const visit = useVisitList();
  const [vendorQuery, setVendorQuery] = useState('');

  const { data: vendors }          = useAsync(fetchVendors, [], []);
  const { data: nextMarket }       = useAsync(fetchActiveMarket, [], null);
  const reference                  = thisSaturdayISO();
  const { data: frontPage }        = useAsync(() => fetchFrontPageMarketDate(todayISO()), [], null);
  const { data: fresh }            = useAsync(() => fetchCurrentOfferings(reference), [], []);
  const { data: events }           = useAsync<MarketEvent[]>(() => fetchUpcomingEvents(todayISO()), [], []);
  const { data: scheduledFeatured }= useAsync<Vendor[]>(() => fetchFeaturedForWeek(reference), [], []);

  const featured = scheduledFeatured.length
    ? scheduledFeatured
    : pickWeeklyFeatured(vendors.filter((v) => v.featured));

  const filteredFeatured = vendorQuery.trim()
    ? vendors
        .filter((v) =>
          `${v.name} ${v.category} ${v.tagline ?? ''}`.toLowerCase().includes(vendorQuery.toLowerCase()),
        )
        .slice(0, 6)
    : featured.slice(0, 6);

  type FreshItem = { o: VendorOffering; vendor: Vendor };
  const freshItems: FreshItem[] = fresh
    .map((o) => ({ o, vendor: vendors.find((v) => v.id === o.vendor_id) }))
    .filter((x): x is FreshItem => Boolean(x.vendor));

  const freshTags = freshItems.flatMap((fi) => fi.o.items).slice(0, 8);
  const upcomingEvents = (events as MarketEvent[]).slice(0, 2);
  const heroImg = tenant.banner_url || FALLBACK_HERO;
  const marketFirstWord = tenant.name?.split(' ')[0] ?? 'Riverbend';
  const nextDateLabel = frontPage?.dateISO ? formatNextDate(frontPage.dateISO) : null;

  return (
    <div>
      {/* ── Split hero ── */}
      <section className="border-b border-brand-line bg-gradient-to-br from-brand-primary/6 via-brand-paper to-brand-card">
        <div className="mx-auto grid max-w-content items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">📍 {tenant.region ?? 'Your local market'}</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
              A living digital hub<br />for local markets.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-muted">
              Vendors, weekly updates, events, and community connection — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => navigate('/vendors')} className="btn-primary">
                This Week at {marketFirstWord}
              </button>
              <button onClick={() => navigate('/markets')} className="btn-outline">
                Explore the Demo
              </button>
            </div>
            <p className="mt-6 text-sm text-brand-muted">
              Supporting local food. Strengthening community.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lift lg:aspect-auto lg:h-[400px]">
            <img src={heroImg} alt="Market produce" className="h-full w-full object-cover" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>

        {/* Next market date bar */}
        {nextDateLabel && nextMarket && (
          <div className="border-t border-brand-line bg-brand-primary-dark">
            <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-3 text-sm text-white">
              <span className="text-xl">📅</span>
              <span>
                <span className="font-semibold">Next Market: {nextDateLabel}</span>
                {nextMarket.hours && (
                  <span className="ml-2 text-white/75">{nextMarket.hours}</span>
                )}
                <span className="ml-2 text-white/50">· {nextMarket.name}</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Three-column content hub ── */}
      <section className="mx-auto grid max-w-content gap-6 px-4 py-10 lg:grid-cols-[220px_1fr_220px]">

        {/* Col 1: This Week */}
        <div className="card p-5">
          <h2 className="font-semibold text-brand-primary-dark">This Week at {marketFirstWord}</h2>
          <div className="mt-4 space-y-4 divide-y divide-brand-line text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">👥</span>
              <div>
                <p className="font-semibold text-brand-primary-dark">{vendors.length} vendors confirmed</p>
                <button
                  onClick={() => navigate('/vendors')}
                  className="text-xs text-brand-primary hover:underline"
                >
                  View the full vendor list →
                </button>
              </div>
            </div>
            {upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-3 pt-4">
                <span className="mt-0.5 text-xl">{eventCategoryEmoji(e.category)}</span>
                <div>
                  <p className="font-semibold text-brand-primary-dark">{e.title}</p>
                  {e.description && (
                    <p className="line-clamp-2 text-xs text-brand-muted">{e.description}</p>
                  )}
                </div>
              </div>
            ))}
            {freshTags.length > 0 && (
              <div className="flex items-start gap-3 pt-4">
                <span className="mt-0.5 text-xl">🌿</span>
                <div>
                  <p className="font-semibold text-brand-primary-dark">Fresh picks this week</p>
                  <p className="line-clamp-2 text-xs text-brand-muted">
                    {freshTags.join(', ')}{freshItems.length > 4 ? ', and more' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/markets')}
            className="btn-outline mt-5 w-full text-sm"
          >
            View Full Schedule
          </button>
        </div>

        {/* Col 2: Featured Vendors */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-brand-primary-dark">Featured Vendors</h2>
            <button onClick={() => navigate('/vendors')} className="btn-ghost text-sm">
              Browse all vendors →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredFeatured.map((v) => {
              const added = visit.has(v.slug);
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => visit.toggle(v.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      visit.toggle(v.slug);
                    }
                  }}
                  aria-pressed={added}
                  className={`card group cursor-pointer overflow-hidden transition hover:shadow-lift ${added ? 'ring-2 ring-brand-primary' : ''}`}
                >
                  <div className="relative aspect-square overflow-hidden bg-brand-paper">
                    {v.image_url ? (
                      <img
                        src={v.image_url}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        {categoryEmoji(v.category)}
                      </div>
                    )}
                    {v.logo_url && (
                      <div className="absolute bottom-1.5 left-1.5 h-8 w-8 overflow-hidden rounded-md border border-white/80 bg-white shadow">
                        <img src={v.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                      </div>
                    )}
                    <span
                      className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition ${
                        added ? 'bg-brand-primary text-white' : 'bg-white/85 text-brand-ink/70 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {added ? '✓' : '+'}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold leading-tight text-brand-primary-dark">{v.name}</p>
                    {v.tagline && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-brand-muted">{v.tagline}</p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/vendor/${v.slug}`); }}
                      className="mt-1 text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="search"
              placeholder="Search vendors…"
              value={vendorQuery}
              onChange={(e) => setVendorQuery(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <button onClick={() => navigate('/vendors')} className="btn-outline shrink-0 text-sm">
              All vendors
            </button>
          </div>
        </div>

        {/* Col 3: Market Map preview */}
        <div className="card p-5">
          <h2 className="font-semibold text-brand-primary-dark">Market Map</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-brand-line bg-brand-paper p-2">
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)` }}
            >
              {MAP_ROWS.flatMap((row) =>
                Array.from({ length: MAP_COLS }, (_, i) => {
                  const stall = `${row}${i + 1}`;
                  return (
                    <div
                      key={stall}
                      className="flex aspect-square items-center justify-center rounded bg-brand-primary/10 text-[8px] font-semibold text-brand-primary-dark"
                    >
                      {stall}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { emoji: 'ℹ️', label: 'Info Booth' },
              { emoji: '🚻', label: 'Restrooms' },
              { emoji: '🍽️', label: 'Food Area' },
              { emoji: '🎵', label: 'Live Music' },
              { emoji: '💳', label: 'SNAP/EBT' },
              { emoji: '🅿️', label: 'Parking' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-brand-ink">
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/markets')}
            className="btn-outline mt-4 w-full text-sm"
          >
            View full map →
          </button>
        </div>
      </section>

      {/* ── For Vendors / For Organizers ── */}
      <section className="border-y border-brand-line bg-brand-card">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-12 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-line bg-brand-paper p-6">
            <h2 className="text-xl font-semibold text-brand-primary-dark">For Vendors</h2>
            <p className="mt-1 text-sm text-brand-muted">Everything you need to manage your participation.</p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Update your products & photos',
                'Confirm attendance each week',
                'View booth assignment & map',
                'Connect with market staff',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-brand-ink">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/apply')} className="btn-primary text-sm">
                Vendor Login
              </button>
              <button onClick={() => navigate('/apply')} className="btn-outline text-sm">
                Apply to Be a Vendor
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6">
            <h2 className="text-xl font-semibold text-brand-primary-dark">For Organizers</h2>
            <p className="mt-1 text-sm text-brand-muted">Run your market, not spreadsheets.</p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Vendor management & applications',
                'Booth map & assignments',
                'Announcements & alerts',
                'Reports, analytics & more',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-brand-ink">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/markets')} className="btn-primary text-sm">
                Organizer Login
              </button>
              <button onClick={() => navigate('/vendors')} className="btn-outline text-sm">
                See Platform Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Lodestone ── */}
      <section className="mx-auto max-w-content px-4 py-14">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-brand-primary-dark">
              Why Lodestone for Farmers Markets?
            </h2>
            <p className="mt-1 text-brand-muted">Replace scattered tools with one connected platform.</p>
          </div>
          <div className="max-w-xs rounded-xl border border-brand-line bg-brand-card p-4 text-sm">
            <p className="font-semibold text-brand-ink">Demo Mode</p>
            <p className="mt-1 text-xs text-brand-muted">
              This is a fictional farmers market website showing how Lodestone can power a local market
              website, vendor directory, weekly updates, and organizer workflows.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {WHY_LODESTONE.map((w) => (
            <div key={w.title} className="rounded-xl border border-brand-line bg-brand-card p-4">
              <div className="text-2xl">{w.icon}</div>
              <p className="mt-2 text-sm font-semibold text-brand-primary-dark">{w.title}</p>
              <p className="mt-1 text-xs text-brand-muted line-through opacity-60">{w.old}</p>
              <p className="mt-1 text-xs font-medium text-brand-ink">
                <span className="text-brand-primary">Lodestone:</span> {w.next}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { VisitListProvider } from '@/lib/visitList';
import { useHashRoute } from '@/lib/router';
import { useTheme } from '@/theme/ThemeProvider';
import { PublicHome } from './PublicHome';
import { PublicHomeAlt } from './PublicHomeAlt';
import { VendorBrowse } from './VendorBrowse';
import { VendorDetail } from './VendorDetail';
import { MarketInfo } from './MarketInfo';
import { ApplyForm } from './ApplyForm';
import { EventsPage } from './EventsPage';
import { AnnouncementBanner } from './AnnouncementBanner';

const NAV = [
  { to: '/', label: 'This Week' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/markets', label: 'Map' },
  { to: '/events', label: 'Events' },
  { to: '/apply', label: 'For Vendors' },
];

const HOME_VARIANT_KEY = 'rbm.homeVariant';

export function PublicShell() {
  const [path, go] = useHashRoute();
  const { tenant } = useTheme();
  const [homeAlt, setHomeAlt] = useState(() => {
    try {
      return localStorage.getItem(HOME_VARIANT_KEY) === 'alt';
    } catch {
      return false;
    }
  });

  function toggleHome() {
    setHomeAlt((v) => {
      const next = !v;
      try {
        localStorage.setItem(HOME_VARIANT_KEY, next ? 'alt' : 'classic');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const vendorMatch = path.match(/^\/vendor\/([^/]+)$/);

  let view = homeAlt ? <PublicHomeAlt /> : <PublicHome />;
  if (vendorMatch) view = <VendorDetail slug={decodeURIComponent(vendorMatch[1])} />;
  else if (path.startsWith('/vendors')) view = <VendorBrowse />;
  else if (path.startsWith('/markets')) view = <MarketInfo />;
  else if (path.startsWith('/events')) view = <EventsPage />;
  else if (path.startsWith('/apply')) view = <ApplyForm />;

  const isActive = (to: string) =>
    to === '/' ? path === '/' : path.startsWith(to) || (to === '/vendors' && path.startsWith('/vendor/'));

  return (
    <VisitListProvider>
      <div>
      <nav className="border-b border-brand-line bg-brand-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <button onClick={() => go('/')} className="flex items-center gap-2.5 text-left">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-contain sm:h-10 sm:w-10"
              />
            )}
            <span>
              <span className="block font-serif text-base font-semibold leading-none text-brand-primary-dark sm:text-lg">
                {tenant.name}
              </span>
              {tenant.tagline && (
                <span className="mt-0.5 hidden text-xs text-brand-muted sm:block">{tenant.tagline}</span>
              )}
            </span>
          </button>
          <div className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.to}
                onClick={() => go(n.to)}
                className={[
                  'rounded-full px-3 py-1.5 text-sm font-medium transition',
                  isActive(n.to)
                    ? 'bg-brand-primary/10 text-brand-primary-dark'
                    : 'text-brand-ink/70 hover:bg-brand-primary/5',
                ].join(' ')}
              >
                {n.label}
              </button>
            ))}
            <button
              onClick={() => go('/apply')}
              className="ml-2 rounded-full bg-brand-primary px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-primary-dark"
            >
              Vendor Login
            </button>
          </div>
        </div>
      </nav>

      <AnnouncementBanner />

      {view}

      {path === '/' && (
        <button
          onClick={toggleHome}
          title="Demo: switch home page layout"
          className="fixed bottom-4 right-4 z-40 rounded-full border border-brand-line bg-brand-card px-3 py-2 text-xs font-semibold text-brand-ink shadow-lift transition hover:bg-brand-paper"
        >
          Layout: {homeAlt ? 'Editorial' : 'Classic'} · switch
        </button>
      )}

      <footer className="mt-16 border-t border-brand-line bg-brand-card pb-20">
        {/* Market info strip */}
        <div className="border-b border-brand-line bg-brand-paper">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 text-xs text-brand-muted">
            <span>🏛️ Managed by Riverbend Market Association</span>
            <span>💳 SNAP/EBT Accepted</span>
            <span>☔ Rain or shine unless posted</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-6 text-sm text-brand-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {tenant.name}
            {tenant.region ? ` · ${tenant.region}` : ''}
          </span>
          <span className="text-xs">
            A fictional market built as a live demo by{' '}
            <span className="font-semibold text-brand-primary-dark">Lodestone Consulting</span>.
          </span>
        </div>
      </footer>

      {/* Sticky bottom CTA — visible on home page only */}
      {path === '/' && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-brand-line bg-brand-primary-dark text-white shadow-lift">
          <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">See how Lodestone can help your market thrive.</p>
              <p className="hidden truncate text-xs text-white/70 sm:block">
                Book a personalized demo for your team.
              </p>
            </div>
            <button className="shrink-0 rounded-full bg-brand-accent px-4 py-2 text-sm font-bold text-brand-ink transition hover:opacity-90">
              Book a Demo
            </button>
          </div>
        </div>
      )}
      </div>
    </VisitListProvider>
  );
}

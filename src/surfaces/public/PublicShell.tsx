import { useState } from 'react';
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
  { to: '/', label: 'Home' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/events', label: 'Events' },
  { to: '/markets', label: 'Visit' },
  { to: '/apply', label: 'Sell with us' },
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

      <footer className="mt-16 border-t border-brand-line bg-brand-card">
        <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-8 text-sm text-brand-muted sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}

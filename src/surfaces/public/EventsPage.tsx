import { fetchUpcomingEvents } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate } from '@/lib/router';
import { eventCategoryEmoji, formatDate } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { MarketEvent } from '@/lib/types';

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function EventsPage() {
  const { tenant } = useTheme();
  const { data: events, loading } = useAsync(() => fetchUpcomingEvents(todayISO()), [], []);

  // Group upcoming events by date for a clean timeline.
  const byDate = new Map<string, MarketEvent[]>();
  for (const e of events) {
    (byDate.get(e.date) ?? byDate.set(e.date, []).get(e.date)!).push(e);
  }
  const dates = [...byDate.keys()].sort();

  return (
    <div>
      {/* Hero — distinct from the shopper home hero */}
      <section className="relative overflow-hidden border-b border-brand-line bg-gradient-to-b from-brand-primary/10 to-brand-paper">
        <div className="mx-auto max-w-content px-4 py-16 sm:py-20">
          <p className="eyebrow">{tenant.name}</p>
          <h1 className="mt-2 max-w-3xl text-4xl leading-tight sm:text-5xl">News &amp; Events</h1>
          <p className="mt-4 max-w-xl text-lg text-brand-muted">
            Cooking demos, gardening workshops, kids’ activities, and community partners — there’s always
            something happening at the market.
          </p>
        </div>
      </section>

      {/* Learning Takes Root */}
      <section className="mx-auto max-w-content px-4 py-10">
        <div className="card p-6">
          <p className="eyebrow">For community partners</p>
          <h2 className="mt-1 text-xl">Learning Takes Root</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Our markets are community gathering spaces and places of informal learning. We offer a limited
            amount of space to events and activities on most market days — nonprofits, schools, libraries,
            health and gardening groups, and local artists are all welcome. Interested in hosting?{' '}
            <button onClick={() => navigate('/markets')} className="font-semibold text-brand-primary underline">
              Get in touch with the market office.
            </button>
          </p>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="mx-auto max-w-content px-4 pb-16">
        <h2 className="text-2xl">Upcoming events</h2>
        {loading ? (
          <div className="mt-5 h-48 animate-pulse rounded-2xl bg-brand-card" />
        ) : !events.length ? (
          isSupabaseConfigured ? (
            <p className="mt-3 text-brand-muted">No upcoming events posted yet — check back soon.</p>
          ) : (
            <div className="mt-4">
              <SetupNotice />
            </div>
          )
        ) : (
          <div className="mt-6 space-y-8">
            {dates.map((date) => (
              <div key={date}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-accent">
                  {formatDate(date)}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {byDate.get(date)!.map((e) => (
                    <EventCard key={e.id} e={e} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({ e }: { e: MarketEvent }) {
  return (
    <div className={`card p-5 ${e.featured ? 'ring-1 ring-brand-accent' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="chip">
          {eventCategoryEmoji(e.category)} {e.category ?? 'Event'}
        </span>
        <span className="text-xs text-brand-muted">{e.markets?.name ?? 'Market'}</span>
      </div>
      <h4 className="mt-2 text-base font-semibold text-brand-primary-dark">{e.title}</h4>
      {e.description && <p className="mt-1 text-sm text-brand-muted">{e.description}</p>}
    </div>
  );
}

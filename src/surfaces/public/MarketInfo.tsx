import { fetchMarkets } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SetupNotice } from '@/components/SetupNotice';

const GOOD_TO_KNOW = [
  { icon: '🅿️', title: 'Parking', body: 'Free 2-hour lots on Jackson & 2nd; bike valet at the south gate.' },
  { icon: '🐕', title: 'Leashed dogs', body: 'Well-behaved, leashed pups are welcome throughout the market.' },
  { icon: '💳', title: 'SNAP & Double Up', body: 'Visit the info booth to swipe your card — we match SNAP up to $20.' },
];

export function MarketInfo() {
  const { data: markets, loading } = useAsync(fetchMarkets, [], []);
  const { tenant } = useTheme();

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <p className="eyebrow">Plan your visit</p>
      <h1 className="text-3xl">Market days &amp; hours</h1>
      <p className="mt-1 max-w-xl text-brand-muted">
        {tenant.name} runs throughout the year. Here’s where and when to find us.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-brand-card" />)
        ) : !markets.length ? (
          isSupabaseConfigured ? (
            <p className="text-brand-muted">Market schedule coming soon.</p>
          ) : (
            <div className="md:col-span-3">
              <SetupNotice />
            </div>
          )
        ) : (
          markets.map((m) => (
            <div key={m.id} className="card flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary-dark">
                  {m.day_of_week}
                </span>
                <span className="text-xs text-brand-muted">{m.season}</span>
              </div>
              <h2 className="mt-3 text-xl">{m.name}</h2>
              <p className="mt-1 text-sm font-medium text-brand-ink">{m.hours}</p>
              <p className="mt-1 text-sm text-brand-muted">📍 {m.location}</p>
              {m.blurb && <p className="mt-3 text-sm text-brand-ink/80">{m.blurb}</p>}
            </div>
          ))
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl">Good to know</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {GOOD_TO_KNOW.map((g) => (
            <div key={g.title} className="flex gap-3">
              <span className="text-2xl">{g.icon}</span>
              <div>
                <h3 className="text-base">{g.title}</h3>
                <p className="mt-1 text-sm text-brand-muted">{g.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

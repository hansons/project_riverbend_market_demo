import { fetchSeasonality } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { currentMonth, seasonStyle } from '@/lib/format';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SeasonStrip() {
  const { data: items, loading } = useAsync(fetchSeasonality, [], []);
  const month = currentMonth();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-brand-card" />;
  }
  if (!items.length) {
    return isSupabaseConfigured ? null : <SetupNotice />;
  }

  // Items at peak/ending this month first, then upcoming.
  const sorted = [...items].sort((a, b) => {
    const aNow = a.months.includes(month) ? 0 : 1;
    const bNow = b.months.includes(month) ? 0 : 1;
    return aNow - bNow || a.sort - b.sort;
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {sorted.map((s) => {
        const style = seasonStyle(s.status);
        return (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{s.emoji ?? '🌿'}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
                {style.label}
              </span>
            </div>
            <p className="mt-2 font-semibold text-brand-ink">{s.item}</p>
            <p className="text-xs text-brand-muted">{s.note ?? s.category}</p>
          </div>
        );
      })}
    </div>
  );
}

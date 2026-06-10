import { useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { useAsync } from '@/lib/useAsync';
import { fetchThemes, applyThemeToActive } from '@/lib/tenant';
import type { Brand, Theme } from '@/lib/types';

const SWATCH_KEYS: (keyof Brand)[] = ['primary', 'accent', 'berry', 'primary-dark', 'ink'];

// Apply a brand palette to the active market and persist it. Used by both the
// Market Admin (Appearance) and the Platform Owner (Branding).
export function ThemePicker() {
  const { tenant, reload } = useTheme();
  const { data: themes, loading } = useAsync(fetchThemes, [], []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(t: Theme) {
    setBusy(t.id);
    setError(null);
    const err = await applyThemeToActive(t.brand);
    if (err) {
      setError(err);
      setBusy(null);
      return;
    }
    await reload(); // refetch active tenant → re-applies the new palette everywhere
    setBusy(null);
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-brand-card" />;
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => {
          const isCurrent = t.brand.primary === tenant.brand.primary;
          return (
            <div key={t.id} className={`card p-4 ${isCurrent ? 'ring-2 ring-brand-accent' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-brand-primary-dark">{t.name}</p>
                {isCurrent && <span className="chip">Live</span>}
              </div>
              <div className="mt-2 flex gap-1.5">
                {SWATCH_KEYS.map((k) => (
                  <span
                    key={k}
                    title={k}
                    className="h-7 w-7 rounded-full border border-brand-line"
                    style={t.brand[k] ? { backgroundColor: `rgb(${t.brand[k]})` } : undefined}
                  />
                ))}
              </div>
              <button
                className="btn-primary mt-3 w-full"
                disabled={busy === t.id || isCurrent}
                onClick={() => apply(t)}
              >
                {busy === t.id ? 'Applying…' : isCurrent ? 'Current' : 'Apply'}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-status-alert">{error}</p>}
    </div>
  );
}

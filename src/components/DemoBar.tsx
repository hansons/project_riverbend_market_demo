import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { enterAs, PERSONAS, personaForRole, type DemoPersona } from '@/lib/demo';
import { navigate } from '@/lib/router';

// The persistent "this is a Lodestone demo" bar with the one-click persona
// switcher. Switching personas signs into a real seeded account, so the surface
// that renders below is gated by genuine Row-Level Security.
export function DemoBar() {
  const { profile } = useAuth();
  const active = personaForRole(profile?.role);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(p: DemoPersona) {
    if (p.key === active.key && busy === null) {
      if (p.key === 'shopper') navigate('/');
      return;
    }
    setBusy(p.key);
    setError(null);
    const err = await enterAs(p);
    if (err) setError(err);
    else if (p.key === 'shopper') navigate('/');
    setBusy(null);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-brand-primary-dark text-white/95">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-semibold tracking-tight">Lodestone</span>
          <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide sm:inline">
            Live capability demo
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <span className="mr-1 hidden text-xs text-white/70 md:inline">View as</span>
          {PERSONAS.map((p) => {
            const isActive = p.key === active.key;
            const disabled = !isSupabaseConfigured && p.key !== 'shopper';
            return (
              <button
                key={p.key}
                onClick={() => pick(p)}
                disabled={disabled || busy !== null}
                title={disabled ? 'Connect Supabase to enable signed-in roles' : p.blurb}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  isActive
                    ? 'bg-brand-accent text-brand-ink'
                    : 'bg-white/10 text-white/90 hover:bg-white/20',
                  disabled ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                <span className="mr-1">{p.emoji}</span>
                {busy === p.key ? 'Entering…' : p.label}
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <div className="bg-status-alert/90 px-4 py-1 text-center text-xs text-white">
          Couldn’t switch persona: {error}. Have you run the seed steps in the README?
        </div>
      )}
    </header>
  );
}

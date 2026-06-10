import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { enterAs, PERSONAS, personaForRole, type DemoPersona } from '@/lib/demo';
import { navigate } from '@/lib/router';

// The persistent "this is a Lodestone demo" bar with the one-click persona
// switcher. Switching personas signs into a real seeded account, so the surface
// that renders below is gated by genuine Row-Level Security.
export function DemoBar({ onAbout }: { onAbout: () => void }) {
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
      <div className="mx-auto flex max-w-content items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-serif text-base font-semibold tracking-tight">Lodestone</span>
          <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide sm:inline">
            Live demo
          </span>
          <button
            onClick={onAbout}
            title="About this demo"
            className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-xs hover:bg-white/20"
          >
            ⓘ
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          <span className="mr-1 hidden text-xs text-white/70 lg:inline">View as</span>
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
                  'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition',
                  isActive ? 'bg-brand-accent text-brand-ink' : 'bg-white/10 text-white/90 hover:bg-white/20',
                  disabled ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                <span>{p.emoji}</span>
                <span>{busy === p.key ? '…' : p.short}</span>
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

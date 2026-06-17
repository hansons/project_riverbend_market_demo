import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// A shopper's "visit list" — the vendors they've tapped to build a route for
// their market trip. Stored by vendor slug, persisted to localStorage so it
// survives navigation and reloads. Used by the cards/chips (to toggle) and the
// inline VisitPanel (to render the highlighted site map).

const KEY = 'rbm.visitList';

type VisitCtx = {
  slugs: string[];
  count: number;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const Ctx = createContext<VisitCtx | null>(null);

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function VisitListProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(slugs));
    } catch {
      /* ignore */
    }
  }, [slugs]);

  const value = useMemo<VisitCtx>(
    () => ({
      slugs,
      count: slugs.length,
      has: (slug) => slugs.includes(slug),
      toggle: (slug) => setSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug])),
      remove: (slug) => setSlugs((cur) => cur.filter((s) => s !== slug)),
      clear: () => setSlugs([]),
    }),
    [slugs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVisitList(): VisitCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVisitList must be used within VisitListProvider');
  return ctx;
}

import { PERSONAS } from '@/lib/demo';
import { useTheme } from '@/theme/ThemeProvider';

// First-visit framing: tells a cold visitor what this is, how to explore it as
// four roles, and that it's a real (not mocked) system. Re-openable from the bar.
export function IntroOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant } = useTheme();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div className="card my-auto w-full max-w-lg p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">A live capability demo by Lodestone Consulting</p>
        <h2 className="mt-1 text-2xl">{tenant.name}</h2>
        <p className="mt-2 text-sm text-brand-muted">
          A real, database-secured web app — not a clickable mockup. Explore the same market as four
          different roles using the bar at the top:
        </p>

        <ul className="mt-4 space-y-2.5">
          {PERSONAS.map((p) => (
            <li key={p.key} className="flex items-start gap-3 text-sm">
              <span className="text-lg leading-none">{p.emoji}</span>
              <span>
                <span className="font-semibold text-brand-ink">{p.label}</span>
                <span className="text-brand-muted"> — {p.blurb}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-brand-paper px-3 py-2 text-xs text-brand-muted">
          🔒 Each role signs into a real account, and the <strong>database</strong> — not the app —
          decides what it can see. A vendor genuinely can’t read another vendor’s data.
        </p>

        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          Start exploring →
        </button>
        <p className="mt-3 text-center text-xs text-brand-muted">
          Built by <span className="font-semibold text-brand-primary-dark">Lodestone Consulting</span> on
          Supabase + Cloudflare.
        </p>
      </div>
    </div>
  );
}

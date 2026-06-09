import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

// Stands in for the vendor / admin / platform surfaces until their slices land.
// It still proves the end-to-end auth plumbing: you're in a real RLS-gated
// session, and the role determines what renders.
const SURFACES: Record<string, { title: string; emoji: string; slice: string; coming: string[] }> = {
  vendor: {
    title: 'Vendor Portal',
    emoji: '🌾',
    slice: 'Slice 2',
    coming: [
      'Edit your farm profile & story',
      'Post this week’s “what I have” + photos',
      'Confirm or decline upcoming market dates',
      'View fees & invoices',
      'Message the market staff',
    ],
  },
  admin: {
    title: 'Market Admin',
    emoji: '🛠️',
    slice: 'Slice 3',
    coming: [
      'Review the vendor application queue',
      'Manage vendors & their status',
      'Drag-and-drop stall assignment',
      'Broadcast comms to vendor cohorts',
      'Attendance & revenue reports',
    ],
  },
  owner: {
    title: 'Platform Owner',
    emoji: '⚙️',
    slice: 'Slice 4',
    coming: [
      'Live re-skin: switch the whole brand instantly',
      'Configure tenant identity & content',
      'Manage roles and access',
      'See the platform behind every market',
    ],
  },
};

export function SurfacePlaceholder({ surface }: { surface: 'vendor' | 'admin' | 'owner' }) {
  const { profile } = useAuth();
  const { tenant } = useTheme();
  const s = SURFACES[surface];

  return (
    <div className="mx-auto max-w-content px-4 py-12">
      <div className="card mx-auto max-w-2xl p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary/10 text-2xl">
            {s.emoji}
          </span>
          <div>
            <p className="eyebrow">{tenant.name}</p>
            <h1 className="text-2xl">{s.title}</h1>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-brand-line bg-brand-paper p-4 text-sm">
          <p className="font-semibold text-brand-primary-dark">✓ You’re in a real, RLS-gated session.</p>
          <p className="mt-1 text-brand-muted">
            Signed in as <span className="font-medium text-brand-ink">{profile?.full_name}</span>{' '}
            ({profile?.email}) — role <span className="font-mono">{profile?.role}</span>. The database
            only returns rows this role is allowed to see.
          </p>
        </div>

        <div className="mt-6">
          <p className="field-label">Arriving in {s.slice}</p>
          <ul className="mt-2 space-y-1.5">
            {s.coming.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-brand-ink">
                <span className="mt-0.5 text-brand-accent">◆</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs text-brand-muted">
          Use the bar above to tour another role — each one signs into a different seeded account.
        </p>
      </div>
    </div>
  );
}

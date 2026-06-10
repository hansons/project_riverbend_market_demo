import { useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { resetDemo } from '@/lib/platform';
import type { Brand, Tenant } from '@/lib/types';

type Section = 'branding' | 'reset' | 'about';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'branding', label: 'Branding', icon: '🎨' },
  { key: 'reset', label: 'Demo controls', icon: '♻️' },
  { key: 'about', label: 'The platform', icon: '⚙️' },
];

export function PlatformShell() {
  const { tenant } = useTheme();
  const [section, setSection] = useState<Section>('branding');

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Lodestone · Platform Owner</p>
          <h1 className="text-2xl">{tenant.name}</h1>
        </div>
        <span className="chip">⚙️ Platform Owner</span>
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-[210px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={[
                'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition md:w-full',
                section === s.key ? 'bg-brand-primary text-white' : 'text-brand-ink/75 hover:bg-brand-primary/10',
              ].join(' ')}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {section === 'branding' && <Branding />}
          {section === 'reset' && <ResetSection />}
          {section === 'about' && <About />}
        </div>
      </div>
    </div>
  );
}

function Branding() {
  const { tenant, tenants, preview, reload } = useTheme();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl">Live re-skin</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Switch the whole app’s brand instantly — it’s all config, not a rebuild. This previews for
          <strong> your session only</strong>; it doesn’t change what visitors see. “Reset to default”
          restores the saved brand.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tenants.map((t) => (
          <BrandCard key={t.id} t={t} active={t.slug === tenant.slug} onApply={() => preview(t)} />
        ))}
      </div>
      <button className="btn-ghost -ml-3" onClick={() => reload()}>↺ Reset to default</button>
    </div>
  );
}

function BrandCard({ t, active, onApply }: { t: Tenant; active: boolean; onApply: () => void }) {
  const keys: (keyof Brand)[] = ['primary', 'primary-dark', 'accent', 'berry', 'ink'];
  return (
    <div className={`card p-5 ${active ? 'ring-2 ring-brand-accent' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-lg font-semibold text-brand-primary-dark">{t.name}</p>
          <p className="text-xs text-brand-muted">{t.region}</p>
        </div>
        {active && <span className="chip">Showing now</span>}
      </div>
      <div className="mt-3 flex gap-1.5">
        {keys.map((k) => (
          <span
            key={k}
            title={k}
            className="h-6 w-6 rounded-full border border-brand-line"
            style={t.brand[k] ? { backgroundColor: `rgb(${t.brand[k]})` } : undefined}
          />
        ))}
      </div>
      <button className="btn-primary mt-4" onClick={onApply} disabled={active}>
        {active ? 'Active' : 'Preview this brand'}
      </button>
    </div>
  );
}

function ResetSection() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (
      !window.confirm(
        'Reset the demo to its original state? This clears visitor edits, new applications, messages, and category requests.',
      )
    )
      return;
    setBusy(true);
    setError(null);
    const err = await resetDemo();
    setBusy(false);
    if (err) setError(err);
    else {
      setDone(true);
      setTimeout(() => window.location.reload(), 900);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl">Demo controls</h2>
      <div className="card p-6">
        <p className="font-semibold text-brand-primary-dark">Reset demo data</p>
        <p className="mt-1 text-sm text-brand-muted">
          Restores vendors, stand lists, schedule, fees, messages, announcements, and category requests
          to the original seed, and removes visitor-submitted applications. Great before showing the demo
          to someone new. <span className="text-brand-muted/80">(Uploaded photos in Storage aren’t purged.)</span>
        </p>
        <button
          className="btn-primary mt-4"
          onClick={run}
          disabled={busy || done}
        >
          {busy ? 'Resetting…' : done ? '✓ Reset — reloading…' : 'Reset demo data'}
        </button>
        {error && <p className="mt-2 text-sm text-status-alert">{error}</p>}
      </div>
    </div>
  );
}

const PLATFORM_POINTS = [
  {
    icon: '🧱',
    title: 'The stack',
    body: 'A React + Vite single-page app served from Cloudflare’s global CDN, backed by Supabase (Postgres + Auth + Storage). No servers to babysit, scales to zero when idle.',
  },
  {
    icon: '🔑',
    title: 'You own it',
    body: 'The data lives in your own Supabase project and the code in your own GitHub repo. No lock-in — export the database or move the code anytime.',
  },
  {
    icon: '🛡️',
    title: 'Security by default',
    body: 'Every table is gated by database Row-Level Security. A vendor can only ever read or write their own rows — the database enforces it, not the app, so a bug in the UI can’t leak data.',
  },
  {
    icon: '🎨',
    title: 'One platform, many markets',
    body: 'The brand switch on the Branding tab is configuration, not a rebuild. The same codebase re-skins per market — a true multi-tenant platform.',
  },
  {
    icon: '💸',
    title: 'Runs lean',
    body: 'At this scale it sits on free tiers (Cloudflare Pages + Supabase) — roughly $0–25/month — versus the $3–7k/year of stitched-together SaaS subscriptions.',
  },
];

function About() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl">What you’d own</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Everything you’ve clicked through is real — here’s what’s under it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORM_POINTS.map((p) => (
          <div key={p.title} className="card p-5">
            <div className="text-2xl">{p.icon}</div>
            <h3 className="mt-2 text-base">{p.title}</h3>
            <p className="mt-1 text-sm text-brand-muted">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="card border-brand-accent bg-brand-primary/5 p-5">
        <p className="text-sm text-brand-ink">
          Built by <span className="font-semibold text-brand-primary-dark">Lodestone Consulting</span>.
          Want a platform like this for your organization? This whole demo — public site, vendor portal,
          admin console — is the kind of system we build on Supabase + Cloudflare.
        </p>
      </div>
    </div>
  );
}

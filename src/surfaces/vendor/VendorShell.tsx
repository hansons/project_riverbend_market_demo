import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useAsync } from '@/lib/useAsync';
import { useKeyNav } from '@/lib/useKeyNav';
import { fetchVendorById } from '@/lib/vendorData';
import { VendorDashboard } from './VendorDashboard';
import { VendorProfile } from './VendorProfile';
import { VendorProducts } from './VendorProducts';
import { VendorOfferings } from './VendorOfferings';
import { VendorSchedule } from './VendorSchedule';
import { VendorFees } from './VendorFees';
import { VendorDocuments } from './VendorDocuments';
import { VendorTokens } from './VendorTokens';
import { VendorMessages } from './VendorMessages';

export type VendorSection =
  | 'dashboard'
  | 'profile'
  | 'products'
  | 'offerings'
  | 'schedule'
  | 'documents'
  | 'fees'
  | 'tokens'
  | 'messages';

const SECTIONS: { key: VendorSection; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'profile', label: 'My Profile', icon: '🌱' },
  { key: 'products', label: 'Stand List', icon: '🥕' },
  { key: 'offerings', label: 'Weekly Offerings', icon: '🧺' },
  { key: 'schedule', label: 'Schedule', icon: '🗓️' },
  { key: 'documents', label: 'Documents', icon: '📄' },
  { key: 'fees', label: 'Fees', icon: '💳' },
  { key: 'tokens', label: 'Token Sales', icon: '🪙' },
  { key: 'messages', label: 'Messages', icon: '✉️' },
];

export function VendorShell() {
  const { profile } = useAuth();
  const vendorId = profile?.vendor_id ?? '';
  const { data: vendor, loading, reload } = useAsync(
    () => (vendorId ? fetchVendorById(vendorId) : Promise.resolve(null)),
    [vendorId],
    null,
  );
  const [section, setSection] = useState<VendorSection>('dashboard');

  // W/S (and ↑/↓) move between the left-rail sections.
  const sectionIdx = SECTIONS.findIndex((s) => s.key === section);
  useKeyNav({
    length: SECTIONS.length,
    index: sectionIdx,
    onIndex: (i) => setSection(SECTIONS[i].key),
    prevKeys: ['w', 'arrowup'],
    nextKeys: ['s', 'arrowdown'],
    enabled: !!vendor,
  });

  if (!vendorId) {
    return (
      <div className="mx-auto max-w-content px-4 py-12">
        <div className="card mx-auto max-w-lg p-6 text-sm text-brand-muted">
          This account isn’t linked to a vendor. (The demo’s <code>vendor@</code> persona is linked
          to Fern Hollow Farm by <code>npm run seed:users</code>.)
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="mx-auto max-w-content px-4 py-12"><div className="h-64 animate-pulse rounded-2xl bg-brand-card" /></div>;
  }
  if (!vendor) {
    return <div className="mx-auto max-w-content px-4 py-12 text-brand-muted">Vendor record not found.</div>;
  }

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Vendor Portal</p>
          <h1 className="text-2xl">{vendor.name}</h1>
        </div>
        <span className="chip">
          {vendor.status === 'active' ? '🟢 Active vendor' : `Status: ${vendor.status}`}
        </span>
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-[210px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={[
                'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition md:w-full',
                section === s.key
                  ? 'bg-brand-primary text-white'
                  : 'text-brand-ink/75 hover:bg-brand-primary/10',
              ].join(' ')}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {section === 'dashboard' && <VendorDashboard vendor={vendor} onGo={setSection} />}
          {section === 'profile' && <VendorProfile vendor={vendor} onSaved={reload} />}
          {section === 'products' && <VendorProducts vendor={vendor} />}
          {section === 'offerings' && <VendorOfferings vendor={vendor} />}
          {section === 'schedule' && <VendorSchedule vendor={vendor} />}
          {section === 'documents' && <VendorDocuments vendor={vendor} />}
          {section === 'fees' && <VendorFees vendor={vendor} />}
          {section === 'tokens' && <VendorTokens vendor={vendor} />}
          {section === 'messages' && <VendorMessages vendor={vendor} />}
        </div>
      </div>
    </div>
  );
}

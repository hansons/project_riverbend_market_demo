import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { AdminDashboard } from './AdminDashboard';
import { AdminApplications } from './AdminApplications';
import { AdminVendors } from './AdminVendors';
import { AdminCategories } from './AdminCategories';
import { AdminStalls } from './AdminStalls';
import { AdminAnnouncements } from './AdminAnnouncements';
import { AdminReports } from './AdminReports';

export type AdminSection =
  | 'dashboard'
  | 'applications'
  | 'vendors'
  | 'categories'
  | 'stalls'
  | 'announcements'
  | 'reports';

const SECTIONS: { key: AdminSection; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'applications', label: 'Applications', icon: '📥' },
  { key: 'vendors', label: 'Vendors', icon: '🧑‍🌾' },
  { key: 'categories', label: 'Categories', icon: '🏷️' },
  { key: 'stalls', label: 'Stall Map', icon: '🗺️' },
  { key: 'announcements', label: 'Announcements', icon: '📣' },
  { key: 'reports', label: 'Reports', icon: '📊' },
];

export function AdminShell() {
  const { profile } = useAuth();
  const { tenant } = useTheme();
  const [section, setSection] = useState<AdminSection>('dashboard');

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{tenant.name} · Staff</p>
          <h1 className="text-2xl">Market Admin</h1>
        </div>
        <span className="chip">🛠️ {profile?.full_name ?? 'Admin'}</span>
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
          {section === 'dashboard' && <AdminDashboard onGo={setSection} />}
          {section === 'applications' && <AdminApplications />}
          {section === 'vendors' && <AdminVendors />}
          {section === 'categories' && <AdminCategories />}
          {section === 'stalls' && <AdminStalls />}
          {section === 'announcements' && <AdminAnnouncements />}
          {section === 'reports' && <AdminReports />}
        </div>
      </div>
    </div>
  );
}

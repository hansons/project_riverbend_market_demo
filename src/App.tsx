import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useHotkey } from '@/lib/useKeyNav';
import { DemoBar } from '@/components/DemoBar';
import { IntroOverlay } from '@/components/IntroOverlay';
import { ShortcutsOverlay } from '@/components/ShortcutsOverlay';
import { PublicShell } from '@/surfaces/public/PublicShell';
import { VendorShell } from '@/surfaces/vendor/VendorShell';
import { AdminShell } from '@/surfaces/admin/AdminShell';
import { PlatformShell } from '@/surfaces/platform/PlatformShell';

export function App() {
  const { profile, loading } = useAuth();
  const role = profile?.role ?? 'shopper';
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('rb_intro');
    } catch {
      return true;
    }
  });

  const [showShortcuts, setShowShortcuts] = useState(false);
  useHotkey(['?'], () => setShowShortcuts((s) => !s));
  useHotkey(['escape'], () => setShowShortcuts(false), { allowInInputs: true });

  function dismissIntro() {
    setShowIntro(false);
    try {
      sessionStorage.setItem('rb_intro', '1');
    } catch {
      /* sessionStorage unavailable — fine */
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <IntroOverlay open={showIntro} onClose={dismissIntro} />
      <ShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <DemoBar onAbout={() => setShowIntro(true)} onShortcuts={() => setShowShortcuts(true)} />
      <main className="flex-1">
        {loading ? (
          <div className="grid min-h-[60vh] place-items-center text-brand-muted">
            <div className="animate-pulse text-sm">Loading the market…</div>
          </div>
        ) : role === 'shopper' ? (
          <PublicShell />
        ) : role === 'vendor' ? (
          <VendorShell />
        ) : role === 'admin' ? (
          <AdminShell />
        ) : (
          <PlatformShell />
        )}
      </main>
    </div>
  );
}

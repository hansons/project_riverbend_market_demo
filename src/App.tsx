import { useAuth } from '@/auth/AuthContext';
import { DemoBar } from '@/components/DemoBar';
import { SurfacePlaceholder } from '@/components/SurfacePlaceholder';
import { PublicShell } from '@/surfaces/public/PublicShell';
import { VendorShell } from '@/surfaces/vendor/VendorShell';
import { AdminShell } from '@/surfaces/admin/AdminShell';

export function App() {
  const { profile, loading } = useAuth();
  const role = profile?.role ?? 'shopper';

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBar />
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
          <SurfacePlaceholder surface="owner" />
        )}
      </main>
    </div>
  );
}

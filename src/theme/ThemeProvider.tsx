import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { fetchActiveTenant, fetchTenants, FALLBACK_TENANT } from '@/lib/tenant';
import type { Brand, Tenant } from '@/lib/types';

interface ThemeState {
  tenant: Tenant; // currently displayed (may be a preview)
  tenants: Tenant[];
  loading: boolean;
  /** Apply a tenant's brand instantly without persisting (Slice 4 live re-skin). */
  preview: (t: Tenant) => void;
  /** Reload the active tenant + list from the database. */
  reload: () => Promise<void>;
}

const ThemeContext = createContext<ThemeState>({
  tenant: FALLBACK_TENANT,
  tenants: [FALLBACK_TENANT],
  loading: true,
  preview: () => {},
  reload: async () => {},
});

const BRAND_KEYS: (keyof Brand)[] = [
  'primary',
  'primary-dark',
  'accent',
  'berry',
  'ink',
  'paper',
  'card',
  'muted',
  'line',
];

function applyBrand(brand: Partial<Brand>) {
  const root = document.documentElement;
  for (const key of BRAND_KEYS) {
    const value = brand[key];
    if (value) root.style.setProperty(`--brand-${key}`, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant>(FALLBACK_TENANT);
  const [tenants, setTenants] = useState<Tenant[]>([FALLBACK_TENANT]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [active, all] = await Promise.all([fetchActiveTenant(), fetchTenants()]);
    setTenant(active);
    setTenants(all);
    applyBrand(active.brand);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const preview = useCallback((t: Tenant) => {
    setTenant(t);
    applyBrand(t.brand);
  }, []);

  return (
    <ThemeContext.Provider value={{ tenant, tenants, loading, preview, reload }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}

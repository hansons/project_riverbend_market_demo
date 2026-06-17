import { useState } from 'react';
import { fetchVendorManagers } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import type { Vendor } from '@/lib/types';

interface PendingManager {
  email: string;
  name: string;
}

// Per-vendor managers — appears available; provisioning not yet wired, so invites
// are front-end only. Several profiles may share a vendor_id, so a vendor can have
// more than one manager.
export function VendorManagersPanel({ vendor }: { vendor: Vendor }) {
  const { data: managers, loading } = useAsync(() => fetchVendorManagers(vendor.id), [vendor.id], []);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState<PendingManager[]>([]);
  const [result, setResult] = useState<'ok' | string | null>(null);

  function invite() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setResult('Enter a valid email address.');
      return;
    }
    if (managers.some((m) => (m.email ?? '').toLowerCase() === e) || pending.some((p) => p.email === e)) {
      setResult('That person is already a manager or invited.');
      return;
    }
    setPending((cur) => [...cur, { email: e, name: name.trim() }]);
    setEmail('');
    setName('');
    setResult('ok');
  }

  function revoke(e: string) {
    setPending((cur) => cur.filter((p) => p.email !== e));
    setResult(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-brand-ink">Managers · {vendor.name}</p>
        <p className="text-xs text-brand-muted">
          People who can sign in and manage this vendor’s listing (photos, profile, offerings).
          Invitations activate once account provisioning is enabled.
        </p>
      </div>

      {loading ? (
        <div className="h-10 animate-pulse rounded-lg bg-brand-card" />
      ) : managers.length === 0 ? (
        <p className="text-xs text-brand-muted">No managers linked yet.</p>
      ) : (
        <ul className="divide-y divide-brand-line rounded-lg border border-brand-line bg-brand-card">
          {managers.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium text-brand-ink">{m.full_name || m.email}</span>
                <span className="text-xs text-brand-muted"> · {m.email}</span>
              </span>
              <span className="chip shrink-0">Manager</span>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="divide-y divide-brand-line rounded-lg border border-brand-line bg-brand-card">
          {pending.map((p) => (
            <li key={p.email} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium text-brand-ink">{p.name || p.email}</span>
                <span className="text-xs text-brand-muted"> · {p.email}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-status-warn/15 px-2 py-0.5 text-xs font-semibold text-brand-berry">
                  Invite pending
                </span>
                <button onClick={() => revoke(p.email)} className="text-xs font-semibold text-status-alert hover:underline">
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="field-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setResult(null);
          }}
          placeholder="Name (optional)"
        />
        <input
          className="field-input"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setResult(null);
          }}
          placeholder="Email address"
          inputMode="email"
        />
        <button className="btn-primary" onClick={invite}>
          Invite manager
        </button>
      </div>
      {result === 'ok' && <p className="text-xs text-status-ok">✓ Invitation queued — activates once provisioning is on.</p>}
      {result && result !== 'ok' && <p className="text-xs text-status-alert">{result}</p>}
    </div>
  );
}

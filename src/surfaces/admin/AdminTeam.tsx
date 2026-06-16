import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { fetchAdmins } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';

interface PendingInvite {
  email: string;
  full_name: string;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', superadmin: 'Owner' };

export function AdminTeam() {
  const { profile } = useAuth();
  const { data: admins, loading } = useAsync(fetchAdmins, [], []);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [result, setResult] = useState<'ok' | string | null>(null);

  function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setResult('Enter a valid email address.');
      return;
    }
    if (admins.some((a) => (a.email ?? '').toLowerCase() === e) || pending.some((p) => p.email === e)) {
      setResult('That person is already an administrator or invited.');
      return;
    }
    setPending((cur) => [...cur, { email: e, full_name: name.trim() }]);
    setEmail('');
    setName('');
    setResult('ok');
  }

  function revoke(e: string) {
    setPending((cur) => cur.filter((p) => p.email !== e));
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">Administrators</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Manage who can sign in to this admin console. Invitations take effect once account
          provisioning is enabled for your site.
        </p>
      </div>

      <div className="card p-5">
        <p className="field-label">Add an administrator</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="field-input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setResult(null);
            }}
            placeholder="Full name (optional)"
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
          <button className="btn-primary" onClick={add}>
            Send invitation
          </button>
        </div>
        {result === 'ok' && (
          <p className="mt-2 text-sm text-status-ok">✓ Invitation queued — it activates once provisioning is turned on.</p>
        )}
        {result && result !== 'ok' && <p className="mt-2 text-sm text-status-alert">{result}</p>}
      </div>

      <div>
        <h3 className="text-lg">Current administrators</h3>
        {loading ? (
          <div className="mt-3 h-32 animate-pulse rounded-2xl bg-brand-card" />
        ) : (
          <div className="card mt-3 divide-y divide-brand-line">
            {admins.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-brand-ink">
                    {a.full_name || a.email}
                    {a.id === profile?.id && <span className="ml-1 text-xs text-brand-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-brand-muted">{a.email}</p>
                </div>
                <span className="chip">{ROLE_LABEL[a.role] ?? a.role}</span>
              </div>
            ))}
            {admins.length === 0 && <p className="p-4 text-sm text-brand-muted">No administrators found.</p>}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="text-lg">Pending invitations</h3>
          <div className="card mt-3 divide-y divide-brand-line">
            {pending.map((p) => (
              <div key={p.email} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-brand-ink">{p.full_name || p.email}</p>
                  <p className="text-xs text-brand-muted">{p.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-status-warn/15 px-2 py-0.5 text-xs font-semibold text-brand-berry">
                    Invite pending
                  </span>
                  <button onClick={() => revoke(p.email)} className="text-xs font-semibold text-status-alert hover:underline">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

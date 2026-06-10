import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  isPushConfigured,
  isSubscribed,
  permissionState,
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from '@/lib/push';
import type { Vendor } from '@/lib/types';

export function VendorNotifyCard({ vendor }: { vendor: Vendor }) {
  const { profile } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<'ok' | 'sent' | string | null>(null);
  const perm = permissionState();

  useEffect(() => {
    isSubscribed().then(setSubscribed);
  }, []);

  // Hidden until Web Push (VAPID) is configured and the browser supports it.
  if (!isPushConfigured) return null;

  async function enable() {
    setBusy(true);
    setMsg(null);
    const err = await subscribePush(vendor.id, profile?.id ?? '');
    setBusy(false);
    if (err) setMsg(err);
    else {
      setSubscribed(true);
      setMsg('ok');
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    await unsubscribePush();
    setBusy(false);
    setSubscribed(false);
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    const err = await sendTestPush();
    setBusy(false);
    setMsg(err ?? 'sent');
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg">🔔 Notifications</h3>
          <p className="mt-1 text-sm text-brand-muted">
            Get desktop &amp; mobile alerts for market news — approvals, stall changes, and reminders.
          </p>
        </div>
        {subscribed && <span className="chip text-status-ok">On</span>}
      </div>

      {perm === 'denied' ? (
        <p className="mt-3 text-sm text-status-alert">
          Notifications are blocked in your browser settings — re-enable them there, then reload.
        </p>
      ) : subscribed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-outline" onClick={test} disabled={busy}>
            {busy ? 'Sending…' : 'Send test'}
          </button>
          <button className="btn-ghost" onClick={disable} disabled={busy}>
            Turn off
          </button>
        </div>
      ) : (
        <button className="btn-primary mt-3" onClick={enable} disabled={busy}>
          {busy ? 'Enabling…' : 'Enable notifications'}
        </button>
      )}

      {msg === 'sent' && <p className="mt-2 text-sm text-status-ok">✓ Test sent — check your notifications.</p>}
      {msg && msg !== 'ok' && msg !== 'sent' && <p className="mt-2 text-sm text-status-alert">{msg}</p>}

      <p className="mt-3 text-[11px] text-brand-muted">
        On iPhone/iPad, add this site to your Home Screen first to receive notifications.
      </p>
    </div>
  );
}

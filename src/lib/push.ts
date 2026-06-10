import { supabase } from '@/lib/supabase';

// Web Push client helpers. The VAPID *public* key is a build-time env var (the
// private key lives only in the send-push Edge Function). When it's absent the UI
// gates itself off, mirroring isSupabaseConfigured.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY) && notificationsSupported();

export function permissionState(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

/** Standard VAPID key decode: URL-safe base64 → Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function isSubscribed(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Request permission, subscribe this device, and store the subscription. */
export async function subscribePush(vendorId: string, userId: string): Promise<string | null> {
  if (!isPushConfigured || !VAPID_PUBLIC_KEY) return 'Notifications aren’t configured yet (missing VAPID key).';
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return perm === 'denied'
        ? 'Notifications are blocked in your browser settings.'
        : 'Permission wasn’t granted.';
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return 'Subscription is missing encryption keys.';
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        vendor_id: vendorId,
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' },
    );
    return error?.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not enable notifications.';
  }
}

/** Remove this device's subscription (browser + database). */
export async function unsubscribePush(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not turn off notifications.';
  }
}

/** Send a test notification to the signed-in user's own devices. */
export async function sendTestPush(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { test: true } });
  if (error) return error.message;
  return data && (data as { error?: string }).error ? (data as { error?: string }).error! : null;
}

/** Best-effort: notify a vendor that their application was approved (admin action). */
export async function notifyVendorApproved(vendorId: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: { vendor_id: vendorId, kind: 'approved' } });
  } catch {
    /* push is best-effort — never block the admin action on it */
  }
}

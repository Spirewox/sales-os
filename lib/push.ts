// Browser push for CRM notifications (Web Push + VAPID; no Firebase). See fud-farmer-crm-be docs/crm-events.md.
import { axiosGet, axiosPost } from '@/lib/api';

export type PushStatus = 'unsupported' | 'server-off' | 'denied' | 'off' | 'on' | 'ios-install';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone/iPad only allow push from a Home Screen web app. */
function needsIosInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function serverKey(): Promise<string | null> {
  const res = (await axiosGet('notifications/push/key', true)) as { data: { enabled: boolean; public_key: string | null } };
  return res.data.enabled ? res.data.public_key : null;
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function pushStatus(): Promise<PushStatus> {
  if (needsIosInstall()) return 'ios-install';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    if (!(await serverKey())) return 'server-off';
  } catch {
    return 'server-off';
  }
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Must run from a click: browsers only show the permission prompt after a user gesture. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const key = await serverKey();
  if (!key) return 'server-off';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  const keyBytes = base64UrlToBytes(key);
  const current = sub?.options.applicationServerKey;
  if (sub && current && !sameKey(new Uint8Array(current), keyBytes)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await axiosPost('notifications/push/subscribe', { endpoint: json.endpoint, keys: json.keys }, true);
  return 'on';
}

export async function disablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await axiosPost('notifications/push/unsubscribe', { endpoint: sub.endpoint }, true).catch(() => undefined);
    await sub.unsubscribe();
  }
  return 'off';
}

function sameKey(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

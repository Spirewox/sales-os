'use client';

// App-wide CRM notifications: inbox from GET /notifications, live updates over SSE
// (GET /notifications/stream), toasts, the bell, and browser push. CRM-owned pipeline only;
// POS till activity stays in contexts/crm-live-context.tsx on /pos pages.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellOff, BellRing, CheckCheck, Settings2 } from 'lucide-react';
import { axiosGet, axiosPatch, axiosPost } from '@/lib/api';
import { HAS_API } from '@/lib/require-api';
import { cn } from '@/lib/utils';
import type { CrmNotification } from '@/lib/kitchen-types';
import { disablePush, enablePush, pushStatus, type PushStatus } from '@/lib/push';

const INBOX_KEY = ['crm-notifications'] as const;
type Inbox = { data: CrmNotification[]; unread: number; live: boolean };

const Ctx = createContext<{ connected: boolean; unread: number; inbox: Inbox | undefined; loading: boolean }>({ connected: false, unread: 0, inbox: undefined, loading: true });
export const useCrmNotifications = () => useContext(Ctx);

export function CrmNotificationsProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const inbox = useQuery({
    queryKey: INBOX_KEY,
    queryFn: async () => (await axiosGet('notifications?limit=30', true)) as Inbox,
    enabled: HAS_API,
    // Poll only while the live stream is down; the stream pushes changes otherwise.
    refetchInterval: connected ? false : 60_000,
    staleTime: 15_000,
  });

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!HAS_API || typeof EventSource === 'undefined') return;
    let stopped = false;
    let source: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let boardTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      source = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}notifications/stream`, { withCredentials: true });
      source.addEventListener('ready', (e) => {
        attempts = 0;
        const live = (() => {
          try {
            return JSON.parse((e as MessageEvent).data).live === true;
          } catch {
            return false;
          }
        })();
        setConnected(live);
        // Catch up on anything missed while disconnected.
        void qc.invalidateQueries({ queryKey: INBOX_KEY });
      });
      source.addEventListener('notification', (e) => {
        let n: CrmNotification;
        try {
          n = JSON.parse((e as MessageEvent).data);
        } catch {
          return;
        }
        qc.setQueryData<Inbox>(INBOX_KEY, (prev) =>
          prev && !prev.data.some((x) => x._id === n._id) ? { ...prev, data: [n, ...prev.data].slice(0, 30), unread: prev.unread + 1 } : prev,
        );
        // Muted types still land in the bell; only the toast is skipped (critical alerts are never muted).
        if ((n as CrmNotification & { muted?: boolean }).muted) return;
        const show = n.critical ? toast.error : toast;
        show(n.title, {
          id: n._id,
          description: n.body,
          duration: n.critical ? 20_000 : 8_000,
          action: n.link ? { label: 'Open', onClick: () => routerRef.current.push(n.link) } : undefined,
        });
      });
      source.addEventListener('kitchen.board', () => {
        clearTimeout(boardTimer);
        boardTimer = setTimeout(() => void qc.invalidateQueries({ queryKey: ['kitchen', 'jobs'] }), 400);
      });
      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (stopped) return;
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts++));
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(boardTimer);
      source?.close();
    };
  }, [qc]);

  return <Ctx.Provider value={{ connected, unread: inbox.data?.unread ?? 0, inbox: inbox.data, loading: inbox.isPending }}>{children}</Ctx.Provider>;
}

const when = (iso: string) => {
  const ms = Date.now() - Date.parse(iso);
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' });
};

const PUSH_TEXT: Record<PushStatus, string> = {
  on: 'Notifications are on for this device.',
  off: 'Get alerts on this device even when Sales OS is closed.',
  denied: 'Notifications are blocked for this site. Allow them in the browser’s site settings.',
  unsupported: 'This browser does not support notifications.',
  'server-off': 'Device notifications are not set up on the server yet.',
  'ios-install': 'On iPhone, add Sales OS to the Home Screen to get notifications.',
};

export function NotificationBell() {
  const qc = useQueryClient();
  const { connected, inbox: data, loading } = useCrmNotifications();
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void pushStatus().then(setPush).catch(() => setPush('unsupported'));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const markRead = useCallback(
    async (n: CrmNotification) => {
      if (n.readAt) return;
      qc.setQueryData<Inbox>(INBOX_KEY, (prev) => prev && { ...prev, unread: Math.max(0, prev.unread - 1), data: prev.data.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)) });
      await axiosPost(`notifications/${n._id}/read`, {}, true).catch(() => void qc.invalidateQueries({ queryKey: INBOX_KEY }));
    },
    [qc],
  );
  const markAll = async () => {
    qc.setQueryData<Inbox>(INBOX_KEY, (prev) => prev && { ...prev, unread: 0, data: prev.data.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) });
    await axiosPost('notifications/read-all', {}, true).catch(() => void qc.invalidateQueries({ queryKey: INBOX_KEY }));
  };
  const togglePush = async () => {
    setPushBusy(true);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const unread = data?.unread ?? 0;
  const items = data?.data ?? [];

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-accent"
      >
        <Bell size={16} />
        <span className="hidden sm:inline">Notifications</span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-green-500' : 'bg-muted-foreground/40')} title={connected ? 'Live' : 'Checking every minute'} aria-hidden />
              {unread > 0 && (
                <button type="button" onClick={() => void markAll()} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-96 divide-y overflow-auto" aria-live="polite">
            {loading && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</li>}
            {items.map((n) => (
              <li key={n._id} className={cn(!n.readAt && 'bg-primary/5')}>
                <Link
                  href={n.link || '#'}
                  onClick={() => {
                    void markRead(n);
                    setOpen(false);
                  }}
                  className="block px-4 py-3 hover:bg-muted/60"
                >
                  <p className={cn('text-sm', !n.readAt && 'font-semibold', n.critical && 'text-destructive')}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <time dateTime={n.createdAt} className="mt-1 block text-[11px] text-muted-foreground">{when(n.createdAt)}</time>
                </Link>
              </li>
            ))}
            {!loading && !items.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</li>}
          </ul>
          <div className="border-t bg-muted/30 px-4 py-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">This device</span>
              <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><Settings2 size={12} /> Alert settings</button>
            </div>
            {showSettings && <AlertSettings />}
            <p className="text-muted-foreground">{push ? PUSH_TEXT[push] : 'Checking device notifications…'}</p>
            {(push === 'on' || push === 'off') && (
              <button type="button" disabled={pushBusy} onClick={() => void togglePush()} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 font-medium hover:bg-accent disabled:opacity-50">
                {push === 'on' ? <><BellOff size={12} /> Turn off on this device</> : <><BellRing size={12} /> Enable notifications</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Prefs = { email: 'off' | 'critical' | 'all'; push: boolean; muted: string[]; mutable_types: string[] };
const TYPE_LABELS: Record<string, string> = {
  job_confirmed: 'New kitchen jobs',
  not_accepted: 'Jobs not accepted yet',
  due_soon: 'Jobs due soon',
  quote_confirmed: 'My quotes confirmed',
  completed_with_balance: 'Completed with money owed',
  bulk_job: 'Imports and exports finished',
};

/** Per-person alert settings: email level, device push and muted alert types (critical alerts always come through). */
function AlertSettings() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: ['crm-notification-prefs'], queryFn: async () => ((await axiosGet('notifications/preferences', true)) as { data: Prefs }).data });
  const save = async (patch: Partial<Prefs>) => {
    const prev = prefs.data;
    if (prev) qc.setQueryData(['crm-notification-prefs'], { ...prev, ...patch });
    try {
      const res = (await axiosPatch('notifications/preferences', patch, true)) as { data: Prefs };
      qc.setQueryData(['crm-notification-prefs'], res.data);
    } catch (e) {
      if (prev) qc.setQueryData(['crm-notification-prefs'], prev);
      toast.error(e instanceof Error ? e.message : 'Could not save alert settings');
    }
  };
  if (prefs.isPending) return <p className="mb-2 text-muted-foreground">Loading settings…</p>;
  if (prefs.isError || !prefs.data) return <p className="mb-2 text-destructive">Could not load alert settings.</p>;
  const p = prefs.data;
  return (
    <div className="mb-3 space-y-3 rounded-md border bg-background p-3">
      <fieldset>
        <legend className="mb-1 font-medium">Email me</legend>
        <div className="flex gap-1" role="radiogroup">
          {([['off', 'Never'], ['critical', 'Urgent only'], ['all', 'All alerts']] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={p.email === v} onClick={() => void save({ email: v })}
              className={cn('h-7 flex-1 rounded border px-2 font-medium', p.email === v ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}>{label}</button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={p.push} onChange={(e) => void save({ push: e.target.checked })} /> Device notifications on my browsers
      </label>
      <fieldset>
        <legend className="mb-1 font-medium">Show these alerts</legend>
        <div className="space-y-1">
          {p.mutable_types.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="checkbox" checked={!p.muted.includes(t)} onChange={(e) => void save({ muted: e.target.checked ? p.muted.filter((m) => m !== t) : [...p.muted, t] })} />
              {TYPE_LABELS[t] ?? t}
            </label>
          ))}
        </div>
        <p className="mt-1 text-muted-foreground">Turned-off alerts still appear here, without a pop-up. Urgent alerts (overdue, escalations) always come through.</p>
      </fieldset>
    </div>
  );
}

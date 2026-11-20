'use client';

// App-wide CRM notifications: inbox from GET /notifications, live updates over SSE
// (GET /notifications/stream), toasts, the bell, and browser push. CRM-owned pipeline only;
// POS till activity stays in contexts/crm-live-context.tsx on /pos pages.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Bell, BellRing, CheckCheck, ChefHat, FileCheck2, FileDown, Hourglass, Settings2, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import { axiosGet, axiosPost } from '@/lib/api';
import { HAS_API } from '@/lib/require-api';
import { cn } from '@/lib/utils';
import type { CrmNotification } from '@/lib/kitchen-types';
import { enablePush, pushStatus, type PushStatus } from '@/lib/push';

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
    queryFn: async () => (await axiosGet('notifications?limit=60', true)) as Inbox,
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
          prev && !prev.data.some((x) => x._id === n._id) ? { ...prev, data: [n, ...prev.data].slice(0, 60), unread: prev.unread + 1 } : prev,
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

export const PUSH_TEXT: Record<PushStatus, string> = {
  on: 'Notifications are on for this device.',
  off: 'Get alerts on this device even when Sales OS is closed.',
  denied: 'Notifications are blocked for this site. Allow them in the browser’s site settings.',
  unsupported: 'This browser does not support notifications.',
  'server-off': 'Device notifications are not set up on the server yet.',
  'ios-install': 'On iPhone, add Sales OS to the Home Screen to get notifications.',
};

type Group = { key: string; latest: CrmNotification; count: number; unread: CrmNotification[]; critical: boolean };

/** Repeated alerts about the same job (e.g. every "not accepted" reminder) collapse into one row. */
function groupInbox(items: CrmNotification[]): Group[] {
  const groups = new Map<string, Group>();
  for (const n of items) {
    const key = n.source?.id ? `${n.type}:${n.source.id}` : n._id;
    const g = groups.get(key);
    if (!g) groups.set(key, { key, latest: n, count: 1, unread: n.readAt ? [] : [n], critical: n.critical });
    else {
      g.count++;
      if (!n.readAt) g.unread.push(n);
      g.critical ||= n.critical;
    }
  }
  return [...groups.values()];
}

const TYPE_STYLE: Record<string, { icon: LucideIcon; tone: string }> = {
  job_confirmed: { icon: ChefHat, tone: 'bg-primary/10 text-primary' },
  not_accepted: { icon: Hourglass, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  due_soon: { icon: AlarmClock, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  overdue: { icon: TriangleAlert, tone: 'bg-destructive/15 text-destructive' },
  quote_confirmed: { icon: FileCheck2, tone: 'bg-primary/10 text-primary' },
  completed_with_balance: { icon: Wallet, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  bulk_job: { icon: FileDown, tone: 'bg-muted text-muted-foreground' },
};

/** "Not accepted yet: FF-1120-YX7 · Ifeanyi" → label + subject. */
function splitTitle(title: string): { label: string; subject: string } {
  const i = title.indexOf(': ');
  return i > 0 ? { label: title.slice(0, i), subject: title.slice(i + 2) } : { label: '', subject: title };
}

export function NotificationBell() {
  const qc = useQueryClient();
  const { connected, inbox: data, loading } = useCrmNotifications();
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
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
    async (list: CrmNotification[]) => {
      if (!list.length) return;
      const ids = new Set(list.map((n) => n._id));
      const at = new Date().toISOString();
      qc.setQueryData<Inbox>(INBOX_KEY, (prev) => prev && { ...prev, unread: Math.max(0, prev.unread - ids.size), data: prev.data.map((x) => (ids.has(x._id) ? { ...x, readAt: at } : x)) });
      await Promise.all(list.map((n) => axiosPost(`notifications/${n._id}/read`, {}, true))).catch(() => void qc.invalidateQueries({ queryKey: INBOX_KEY }));
    },
    [qc],
  );
  const markAll = async () => {
    qc.setQueryData<Inbox>(INBOX_KEY, (prev) => prev && { ...prev, unread: 0, data: prev.data.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) });
    await axiosPost('notifications/read-all', {}, true).catch(() => void qc.invalidateQueries({ queryKey: INBOX_KEY }));
  };
  const enableHere = async () => {
    setPushBusy(true);
    try {
      setPush(await enablePush());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not turn on notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const unread = data?.unread ?? 0;
  const groups = groupInbox(data?.data ?? []).filter((g) => !onlyUnread || g.unread.length);

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
        <div className="absolute right-0 z-40 mt-2 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-xl" role="dialog" aria-label="Notifications">
          <div className="space-y-3 border-b px-4 pb-3 pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">Notifications</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={connected ? 'Updates arrive instantly' : 'Checking every minute'}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-muted-foreground/40')} aria-hidden />
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button type="button" onClick={() => void markAll()} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <Link href="/settings?tab=alerts" onClick={() => setOpen(false)} aria-label="Alert settings" title="Alert settings" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Settings2 size={14} />
                </Link>
              </div>
            </div>
            <div role="tablist" aria-label="Show" className="inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium">
              {[false, true].map((u) => (
                <button
                  key={String(u)}
                  type="button"
                  role="tab"
                  aria-selected={onlyUnread === u}
                  onClick={() => setOnlyUnread(u)}
                  className={cn('rounded-md px-3 py-1', onlyUnread === u ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {u ? `Unread${unread ? ` (${unread > 99 ? '99+' : unread})` : ''}` : 'All'}
                </button>
              ))}
            </div>
          </div>

          <ul className="scrollbar-none max-h-[min(26rem,60vh)] overflow-y-auto p-1.5" aria-live="polite">
            {loading && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</li>}
            {groups.map((g) => {
              const n = g.latest;
              const { label, subject } = splitTitle(n.title);
              const style = g.critical ? TYPE_STYLE.overdue : (TYPE_STYLE[n.type] ?? { icon: Bell, tone: 'bg-muted text-muted-foreground' });
              const Icon = style.icon;
              const isUnread = g.unread.length > 0;
              return (
                <li key={g.key}>
                  <Link
                    href={n.link || '#'}
                    onClick={() => {
                      void markRead(g.unread);
                      setOpen(false);
                    }}
                    className={cn('flex gap-3 rounded-lg px-2.5 py-2.5 hover:bg-muted/70', isUnread && 'bg-primary/[0.04]')}
                  >
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', style.tone)} aria-hidden>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-[11px] font-semibold uppercase tracking-wide', g.critical ? 'text-destructive' : 'text-muted-foreground')}>{label || 'Update'}</span>
                        <time dateTime={n.createdAt} className="shrink-0 text-[11px] text-muted-foreground">{when(n.createdAt)}</time>
                      </span>
                      <span className={cn('mt-0.5 block truncate text-sm', isUnread ? 'font-semibold' : 'font-medium text-foreground/80')}>{subject}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body.replace(/\s*\(reminder \d+\)/, '')}</span>}
                      {g.count > 1 && (
                        <span className="mt-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {g.count} {n.type === 'not_accepted' ? 'reminders' : 'alerts'}
                        </span>
                      )}
                    </span>
                    {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </Link>
                </li>
              );
            })}
            {!loading && !groups.length && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><CheckCheck size={18} /></span>
                {onlyUnread ? 'You’re all caught up' : 'No notifications yet'}
              </li>
            )}
          </ul>

          {push && push !== 'on' && (
            <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5 text-xs">
              <p className="text-muted-foreground">{push === 'off' ? 'Get pop-ups on this device.' : PUSH_TEXT[push]}</p>
              {push === 'off' && (
                <button type="button" disabled={pushBusy} onClick={() => void enableHere()} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <BellRing size={12} /> Turn on
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

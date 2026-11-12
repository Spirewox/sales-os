'use client';
import Link from 'next/link';
import { bulkJobReference } from '@/lib/bulk-jobs';

import { createContext, useContext, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { axiosPost } from '@/lib/api';

export type LiveTill = {
  hubId: string; tillId: string; label: string; lastSeen: string | null;
  activity: string; shift: 'open' | 'closed'; awaitingPayment: boolean;
};
type Activity = { _id: string; hub: string; tillId: string; activity: string; at: string };
type Notice = { id: string; title: string; kind: string; createdAt: string; reference?: string };
const LiveContext = createContext({
  enabled: false, connected: false, tills: [] as LiveTill[], history: [] as Activity[], notices: [] as Notice[],
});

function mergeNotices(snapshot: Notice[], live: Notice[]) {
  const items = new Map([...snapshot, ...live].map(item => [item.id, item]));
  return [...items.values()].sort((left, right) =>
    (right.createdAt || '').localeCompare(left.createdAt || '') || right.id.localeCompare(left.id),
  ).slice(0, 50);
}

export function CrmLiveProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tills, setTills] = useState<LiveTill[]>([]);
  const [history, setHistory] = useState<Activity[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let stopped = false, retries = 0, lastMessage = 0;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined, refresh: ReturnType<typeof setTimeout> | undefined;
    const seen = new Set<string>();
    const requestSnapshot = () => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'snapshot' }));
    };
    const connect = async () => {
      try {
        const response = await axiosPost('pos/live-ticket', {}, true) as { data?: { url: string; token: string } | null };
        if (stopped || !response.data) return;
        setEnabled(true);
        const { url, token } = response.data;
        socket = new WebSocket(url);
        let baseline: Notice[] | undefined;
        let live: Notice[] = [];
        const receive = (item: Notice) => {
          live = mergeNotices(live, [item]);
          if (!baseline) return;
          setNotices(mergeNotices(baseline, live));
          if (seen.has(item.id)) return;
          seen.add(item.id);
          toast(item.title, { id: item.id });
        };
        socket.onopen = () => socket?.send(JSON.stringify({ type: 'authenticate', kind: 'crm', token }));
        socket.onmessage = ({ data }) => {
          if (stopped) return;
          lastMessage = Date.now();
          const message = JSON.parse(String(data));
          if (message.type === 'authenticated') {
            setConnected(message.transportReady === true); retries = 0;
          } else if (message.type === 'transport') {
            setConnected(message.transportReady === true);
          } else if (message.type === 'snapshot') {
            setTills(message.tills); setHistory(message.history);
          } else if (message.type === 'notifications') {
            const items: Notice[] = message.items;
            const buffered = baseline ? [] : live;
            baseline = items;
            for (const notice of items) seen.add(notice.id);
            setNotices(mergeNotices(items, live));
            for (const item of buffered) receive(item);
          } else if (message.type === 'notification') {
            receive(message.item);
          } else if (message.type === 'refresh' && !refresh) {
            refresh = setTimeout(() => {
              refresh = undefined;
              requestSnapshot();
            }, 600);
          }
        };
        socket.onclose = reconnect;
      } catch {
        reconnect();
      }
    };
    function reconnect() {
      if (stopped) return;
      setConnected(false);
      retry = setTimeout(() => void connect(), Math.min(30_000, 1000 * 2 ** retries++));
    }
    void connect();
    // Checkout and shift state can change while their till is offline.
    // Read the authoritative snapshot at a bounded interval in that case.
    const fallback = setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      if (lastMessage && Date.now() - lastMessage >= 65_000) {
        setConnected(false);
        socket.close();
      } else {
        requestSnapshot();
      }
    }, 30_000);
    return () => {
      stopped = true; clearTimeout(retry); clearTimeout(refresh); clearInterval(fallback); socket?.close();
    };
  }, []);

  return <LiveContext.Provider value={{ enabled, connected, tills, history, notices }}>{children}</LiveContext.Provider>;
}

export const useCrmLive = () => useContext(LiveContext);

export function CrmNotifications() {
  const { enabled, notices } = useCrmLive();
  if (!enabled) return null;
  return <div className="mb-3 flex justify-end">
    <details className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium">
        <Bell size={16} /> Notifications
      </summary>
      <ul className="absolute right-0 z-30 mt-2 max-h-72 w-64 space-y-3 overflow-auto rounded-xl border bg-card p-4 text-sm shadow-lg">
        {notices.map(item => <li key={item.id}>
          <p className="font-medium">{item.title}</p>
          {bulkJobReference(item.reference) && <Link className="block text-primary underline" href={`/jobs/${bulkJobReference(item.reference)}`}>View job</Link>}
          <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</time>
        </li>)}
        {!notices.length && <li className="text-muted-foreground">No notifications yet</li>}
      </ul>
    </details>
  </div>;
}

'use client';

import { useEffect, useState } from 'react';
import { DataTable, StatusBadge, type Column } from '@/components/app';
import { useCrmLive, type LiveTill } from '@/contexts/crm-live-context';

const activityLabels: Record<string, string> = {
  idle: 'Idle',
  'building-cart': 'Building cart',
  'selecting-customer': 'Selecting customer',
  'checking-out': 'Checking out',
  'awaiting-payment': 'Awaiting payment',
};
const time = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** A till counts as online while it was seen in the last 45 seconds. */
export const ONLINE_MS = 45_000;

/** A clock that ticks every 3 seconds while `enabled`, for "online" checks. */
export function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const clock = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(clock);
  }, [enabled]);
  return now;
}

/** Live till status from the POS WebSocket. Renders nothing when live updates are off. */
export function LivePosPanel({ locationId, locationNames }: Readonly<{
  locationId?: string; locationNames: Record<string, string>;
}>) {
  const { enabled, connected, tills, history } = useCrmLive();
  const now = useNow(enabled);
  if (!enabled) return null;
  const filtered = tills.filter(till => !locationId || till.hubId === locationId);
  const recent = history.filter(entry => !locationId || entry.hub === locationId);
  const columns: Column<LiveTill>[] = [
    { id: 'till', header: 'Till', mobile: 'title', cell: (t) => <span>{t.label}<span className="block text-xs font-normal text-muted-foreground">{locationNames[t.hubId]}</span></span> },
    {
      id: 'connection', header: 'Connection', mobile: 'value',
      cell: (t) => t.lastSeen && now - Date.parse(t.lastSeen) < ONLINE_MS ? <StatusBadge tone="good">Online</StatusBadge> : <StatusBadge tone="neutral">Offline</StatusBadge>,
    },
    { id: 'seen', header: 'Last seen', mobile: 'meta', className: 'whitespace-nowrap', cell: (t) => (t.lastSeen ? time(t.lastSeen) : 'Never connected') },
    { id: 'shift', header: 'Shift', mobile: 'meta', cell: (t) => (t.shift === 'open' ? 'Open' : 'Closed') },
    { id: 'activity', header: 'Current activity', mobile: 'subtitle', cell: (t) => activityLabels[t.activity] ?? 'Idle' },
    { id: 'payment', header: 'Payment', cell: (t) => (t.awaitingPayment ? <StatusBadge tone="warning">Awaiting payment</StatusBadge> : '-') },
  ];
  return <section className="space-y-3" aria-labelledby="live-tills-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="live-tills-title" className="text-sm font-semibold">Live tills</h2>
      <span role="status">{connected ? <StatusBadge tone="good">Live updates connected</StatusBadge> : <StatusBadge tone="warning">Reconnecting…</StatusBadge>}</span>
    </div>
    <DataTable
      label="Live tills"
      columns={columns}
      rows={filtered}
      getRowId={(t) => `${t.hubId}:${t.tillId}`}
      pageSize={10}
      fixedPageSize
      empty={<p className="px-4 py-6 text-center text-sm text-muted-foreground">{connected ? 'No tills for this location.' : 'Waiting for till status.'}</p>}
    />
    <details className="rounded-xl border bg-card px-4">
      <summary className="cursor-pointer py-3 text-sm font-semibold">Recent till activity</summary>
      {recent.length ? <ul className="max-h-64 divide-y overflow-auto border-t text-sm">
        {recent.map(entry => <li key={entry._id} className="flex flex-wrap justify-between gap-2 py-2">
          <span>{tills.find(till => till.hubId === entry.hub && till.tillId === entry.tillId)?.label ?? entry.tillId}, {activityLabels[entry.activity] ?? 'Idle'}</span>
          <time dateTime={entry.at} className="text-muted-foreground tabular-nums">{time(entry.at)}</time>
        </li>)}
      </ul> : <p className="border-t py-3 text-sm text-muted-foreground">No activity recorded yet.</p>}
    </details>
  </section>;
}

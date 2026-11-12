'use client';

import { useEffect, useState } from 'react';
import { useCrmLive } from '@/contexts/crm-live-context';

const activityLabels: Record<string, string> = {
  idle: 'Idle',
  'building-cart': 'Building cart',
  'selecting-customer': 'Selecting customer',
  'checking-out': 'Checking out',
  'awaiting-payment': 'Awaiting payment',
};
const time = (value: string) => new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

export function LivePosPanel({ locationId, locationNames }: {
  locationId: string; locationNames: Record<string, string>;
}) {
  const { enabled, connected, tills, history } = useCrmLive();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const clock = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(clock);
  }, [enabled]);
  if (!enabled) return null;
  const filtered = tills.filter(till => !locationId || till.hubId === locationId);
  const recent = history.filter(entry => !locationId || entry.hub === locationId);
  return <section className="space-y-4 rounded-xl border bg-card p-4" aria-labelledby="live-tills-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="live-tills-title" className="text-lg font-bold">Live tills</h2>
      <span role="status" className="text-sm text-muted-foreground">{connected ? 'Live updates connected' : 'Reconnecting…'}</span>
    </div>
    {filtered.length ? <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>{['Till', 'Connection', 'Last seen', 'Shift', 'Current activity', 'Payment'].map(label => <th scope="col" key={label} className="p-2">{label}</th>)}</tr>
        </thead>
        <tbody>{filtered.map(till => {
          const online = till.lastSeen && now - Date.parse(till.lastSeen) < 45_000;
          return <tr key={`${till.hubId}:${till.tillId}`} className="border-b last:border-0">
            <th scope="row" className="p-2">{till.label}<span className="block text-xs font-normal text-muted-foreground">{locationNames[till.hubId]}</span></th>
            <td className="p-2">{online ? 'Online' : 'Offline'}</td>
            <td className="p-2">{till.lastSeen ? time(till.lastSeen) : 'Never connected'}</td>
            <td className="p-2">{till.shift === 'open' ? 'Open' : 'Closed'}</td>
            <td className="p-2">{activityLabels[till.activity] ?? 'Idle'}</td>
            <td className="p-2">{till.awaitingPayment ? 'Awaiting payment' : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <p className="text-sm text-muted-foreground">{connected ? 'No tills for this location.' : 'Waiting for till status.'}</p>}
    <details>
      <summary className="cursor-pointer py-2 text-sm font-semibold">Recent till activity</summary>
      {recent.length ? <ul className="max-h-64 divide-y overflow-auto text-sm">
        {recent.map(entry => <li key={entry._id} className="flex flex-wrap justify-between gap-2 py-2">
          <span>{tills.find(till => till.hubId === entry.hub && till.tillId === entry.tillId)?.label ?? entry.tillId} · {activityLabels[entry.activity] ?? 'Idle'}</span>
          <time dateTime={entry.at} className="text-muted-foreground">{time(entry.at)}</time>
        </li>)}
      </ul> : <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
    </details>
  </section>;
}

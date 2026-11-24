'use client';

import { useId, type ComponentProps } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DataTable, DateField, EmptyState, FilterBar, KpiStrip, LocationSelect, StatusBadge, type Column } from '@/components/app';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { axiosGet } from '@/lib/api';
import { lagosDay } from '@/lib/period';
import { formatKobo, posTime } from './pos-utils';

type Shift = {
  id: string;
  till: string | null;
  cashier: string | null;
  openedAt: string | null;
  closed: boolean;
  cashDropsKobo: number;
  expectedKobo: number | null;
  countedKobo: number | null;
  varianceKobo: number | null;
};

export type Reconciliation = {
  shifts: Shift[];
  earlierOpenShifts: number;
  stock: { state: 'missing' | 'incomplete' | 'variance' | 'matched'; submissions: number };
};

const stockStates = {
  missing: 'No count received',
  incomplete: 'Coverage unconfirmed',
  variance: 'Discrepancies recorded',
  matched: 'Counts match',
} as const;

const money = (amount: number | null) => amount == null ? 'Pending' : formatKobo(amount);
const shiftColumns: Column<Shift>[] = [
  { id: 'till', header: 'Till', mobile: 'title', cell: (row) => row.till ?? 'Unknown till' },
  { id: 'cashier', header: 'Cashier', mobile: 'subtitle', cell: (row) => row.cashier ?? 'Unknown cashier' },
  { id: 'opened', header: 'Opened', mobile: 'subtitle', cell: (row) => posTime(row.openedAt) },
  { id: 'status', header: 'Status', mobile: 'meta', cell: (row) => {
    if (!row.closed) return <StatusBadge tone="warning">Open</StatusBadge>;
    if (row.varianceKobo == null) return <StatusBadge tone="warning">Count pending</StatusBadge>;
    if (row.varianceKobo !== 0) return <StatusBadge tone="warning">{row.varianceKobo < 0 ? 'Short' : 'Over'}</StatusBadge>;
    return <StatusBadge tone="good">Balanced</StatusBadge>;
  } },
  { id: 'drops', header: 'Cash drops', align: 'right', mobile: 'meta', cell: (row) => <><span className="md:sr-only">Cash drops </span>{money(row.cashDropsKobo)}</> },
  { id: 'expected', header: 'Expected', align: 'right', mobile: 'meta', cell: (row) => <><span className="md:sr-only">Expected </span>{money(row.expectedKobo)}</> },
  { id: 'counted', header: 'Counted', align: 'right', mobile: 'meta', cell: (row) => <><span className="md:sr-only">Counted </span>{money(row.countedKobo)}</> },
  { id: 'variance', header: 'Variance', align: 'right', mobile: 'value', cell: (row) => <><span className="md:sr-only">Variance </span>{money(row.varianceKobo)}</> },
];

export function ReconciliationFilters({ scope, day, onDayChange }: Readonly<{
  scope: ComponentProps<typeof LocationSelect>['scope']; day: string; onDayChange: (day: string) => void;
}>) {
  const dateId = useId();
  return <FilterBar filters={<>
    <LocationSelect scope={scope} />
    <div className="inline-flex items-center gap-2">
      <label className="whitespace-nowrap text-sm" htmlFor={dateId}>Trading day</label>
      <DateField id={dateId} value={day} onChange={onDayChange} max={lagosDay()} />
    </div>
  </>} />;
}

export function ReconciliationReport({ report, loading, day, resetKey, canViewInventory }: Readonly<{
  report?: Reconciliation; loading?: boolean; day: string; resetKey?: string; canViewInventory?: boolean;
}>) {
  const shifts = report?.shifts ?? [];
  const open = shifts.filter((shift) => !shift.closed).length;
  const earlierOpen = report?.earlierOpenShifts ?? 0;
  const openShifts = open + earlierOpen;
  const complete = shifts.length > 0 && shifts.every((shift) => shift.varianceKobo != null);
  const exceptions = shifts.filter((shift) => shift.varianceKobo != null && shift.varianceKobo !== 0).length;
  const period = `&period=custom&from=${day}&to=${day}`;
  const sum = (key: 'expectedKobo' | 'countedKobo' | 'varianceKobo') =>
    complete ? shifts.reduce((total, shift) => total + (shift[key] ?? 0), 0) : null;
  const drawerDetail = exceptions ? `${exceptions} ${exceptions === 1 ? 'drawer needs' : 'drawers need'} review`
    : complete ? 'All recorded drawers balance' : 'Close and count every recorded drawer';
  return (
    <div className="space-y-5">
      <KpiStrip label="Cash position" loading={loading} cells={[
        { label: 'Expected cash', value: money(sum('expectedKobo')), detail: 'After recorded cash drops' },
        { label: 'Counted cash', value: money(sum('countedKobo')), detail: 'From till close counts' },
        { label: 'Cash variance', value: money(sum('varianceKobo')), detail: drawerDetail, tone: exceptions ? 'warning' : 'default' },
      ]} />
      {report && (
        <section aria-labelledby="close-checks" className="space-y-3 rounded-xl border bg-card p-4">
          <h2 id="close-checks" className="text-sm font-semibold">Close checklist</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2"><span>Shift closure</span><StatusBadge tone={shifts.length > 0 && openShifts === 0 ? 'good' : 'warning'}>{openShifts ? `${openShifts} open` : shifts.length ? 'All recorded shifts closed' : 'No shifts recorded'}</StatusBadge></li>
            <li className="flex flex-wrap items-center justify-between gap-2"><span>Cash drawers</span><StatusBadge tone={complete && exceptions === 0 ? 'good' : 'warning'}>{drawerDetail}</StatusBadge></li>
            <li className="flex flex-wrap items-center justify-between gap-2"><span>Closing stock{report.stock.submissions > 0 && <span className="text-muted-foreground"> ({report.stock.submissions} received)</span>}</span><StatusBadge tone={report.stock.state === 'matched' ? 'good' : 'warning'}>{stockStates[report.stock.state]}</StatusBadge></li>
            <li className="flex flex-wrap items-center justify-between gap-2"><span>Till sync</span><StatusBadge tone="neutral">Unverified</StatusBadge></li>
          </ul>
          <p className="text-sm text-muted-foreground">Cash figures reflect recorded till closes for shifts opened on this trading day. Review later transactions and check the local sync queue in POS.</p>
          {earlierOpen > 0 && <p className="text-sm text-muted-foreground">Earlier shifts still open: {earlierOpen}.</p>}
          <div className="flex flex-wrap gap-3 text-sm font-medium text-primary">
            <Link className="hover:underline" href={`/pos?tab=shifts${period}`}>View shifts</Link>
            {earlierOpen > 0 && <Link className="hover:underline" href={`/pos?tab=shifts&period=custom&from=2000-01-01&to=${day}&status=open`}>View open shifts</Link>}
            <Link className="hover:underline" href={`/pos?tab=transactions${period}`}>View transactions</Link>
            {canViewInventory && <Link className="hover:underline" href="/inventory">View inventory</Link>}
          </div>
        </section>
      )}
      <DataTable label="Shift reconciliation" rows={shifts} columns={shiftColumns} getRowId={(row) => row.id}
        loading={loading} resetPageKey={resetKey}
        empty={<EmptyState size="compact" title="No shifts to show" description="Shifts received for this location and trading day appear here." />} />
    </div>
  );
}

export function ReconciliationTab({ scope, canViewInventory }: Readonly<{ scope: HubScopeFilter; canViewInventory: boolean }>) {
  const { user } = useAuth();
  const { get, set } = useUrlState();
  const today = lagosDay();
  const selectedDay = get('day') ?? today;
  const date = new Date(`${selectedDay}T00:00:00Z`);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(selectedDay) && Number.isFinite(+date) &&
    date.toISOString().slice(0, 10) === selectedDay && selectedDay <= today ? selectedDay : today;
  const hubId = scope.canSwitchHubs
    ? scope.activeHubs.find((hub) => hub.name === scope.filterHub)?.id
    : scope.activeHubs.find((hub) => hub.id === scope.defaultHubId)?.id;
  const canRead = user?.permissions.includes('view_pos') && user.dataScope !== 'assigned';
  const report = useQuery({
    queryKey: ['pos-reconciliation', user?.id, user?.dataScope, user?.visibleHubIds, user?.permissions, hubId, day],
    enabled: Boolean(hubId && canRead),
    queryFn: async () => {
      const params = new URLSearchParams({ hub_id: hubId!, day });
      const response = await axiosGet(`pos/reconciliation?${params}`, true) as { data: Reconciliation };
      return response.data;
    },
  });
  return (
    <div className="space-y-5">
      <ReconciliationFilters scope={scope} day={day} onDayChange={(next) => set({ day: next === today ? null : next })} />
      {!hubId ? (
        <EmptyState title="No location selected" description="Choose one location to review its trading day." />
      ) : !canRead ? (
        <EmptyState title="Reconciliation unavailable" description="Location-wide POS access is required to review a trading day." />
      ) : report.fetchStatus === 'paused' && !report.data ? (
        <EmptyState title="Reconciliation unavailable" description="Reconnect to load the trading day report." />
      ) : report.isError ? (
        <EmptyState title="Reconciliation unavailable" description="The trading day report could not be loaded."
          action={<Button variant="link" onClick={() => void report.refetch()}>Retry report</Button>} />
      ) : (
        <ReconciliationReport report={report.data} loading={report.isPending} day={day} resetKey={`${hubId}:${day}`} canViewInventory={canViewInventory} />
      )}
    </div>
  );
}

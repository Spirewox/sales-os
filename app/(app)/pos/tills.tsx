'use client';

import Link from 'next/link';
import { MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, EmptyState, OverflowMenu, StatusBadge, type Column } from '@/components/app';
import { useRevokeTill } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/auth-context';
import { useCrmLive } from '@/contexts/crm-live-context';
import { plural } from '@/lib/format';
import { ONLINE_MS, useNow } from '@/components/live-pos-panel';
import { usePosFilters } from './use-pos-filters';
import { operationsQuery, useCursorPages, useOperationsList } from './operations';
import { PosFilterBar } from './pos-filter-bar';
import { LoadError, TillStatus, posTime, type PosRow } from './pos-utils';


export function TillsTab({ onRegister }: Readonly<{ onRegister?: () => void }>) {
  const f = usePosFilters();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManage = can('pos.manage_tills');
  const live = useCrmLive();
  const now = useNow(live.enabled);
  const qc = useQueryClient();
  const revoke = useRevokeTill();
  const base = { hub_id: f.hubId, q: f.urlSearch.trim() };
  const { before, pagination } = useCursorPages(operationsQuery(base));
  const list = useOperationsList('tills', { ...base, before });
  const rows = list.data?.data;
  const liveTill = (r: PosRow) => live.tills.find((t) => t.hubId === r.hub && t.tillId === r.device_id);
  const lastActivity = (r: PosRow) => liveTill(r)?.lastSeen ?? r.last_seen;

  const revokeTill = (r: PosRow) => {
    if (!r.device_id) return;
    if (!window.confirm(`Revoke ${r.label || 'this till'}? It cannot sign in until it is registered again.`)) return;
    revoke.mutateAsync({ hubId: r.hub, deviceId: r.device_id })
      .then(() => { toast.success('Till revoked'); return qc.invalidateQueries({ queryKey: ['pos-operations'] }); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not revoke this till'));
  };

  const columns: Column<PosRow>[] = [
    {
      id: 'till', header: 'Till', mobile: 'title',
      cell: (r) => <span><span className="font-medium">{r.label || 'Store till'}</span>{r.device_id && <span className="block font-mono text-xs font-normal text-muted-foreground">{r.device_id}</span>}</span>,
    },
    { id: 'location', header: 'Location', mobile: 'subtitle', cell: (r) => f.hubName(r.hub) },
    { id: 'status', header: 'Status', mobile: 'meta', cell: (r) => <TillStatus row={r} /> },
    ...(live.enabled ? [{
      id: 'connection', header: 'Connection', mobile: 'meta' as const,
      cell: (r: PosRow) => {
        const seen = liveTill(r)?.lastSeen;
        return seen && now - Date.parse(seen) < ONLINE_MS ? <StatusBadge tone="good">Online</StatusBadge> : <StatusBadge tone="neutral">Offline</StatusBadge>;
      },
    }] : []),
    { id: 'activity', header: 'Last activity', mobile: 'value', align: 'right', className: 'whitespace-nowrap', cell: (r) => (lastActivity(r) ? posTime(lastActivity(r)) : 'Never') },
  ];

  return (
    <div className="space-y-4">
      <PosFilterBar
        f={f}
        withPeriod={false}
        searchPlaceholder="Search tills"
        resultLabel={rows ? `${plural(rows.length, 'till')}${list.data?.nextCursor ? ' on this page' : ''}` : undefined}
      />
      <LoadError show={list.isError} what="tills" retry={() => void list.refetch()} />
      <DataTable
        label="Tills"
        columns={columns}
        rows={rows}
        loading={list.isFetching && (!rows || list.isPlaceholderData)}
        getRowId={(r) => r._id}
        rowActions={canManage ? (r) => (
          <OverflowMenu size="sm" label={`Actions for ${r.label || 'till'}`} items={[
            { label: 'Revoke till', destructive: true, onSelect: () => revokeTill(r), hidden: r.revoked || !r.device_id, disabled: revoke.isPending },
          ]} />
        ) : undefined}
        pagination={pagination(list.data?.nextCursor)}
        empty={<EmptyState
          size="compact"
          icon={<MonitorSmartphone />}
          title="No tills"
          description={f.urlSearch ? 'Nothing matches this search.' : 'Register a till to start selling from a device at this location.'}
          action={canManage && onRegister && !f.urlSearch ? <button type="button" onClick={onRegister} className="text-sm font-medium text-primary hover:underline">Register till</button> : undefined}
        />}
      />
      {user?.roleName === 'company_admin' && (
        <p className="text-sm text-muted-foreground">
          <Link href="/settings?tab=locations" className="font-medium text-primary hover:underline">Payment confirmation is set per location in Settings</Link>
        </p>
      )}
    </div>
  );
}

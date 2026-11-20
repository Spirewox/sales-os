'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Plus } from 'lucide-react';
import { useUpdateHub, useUpgradeHub } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { formatHubCountLabel } from '@/lib/settings-helpers';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, OverflowMenu, RowAction, StatusBadge, type Column, type FilterChip, type OverflowItem,
} from '@/components/app';
import type { Hub } from '@/types';
import { RowMenu, SectionHeading, btnPrimary } from './settings-ui';
import { useSettingsData } from './use-settings-data';
import { useSettingsConfirm } from './use-settings-confirm';
import { LocationFormSheet } from './location-form-sheet';
import { DowngradeSheet } from './downgrade-sheet';
import { LocationDrawer } from './location-drawer';

type TypeFilter = 'all' | 'hub' | 'rsp';
const TYPE_OPTIONS = [{ value: 'all', label: 'All types' }, { value: 'hub', label: 'Hubs' }, { value: 'rsp', label: 'RSPs' }];

export function LocationsSection() {
  const { can, isAdmin } = usePermissions();
  const canManageHubs = can('settings.manage_hubs');
  const { hubs, hubsLoading, activeHubs, agents } = useSettingsData();
  const hubOnlyLocations = activeHubs.filter((h) => h.locationType === 'hub');
  const updateHub = useUpdateHub();
  const upgradeHub = useUpgradeHub();

  const [search, setSearch] = useState('');
  const [hubTypeFilter, setHubTypeFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Partial<Hub> | null>(null);
  const [downgradingHub, setDowngradingHub] = useState<Hub | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { confirm, dialog } = useSettingsConfirm({ onDone: (a) => { if (a.type === 'deleteHub') setOpenId(null); } });
  const openHub = openId ? hubs.find((h) => h.id === openId) ?? null : null;

  const q = search.trim().toLowerCase();
  const filteredHubs = hubs.filter((h) =>
    (hubTypeFilter === 'all' || h.locationType === hubTypeFilter) &&
    (!q || [h.name, h.code, h.address, h.managerName].some((v) => v?.toLowerCase().includes(q))),
  );

  const handleActivateHub = async (hub: Hub) => {
    try {
      await updateHub.mutateAsync({ id: hub.id, is_active: true });
      toast.success(`Hub "${hub.name}" activated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update hub.');
    }
  };

  const handleUpgradeHub = async (hub: Hub) => {
    try {
      await upgradeHub.mutateAsync(hub.id);
      toast.success(`"${hub.name}" upgraded to Hub.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upgrade location.');
    }
  };

  const menuItems = (hub: Hub): OverflowItem[] => {
    const hasTeam = agents.some((a) => a.location === hub.name);
    return [
      { label: 'Upgrade to hub', onSelect: () => void handleUpgradeHub(hub), hidden: hub.locationType !== 'rsp', disabled: upgradeHub.isPending },
      { label: 'Activate', onSelect: () => void handleActivateHub(hub), hidden: hub.isActive },
      { label: 'Downgrade to RSP', onSelect: () => setDowngradingHub(hub), destructive: true, hidden: hub.locationType !== 'hub' },
      { label: 'Deactivate', onSelect: () => confirm('deactivateHub', hub.id), destructive: true, hidden: !hub.isActive },
      // Only locations with nobody assigned can be deleted (as before).
      { label: 'Delete', onSelect: () => confirm('deleteHub', hub.id), destructive: true, hidden: hasTeam },
    ];
  };

  const chips: FilterChip[] = [
    ...(q ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => setSearch('') }] : []),
    ...(hubTypeFilter !== 'all' ? [{ key: 'type', label: hubTypeFilter === 'hub' ? 'Hubs' : 'RSPs', onRemove: () => setHubTypeFilter('all') }] : []),
  ];
  const clearAll = () => { setSearch(''); setHubTypeFilter('all'); };

  const columns: Column<Hub>[] = [
    {
      id: 'name', header: 'Name', mobile: 'title', sortValue: (h) => h.name.toLowerCase(),
      cell: (h) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{h.name}</span>
          {h.address && <span className="hidden max-w-xs truncate text-xs font-normal text-muted-foreground md:block">{h.address}</span>}
        </span>
      ),
    },
    { id: 'code', header: 'Code', mobile: 'meta', sortValue: (h) => h.code ?? '', cell: (h) => <span className="font-mono text-xs font-semibold text-muted-foreground">{h.code || 'N/A'}</span> },
    {
      id: 'type', header: 'Type', mobile: 'subtitle', sortValue: (h) => h.locationType,
      cell: (h) => (
        <span className="whitespace-nowrap">
          {h.locationType === 'hub' ? 'Hub' : 'RSP'}
          {h.locationType === 'rsp' && h.ownershipType && <span className="text-muted-foreground">, {h.ownershipType === 'RO' ? 'retail owned' : 'retail franchise'}</span>}
        </span>
      ),
    },
    { id: 'parent', header: 'Parent hub', hideBelow: 'lg', sortValue: (h) => h.parentHubName ?? '', cell: (h) => <span className="text-muted-foreground">{h.parentHubName ?? '-'}</span> },
    { id: 'manager', header: 'Manager', mobile: 'meta', sortValue: (h) => h.managerName ?? '', cell: (h) => h.managerName ?? '-' },
    { id: 'children', header: 'RSPs', align: 'right', hideBelow: 'lg', sortValue: (h) => h.childRspCount ?? 0, cell: (h) => (h.locationType === 'hub' ? (h.childRspCount ?? 0) : '-') },
    { id: 'status', header: 'Status', mobile: 'value', sortValue: (h) => (h.isActive ? 0 : 1), cell: (h) => (h.isActive ? <StatusBadge tone="good">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>) },
  ];

  return (
    <section aria-labelledby="settings-locations" className="space-y-5">
      <SectionHeading
        id="settings-locations"
        title="Locations"
        description={hubsLoading ? 'Hubs and retail sales points (RSPs).' : `Hubs and retail sales points (RSPs). ${formatHubCountLabel(activeHubs.length, hubs.length)}.`}
        action={canManageHubs && (
          <button type="button" onClick={() => setEditing({ isActive: true, locationType: 'hub' })} className={btnPrimary}><Plus aria-hidden /> Add location</button>
        )}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, code or manager', label: 'Search locations' }}
        filters={<FilterSelect ariaLabel="Location type" value={hubTypeFilter} onChange={(v) => setHubTypeFilter(v as TypeFilter)} options={TYPE_OPTIONS} className="h-9 w-auto min-w-32 data-[size=default]:h-9" />}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={hubsLoading ? undefined : `${filteredHubs.length} ${filteredHubs.length === 1 ? 'location' : 'locations'}`}
      />

      <DataTable
        label="Locations"
        columns={columns}
        rows={hubsLoading ? undefined : filteredHubs}
        loading={hubsLoading}
        getRowId={(h) => h.id}
        onRowClick={(h) => setOpenId(h.id)}
        defaultSort={{ id: 'name', dir: 'asc' }}
        resetPageKey={`${q}|${hubTypeFilter}`}
        rowClassName={(h) => (h.isActive ? undefined : 'text-muted-foreground')}
        rowActions={canManageHubs ? (h) => (
          <>
            <RowAction onClick={() => setEditing(h)}>Edit</RowAction>
            <RowMenu label={`More actions for ${h.name}`} items={menuItems(h)} />
          </>
        ) : undefined}
        empty={
          <EmptyState
            size="compact"
            icon={<MapPin />}
            title={chips.length ? 'No locations match' : 'No locations yet'}
            description={chips.length ? 'Nothing matches these filters.' : 'Add your first hub to get started.'}
            action={chips.length ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        }
      />

      {!canManageHubs && <p className="text-xs text-muted-foreground">You don&apos;t have permission to manage locations.</p>}

      {openHub && !editing && !downgradingHub && (
        <LocationDrawer
          hub={openHub}
          agents={agents}
          canManage={canManageHubs}
          canConfigurePos={isAdmin}
          onEdit={() => setEditing(openHub)}
          overflow={<OverflowMenu label={`More actions for ${openHub.name}`} items={menuItems(openHub)} />}
          onClose={() => setOpenId(null)}
        />
      )}
      {editing && <LocationFormSheet initial={editing} onClose={() => setEditing(null)} hubs={hubs} hubOnlyLocations={hubOnlyLocations} agents={agents} />}
      {downgradingHub && <DowngradeSheet hub={downgradingHub} hubs={hubs} hubOnlyLocations={hubOnlyLocations} onClose={() => setDowngradingHub(null)} />}
      {dialog}
    </section>
  );
}

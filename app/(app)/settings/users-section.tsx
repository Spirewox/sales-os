'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRegeneratePin, useUpdateAgent } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { canRegenerateTillPin } from '@/lib/settings-helpers';
import { roleLabel } from '@/lib/role-permissions';
import { formatDate } from '@/lib/format';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, LocationSelect, MoreFilterField, RowAction, StatusBadge,
  type Column, type FilterChip,
} from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { USER_EXPORT_COLUMNS } from '@/lib/exports/users';
import { filterLabels } from '@/lib/export';
import type { Agent } from '@/types';
import { RowMenu, SectionHeading, btnPrimary } from './settings-ui';
import { useSettingsData } from './use-settings-data';
import { useSettingsConfirm } from './use-settings-confirm';
import { UserFormSheet } from './user-form-sheet';

type StatusFilter = 'all' | 'active' | 'inactive';

export function UsersSection() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canManageUsers = can('settings.manage_users');
  const { agents, agentsLoading, hubs, activeHubs, apiRoles, canSwitchHubs, scopeHubId } = useSettingsData();
  const scope = useHubScopeFilter();
  const regeneratePin = useRegeneratePin();
  const updateAgent = useUpdateAgent();
  const { confirm, dialog } = useSettingsConfirm();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);

  const defaultNewUser = (): Partial<Agent> => ({ role: 'Hub Manager', location: activeHubs[0]?.name || user?.hubName || 'Lagos' });

  const q = search.trim().toLowerCase();
  const rows = agents.filter((a) =>
    (!q || [a.name, a.email, a.username, a.phone].some((v) => v?.toLowerCase().includes(q))) &&
    (role === 'All' || a.role === role) &&
    scope.matchesHub(a.location) &&
    (status === 'all' || (status === 'active' ? a.isActive !== false : a.isActive === false)),
  );

  const exportUsers = useExport({
    module: 'users', title: 'Users',
    filters: () => filterLabels({ location: scope.filterHub, chips }),
    noun: { one: 'user', many: 'users' }, columns: USER_EXPORT_COLUMNS,
    fetchPage: async () => ({ items: rows, totalPages: 1 }), disabled: agentsLoading || rows.length === 0,
  });

  const handleRegeneratePin = async (id: string) => {
    try {
      await regeneratePin.mutateAsync(id);
      toast.success('A new PIN has been emailed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate PIN.');
    }
  };

  const handleActivateUser = async (agent: Agent) => {
    try {
      await updateAgent.mutateAsync({ id: agent.id, is_active: true });
      toast.success(`${agent.name} can sign in again.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate user.');
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === user?.id) { toast.error("Can't delete yourself."); return; }
    confirm('deleteUser', id);
  };

  const roleOptions = [{ value: 'All', label: 'All roles' }, ...apiRoles.map((r) => ({ value: roleLabel(r), label: roleLabel(r) }))];
  const chips: FilterChip[] = [
    ...(search.trim() ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => setSearch('') }] : []),
    ...(role !== 'All' ? [{ key: 'role', label: role, onRemove: () => setRole('All') }] : []),
    ...(scope.canSwitchHubs && scope.filterHub !== 'All' ? [{ key: 'hub', label: scope.filterHub, onRemove: () => scope.setFilterHub('All') }] : []),
    ...(status !== 'all' ? [{ key: 'status', label: status === 'active' ? 'Active' : 'Inactive', onRemove: () => setStatus('all') }] : []),
  ];
  const clearAll = () => { setSearch(''); setRole('All'); setStatus('all'); if (scope.canSwitchHubs) scope.setFilterHub('All'); };

  const columns: Column<Agent>[] = [
    {
      id: 'name', header: 'Name', mobile: 'title', sortValue: (a) => a.name.toLowerCase(),
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground md:inline-flex">{a.name.charAt(0)}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{a.name}{a.id === user?.id && <span className="font-normal text-muted-foreground"> (you)</span>}</span>
            <span className="hidden truncate text-xs text-muted-foreground md:block">{a.email}{a.username ? `, @${a.username}` : ''}</span>
          </span>
        </span>
      ),
    },
    { id: 'email', header: 'Email', mobile: 'subtitle', className: 'hidden', cell: (a) => a.email },
    { id: 'role', header: 'Role', mobile: 'meta', sortValue: (a) => a.role, cell: (a) => <StatusBadge tone="neutral">{a.role}</StatusBadge> },
    { id: 'location', header: 'Location', mobile: 'meta', sortValue: (a) => a.location, cell: (a) => a.location },
    { id: 'status', header: 'Status', mobile: 'value', sortValue: (a) => (a.isActive === false ? 1 : 0), cell: (a) => (a.isActive === false ? <StatusBadge tone="neutral">Inactive</StatusBadge> : <StatusBadge tone="good">Active</StatusBadge>) },
    { id: 'joined', header: 'Joined', hideBelow: 'lg', sortValue: (a) => a.joinedDate, cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(a.joinedDate)}</span> },
  ];

  return (
    <section aria-labelledby="settings-users" className="space-y-5">
      <SectionHeading
        id="settings-users"
        title="Users"
        description="Everyone who can sign in to the CRM or a till."
        action={canManageUsers && (
          <button type="button" onClick={() => setEditing(defaultNewUser())} className={btnPrimary}><Plus aria-hidden /> Add user</button>
        )}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email or phone', label: 'Search users' }}
        filters={
          <>
            <FilterSelect ariaLabel="Role" value={role} onChange={setRole} options={roleOptions} className="h-9 w-auto min-w-36 data-[size=default]:h-9" />
            <LocationSelect scope={scope} />
          </>
        }
        more={
          <MoreFilterField label="Status">
            <FilterSelect ariaLabel="Status" value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[{ value: 'all', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </MoreFilterField>
        }
        moreActiveCount={status !== 'all' ? 1 : 0}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={agentsLoading ? undefined : `${rows.length} ${rows.length === 1 ? 'user' : 'users'}`}
        trailing={canManageUsers ? exportUsers.menu : undefined}
      />

      <DataTable
        label="Users"
        columns={columns}
        rows={agentsLoading ? undefined : rows}
        loading={agentsLoading}
        getRowId={(a) => a.id}
        defaultSort={{ id: 'name', dir: 'asc' }}
        resetPageKey={chips.map((c) => c.key + c.label).join('|')}
        rowClassName={(a) => (a.isActive === false ? 'text-muted-foreground' : undefined)}
        rowActions={canManageUsers ? (a) => (
          <>
            <RowAction onClick={() => setEditing(a)}>Edit</RowAction>
            <RowMenu
              label={`More actions for ${a.name}`}
              items={[
                { label: 'Regenerate till PIN', onSelect: () => void handleRegeneratePin(a.id), hidden: !canRegenerateTillPin(a.role), disabled: regeneratePin.isPending },
                { label: 'Activate', onSelect: () => void handleActivateUser(a), hidden: a.isActive !== false },
                { label: 'Deactivate', onSelect: () => confirm('deactivateUser', a.id), destructive: true, hidden: a.isActive === false || a.id === user?.id },
                { label: 'Delete', onSelect: () => handleDeleteUser(a.id), destructive: true, hidden: a.id === user?.id },
              ]}
            />
          </>
        ) : undefined}
        empty={
          <EmptyState
            size="compact"
            icon={<Users />}
            title={chips.length ? 'No users match' : 'No users yet'}
            description={chips.length ? 'Nothing matches these filters.' : 'Add the first team member to get started.'}
            action={chips.length ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        }
      />

      {editing && (
        <UserFormSheet
          initial={editing}
          onClose={() => setEditing(null)}
          apiRoles={apiRoles}
          hubs={hubs}
          activeHubs={activeHubs}
          canSwitchHubs={canSwitchHubs}
          scopeHubId={scopeHubId}
        />
      )}
      {dialog}
    </section>
  );
}

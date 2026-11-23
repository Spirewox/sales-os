'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, RotateCcw, Shield } from 'lucide-react';
import { useUpdateRole } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { HAS_API } from '@/lib/require-api';
import type { Permission, PermissionGroup } from '@/lib/permissions';
import { buildRolePermissionsMap, fePermissionsToApiInput, isCompanyAdminRole, roleLabel } from '@/lib/role-permissions';
import { FilterSelect } from '@/components/filter-select';
import { EmptyState, OverflowMenu } from '@/components/app';
import type { ApiRole } from '@/types/api';
import { SectionHeading, UnsavedBar, btnPrimary } from './settings-ui';
import { useSettingsData } from './use-settings-data';
import { useSettingsConfirm } from './use-settings-confirm';
import { RolesMatrix } from './roles-matrix';
import { RoleFormSheet } from './role-form-sheet';

const EMPTY_SET = new Set<string>();

export function RolesSection() {
  const { can } = usePermissions();
  const canManageRoles = can('settings.manage_roles');
  const { apiRoles, allRoles } = useSettingsData();
  const systemRolesOnly = allRoles.filter((r) => r.is_system !== false);
  const updateRole = useUpdateRole();

  // Edits are local until Save. Every edited role is saved together.
  const [rolePerms, setRolePerms] = useState<Record<string, Permission[]>>(() => buildRolePermissionsMap(apiRoles));
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(EMPTY_SET);
  const [saving, setSaving] = useState(false);
  const [phoneRoleId, setPhoneRoleId] = useState('');
  const [showRoleSheet, setShowRoleSheet] = useState(false);

  const syncRolesFromApi = () => {
    if (!HAS_API || apiRoles.length === 0) return;
    setRolePerms(buildRolePermissionsMap(apiRoles));
  };
  const setRolesDirty = (dirty: boolean) => { if (!dirty) setDirtyIds(EMPTY_SET); };

  // Fresh roles from the server replace local edits (after a save, reset or delete); not mid-save.
  const [seenRoles, setSeenRoles] = useState(apiRoles);
  if (apiRoles !== seenRoles && !saving) {
    setSeenRoles(apiRoles);
    if (HAS_API && apiRoles.length > 0) {
      setRolePerms(buildRolePermissionsMap(apiRoles));
      setDirtyIds(EMPTY_SET);
    }
  }

  const defaultRole = apiRoles.find((r) => r.name === 'hub_manager') ?? allRoles[0];
  const phoneRole = allRoles.some((r) => r._id === phoneRoleId) ? phoneRoleId : defaultRole?._id ?? '';

  const { confirm, dialog } = useSettingsConfirm({
    systemRoles: systemRolesOnly,
    syncRolesFromApi,
    setRolesDirty,
    onDone: (a) => {
      if (a.type === 'deleteRole' && phoneRole === a.payload) setPhoneRoleId('');
    },
  });

  const edit = (roleId: string, next: Permission[]) => {
    setRolePerms((prev) => ({ ...prev, [roleId]: next }));
    setDirtyIds((prev) => new Set(prev).add(roleId));
  };
  const isLocked = (roleId: string) => {
    const role = allRoles.find((r) => r._id === roleId);
    return !role || isCompanyAdminRole(role);
  };

  const togglePermission = (roleId: string, perm: Permission) => {
    if (isLocked(roleId)) return;
    const current = rolePerms[roleId] || [];
    edit(roleId, current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm]);
  };

  const toggleAllInGroup = (roleId: string, group: PermissionGroup) => {
    if (isLocked(roleId)) return;
    const current = rolePerms[roleId] || [];
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => current.includes(k));
    edit(roleId, allSelected ? current.filter((p) => !groupKeys.includes(p)) : [...new Set([...current, ...groupKeys])]);
  };

  const dirtyRoles = allRoles.filter((r) => dirtyIds.has(r._id));

  const handleSaveRoles = async () => {
    if (!HAS_API || dirtyRoles.length === 0) {
      toast.error('Connect to the API to save role permissions.');
      return;
    }
    setSaving(true);
    const saved: string[] = [];
    try {
      for (const role of dirtyRoles) {
        await updateRole.mutateAsync({ id: role._id, permissions: fePermissionsToApiInput(rolePerms[role._id] ?? []) });
        saved.push(role._id);
      }
      setDirtyIds(EMPTY_SET);
      toast.success(`Permissions saved for ${dirtyRoles.map(roleLabel).join(', ')}.`);
    } catch (err) {
      // Keep the roles that didn't save marked as edited.
      setDirtyIds((prev) => new Set([...prev].filter((id) => !saved.includes(id))));
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { syncRolesFromApi(); setDirtyIds(EMPTY_SET); };

  const onRoleCreated = (created: ApiRole) => {
    setShowRoleSheet(false);
    setPhoneRoleId(created._id);
    setRolePerms((prev) => ({ ...prev, [created._id]: [] }));
  };

  return (
    <section aria-labelledby="settings-roles" className="space-y-5">
      <SectionHeading
        id="settings-roles"
        title="Roles and access"
        description="What each role can see and do across the CRM. Company admin always has full access."
        action={HAS_API && canManageRoles && (
          <>
            <button type="button" onClick={() => setShowRoleSheet(true)} className={btnPrimary}><Plus aria-hidden /> Add role</button>
            <OverflowMenu
              label="More role actions"
              items={[{ label: 'Reset system roles to defaults', icon: <RotateCcw />, destructive: true, onSelect: () => confirm('resetRoles') }]}
            />
          </>
        )}
      />

      {!HAS_API ? (
        <div className="rounded-xl border bg-card"><EmptyState size="compact" icon={<Shield />} title="Roles need the API" description="Connect to the API to manage roles and permissions." /></div>
      ) : !canManageRoles ? (
        <div className="rounded-xl border bg-card"><EmptyState size="compact" icon={<Shield />} title="No access" description="You don't have permission to manage roles and permissions." /></div>
      ) : (
        <>
          <div className="md:hidden">
            <FilterSelect
              ariaLabel="Role to show"
              value={phoneRole}
              onChange={setPhoneRoleId}
              options={allRoles.map((r) => ({ value: r._id, label: `${roleLabel(r)}${dirtyIds.has(r._id) ? ' (edited)' : ''}` }))}
            />
          </div>
          <RolesMatrix
            roles={allRoles}
            rolePerms={rolePerms}
            dirtyIds={dirtyIds}
            phoneRoleId={phoneRole}
            onTogglePermission={togglePermission}
            onToggleGroup={toggleAllInGroup}
            onDeleteRole={(id) => confirm('deleteRole', id)}
          />
          {dirtyRoles.length > 0 && (
            <UnsavedBar
              message={<>Unsaved changes for <span className="text-primary">{dirtyRoles.map(roleLabel).join(', ')}</span></>}
              onDiscard={discard}
              onSave={() => void handleSaveRoles()}
              saving={saving}
              saveLabel="Save permissions"
            />
          )}
        </>
      )}

      {showRoleSheet && <RoleFormSheet onClose={() => setShowRoleSheet(false)} onCreated={onRoleCreated} />}
      {dialog}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useDeleteAgent, useDeleteHub, useDeleteRole, useUpdateAgent, useUpdateHub, useUpdateRole,
} from '@/hooks/use-queries';
import { HAS_API } from '@/lib/require-api';
import { defaultPermissionsForRoleLabel, fePermissionsToApiInput, isCompanyAdminRole } from '@/lib/role-permissions';
import { runConfirmAction, type ConfirmActionType } from '@/lib/settings-helpers';
import type { ApiRole } from '@/types/api';
import { ConfirmDialog } from './settings-ui';

type Action = { type: ConfirmActionType; payload?: string };

const SUCCESS: Record<ConfirmActionType, string> = {
  deleteUser: 'User deleted.',
  deactivateUser: 'User deactivated.',
  deleteHub: 'Location deleted.',
  deactivateHub: 'Location deactivated.',
  deleteRole: 'Role deleted.',
  resetRoles: 'System role permissions reset to defaults.',
};

/**
 * Confirmation flow for destructive settings actions. Runs the shared `runConfirmAction`
 * with every mutation it may need; roles pass their sync callbacks.
 */
export function useSettingsConfirm(opts: {
  systemRoles?: ApiRole[];
  syncRolesFromApi?: () => void;
  setRolesDirty?: (dirty: boolean) => void;
  onDone?: (action: Action) => void;
} = {}) {
  const [action, setAction] = useState<Action | null>(null);
  const deleteAgent = useDeleteAgent();
  const updateAgent = useUpdateAgent();
  const deleteHub = useDeleteHub();
  const updateHub = useUpdateHub();
  const deleteRole = useDeleteRole();
  const updateRole = useUpdateRole();
  const busy = deleteAgent.isPending || updateAgent.isPending || deleteHub.isPending || updateHub.isPending || deleteRole.isPending || updateRole.isPending;

  const execute = async () => {
    if (!action) return;
    const current = action;
    try {
      await runConfirmAction(current, {
        hasApi: HAS_API,
        systemRoles: opts.systemRoles ?? [],
        onDeleteUser: (id) => deleteAgent.mutateAsync(id),
        onDeactivateUser: (id) => updateAgent.mutateAsync({ id, is_active: false }),
        onDeleteHub: (id) => deleteHub.mutateAsync(id),
        onDeactivateHub: (id) => updateHub.mutateAsync({ id, is_active: false }),
        onDeleteRole: (id) => deleteRole.mutateAsync(id),
        onUpdateRole: (id, permissions) => updateRole.mutateAsync({ id, permissions }),
        syncRolesFromApi: opts.syncRolesFromApi ?? (() => undefined),
        setRolesDirty: opts.setRolesDirty ?? (() => undefined),
        defaultPermissionsForRoleLabel,
        fePermissionsToApiInput,
        isCompanyAdminRole,
      });
      opts.onDone?.(current);
      toast.success(SUCCESS[current.type]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    }
    setAction(null);
  };

  const dialog = action ? <ConfirmDialog type={action.type} busy={busy} onCancel={() => setAction(null)} onConfirm={() => void execute()} /> : null;

  return { confirm: (type: ConfirmActionType, payload?: string) => setAction({ type, payload }), dialog };
}

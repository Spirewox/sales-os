'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useCreateAgent, useUpdateAgent } from '@/hooks/use-queries';
import { HAS_API } from '@/lib/require-api';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { buildRolePermissionsMap, permissionGroupDisplay, roleLabel } from '@/lib/role-permissions';
import {
  countGroupPermissions, isCompanyAdminSelection, isPosRoleSelection, resolveRoleId, resolveUserHubId, validateUserSave,
} from '@/lib/settings-helpers';
import { hubOptionLabel } from '@/lib/api-mappers';
import { FormField, FormSection, FormSheet, StatusBadge, fieldClass } from '@/components/app';
import type { Agent, Hub } from '@/types';
import type { ApiRole } from '@/types/api';
import { SheetSelect } from './sheet-select';

type Props = {
  initial: Partial<Agent>;
  onClose: () => void;
  apiRoles: ApiRole[];
  hubs: Hub[];
  activeHubs: Hub[];
  canSwitchHubs: boolean;
  scopeHubId: string | null | undefined;
};

/** Add or edit a team member. Save logic is unchanged from the old modal. */
export function UserFormSheet({ initial, onClose, apiRoles, hubs, activeHubs, canSwitchHubs, scopeHubId }: Readonly<Props>) {
  const { user } = useAuth();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const [editingUser, setEditingUser] = useState<Partial<Agent>>(initial);
  const patch = (p: Partial<Agent>) => setEditingUser((u) => ({ ...u, ...p }));
  const rolePerms = useMemo(() => buildRolePermissionsMap(apiRoles), [apiRoles]);

  const isAdminRole = (roleLabelName: string) => isCompanyAdminSelection(apiRoles, roleLabelName);

  const handleSaveUser = async () => {
    const roleLabelName = editingUser.role ?? 'Hub Manager';
    const roleId = resolveRoleId(apiRoles, roleLabelName);
    const isPosRole = isPosRoleSelection(roleLabelName);
    const hubId = resolveUserHubId(apiRoles, roleLabelName, editingUser.location, canSwitchHubs, scopeHubId ?? undefined, hubs);
    const validationError = validateUserSave(editingUser, HAS_API, roleId, hubId, isAdminRole(roleLabelName));
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const userName = editingUser.name ?? '';
    const userEmail = editingUser.email ?? '';

    try {
      if (editingUser.id) {
        await updateAgent.mutateAsync({
          id: editingUser.id,
          full_name: userName,
          email: userEmail,
          username: editingUser.username,
          phone: editingUser.phone || '',
          ...(roleId ? { role_id: roleId } : {}),
          ...(hubId === undefined ? {} : { hub_id: hubId }),
        });
        toast.success('User saved.');
      } else {
        if (!roleId) {
          toast.error('Invalid role selected.');
          return;
        }
        await createAgent.mutateAsync({
          full_name: userName,
          email: userEmail,
          username: editingUser.username,
          phone: editingUser.phone || '',
          role_id: roleId,
          hub_id: hubId,
        });
        toast.success(
          isPosRole
            ? 'User created. A 4-digit POS PIN was emailed.'
            : roleLabelName === 'Hub Manager'
              ? 'User created. Login details and a till PIN were emailed.'
              : 'User created. A welcome email with login details was sent.',
        );
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user.');
    }
  };

  const roleOptions = apiRoles
    .filter((r) => r.name !== 'cashier' || (!!editingUser.id && editingUser.role === roleLabel(r)))
    .map((r) => ({ value: roleLabel(r), label: roleLabel(r) }));
  const hubChoices = canSwitchHubs ? activeHubs : hubs.filter((h) => h.id === scopeHubId || h.name === user?.hubName);
  const adminRole = isAdminRole(editingUser.role ?? '');
  const previewKey = resolveRoleId(apiRoles, editingUser.role ?? '') ?? '';
  const preview = PERMISSION_GROUPS.map((group) => {
    const groupPerms = group.permissions.map((p) => p.key);
    const count = countGroupPermissions(groupPerms, rolePerms[previewKey] || []);
    return { label: permissionGroupDisplay(group.label).label, count, total: groupPerms.length };
  }).filter((g) => g.count > 0);
  const missing = !editingUser.name?.trim() ? 'Enter a name' : !editingUser.email?.trim() ? 'Enter an email' : null;

  return (
    <FormSheet
      title={editingUser.id ? 'Edit user' : 'Add user'}
      description={editingUser.id ? editingUser.email : 'They get an email with their sign-in details.'}
      onClose={onClose}
      onSubmit={() => void handleSaveUser()}
      submitLabel={editingUser.id ? 'Save user' : 'Add user'}
      submitting={createAgent.isPending || updateAgent.isPending}
      disabledReason={missing}
    >
      <FormSection title="Details">
        <FormField label="Name" htmlFor="user-name" required>
          <input id="user-name" type="text" value={editingUser.name || ''} onChange={(e) => patch({ name: e.target.value })} className={fieldClass} autoComplete="off" />
        </FormField>
        <FormField label="Email" htmlFor="user-email" required>
          <input id="user-email" type="email" value={editingUser.email || ''} onChange={(e) => patch({ email: e.target.value })} className={fieldClass} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Username" htmlFor="user-username" hint="Optional">
            <input id="user-username" type="text" value={editingUser.username || ''} onChange={(e) => patch({ username: e.target.value })} className={fieldClass} autoComplete="off" />
          </FormField>
          <FormField label="Phone" htmlFor="user-phone">
            <input id="user-phone" type="tel" value={editingUser.phone || ''} onChange={(e) => patch({ phone: e.target.value })} className={fieldClass} autoComplete="off" />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Role and location">
        <div className={adminRole ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
          <FormField label="Role" htmlFor="user-role">
            <SheetSelect id="user-role" value={editingUser.role ?? ''} onChange={(v) => patch({ role: v })} options={roleOptions} disabled={!canSwitchHubs && !!editingUser.id} />
          </FormField>
          {!adminRole && (
            <FormField label="Location" htmlFor="user-hub" required>
              <SheetSelect
                id="user-hub"
                value={editingUser.location ?? ''}
                onChange={(v) => patch({ location: v })}
                options={hubChoices.map((h) => ({ value: h.name, label: hubOptionLabel(h) }))}
                disabled={!canSwitchHubs}
              />
            </FormField>
          )}
        </div>
        {isPosRoleSelection(editingUser.role) && (
          <p className="text-xs text-muted-foreground">This person signs in on the POS till with a 4-digit PIN. The PIN is emailed and is not a Sales-OS password.</p>
        )}
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">What this role can do</p>
          {preview.length === 0 ? (
            <p className="text-xs text-muted-foreground">No permissions yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {preview.map((g) => (
                <StatusBadge key={g.label} tone={g.count === g.total ? 'good' : 'neutral'}>
                  <span className="tabular-nums">{g.label} {g.count}/{g.total}</span>
                </StatusBadge>
              ))}
            </div>
          )}
        </div>
      </FormSection>
    </FormSheet>
  );
}

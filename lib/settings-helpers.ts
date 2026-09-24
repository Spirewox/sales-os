import { ApiRole } from '@/types/api';
import { Agent, Hub } from '@/types';
import { Permission, RoleName } from '@/lib/permissions';

export const ROLE_COLOR_MAP: Record<RoleName, string> = {
  'Company Admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Hub Manager': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Customer Success': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Cashier: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export function isPosRoleSelection(roleLabelName?: string): boolean {
  return roleLabelName === 'Cashier';
}

export function canRegenerateTillPin(roleLabelName?: string): boolean {
  return roleLabelName === 'Cashier' || roleLabelName === 'Hub Manager';
}

const CUSTOM_ROLE_COLOR = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export function getRoleBadgeClasses(label: string): string {
  return ROLE_COLOR_MAP[label as RoleName] ?? CUSTOM_ROLE_COLOR;
}

export function getRoleDotClass(label: string): string {
  return getRoleBadgeClasses(label).split(' ')[0];
}

export type ConfirmActionType = 'deleteUser' | 'deleteHub' | 'deleteRole' | 'resetData' | 'resetRoles';

export function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: 'w-0' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return { label: 'Weak', color: 'bg-destructive', width: 'w-1/3' };
  if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
}

export function getPasswordStrengthTextClass(color: string): string {
  if (color === 'bg-destructive') return 'text-destructive';
  if (color === 'bg-yellow-500') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function formatHubCountLabel(activeCount: number, totalCount: number): string {
  const plural = activeCount === 1 ? '' : 's';
  return `${activeCount} active hub${plural} · ${totalCount} total`;
}

export function getConfirmActionMessage(type: ConfirmActionType): string {
  if (type === 'deleteUser') {
    return 'This will permanently delete this user. This action cannot be undone.';
  }
  if (type === 'deleteHub') {
    return 'This will permanently delete this hub. Ensure no team members, inventory, or customers are assigned to it.';
  }
  if (type === 'deleteRole') {
    return 'This will permanently delete this custom role. Users assigned to it may lose access until reassigned.';
  }
  if (type === 'resetRoles') {
    return 'This will reset system role permissions to their factory defaults. Custom roles are not affected.';
  }
  return 'This will erase all CRM data and restore factory defaults. This action cannot be undone.';
}

export function getPermissionGroupCheckboxClass(
  allSelected: boolean,
  someSelected: boolean,
  disabled: boolean,
): string {
  let stateClass = 'border-muted-foreground/30 hover:border-primary';
  if (allSelected) stateClass = 'bg-primary border-primary text-white';
  else if (someSelected) stateClass = 'border-primary bg-primary/20';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  return `h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${stateClass} ${disabledClass}`;
}

export function resolveRoleId(apiRoles: ApiRole[], roleLabelName: string): string | undefined {
  return apiRoles.find(
    (r) => r.label === roleLabelName || r.name === roleLabelName.replace(/\s+/g, '_').toLowerCase(),
  )?._id;
}

export function resolveHubId(hubs: Hub[], hubName: string): string | undefined {
  return hubs.find((h) => h.name === hubName)?.id;
}

export function isCompanyAdminSelection(apiRoles: ApiRole[], roleLabelName: string): boolean {
  if (roleLabelName === 'Company Admin') return true;
  return apiRoles.some((r) => r.label === roleLabelName && r.name === 'company_admin');
}

export function resolveUserHubId(
  apiRoles: ApiRole[],
  roleLabel: string | undefined,
  location: string | undefined,
  canSwitchHubs: boolean,
  scopeHubId: string | undefined,
  hubs: Hub[],
): string | undefined {
  if (!roleLabel || isCompanyAdminSelection(apiRoles, roleLabel)) return undefined;
  if (canSwitchHubs) return resolveHubId(hubs, location || '');
  return scopeHubId;
}

export function validateUserSave(
  editingUser: Partial<Agent>,
  hasApi: boolean,
  roleId: string | undefined,
  hubId: string | undefined,
  isAdminRole: boolean,
): string | null {
  if (!editingUser.name || !editingUser.email) return 'Name and email required.';
  if (hasApi && !roleId) return 'Invalid role selected.';
  if (hasApi && !isAdminRole && !hubId) return 'Hub is required for this role.';
  return null;
}

export function countGroupPermissions(groupPerms: Permission[], rolePerms: Permission[]): number {
  return groupPerms.filter((k) => rolePerms.includes(k)).length;
}

type ConfirmAction = { type: ConfirmActionType; payload?: string };

type ConfirmActionDeps = {
  hasApi: boolean;
  systemRoles: ApiRole[];
  onDeleteUser: (id: string) => Promise<unknown>;
  onDeleteHub: (id: string) => Promise<unknown>;
  onDeleteRole?: (id: string) => Promise<unknown>;
  onUpdateRole: (id: string, permissions: { module: string; submodules: string[] }[]) => Promise<unknown>;
  syncRolesFromApi: () => void;
  setRolesDirty: (dirty: boolean) => void;
  defaultPermissionsForRoleLabel: (label: string) => Permission[];
  fePermissionsToApiInput: (perms: Permission[]) => { module: string; submodules: string[] }[];
  isCompanyAdminRole: (role: ApiRole) => boolean;
};

async function updateNonAdminRolePermissions(deps: ConfirmActionDeps): Promise<void> {
  const rolesToReset = deps.systemRoles.filter((role) => !deps.isCompanyAdminRole(role));
  for (const role of rolesToReset) {
    await deps.onUpdateRole(
      role._id,
      deps.fePermissionsToApiInput(deps.defaultPermissionsForRoleLabel(role.label)),
    );
  }
}

async function resetAllRolePermissions(deps: ConfirmActionDeps): Promise<void> {
  if (!deps.hasApi) {
    throw new Error('Connect to the API to reset role permissions.');
  }
  await updateNonAdminRolePermissions(deps);
  deps.syncRolesFromApi();
  deps.setRolesDirty(false);
}

export async function runConfirmAction(action: ConfirmAction, deps: ConfirmActionDeps): Promise<void> {
  if (action.type === 'deleteUser' && action.payload) {
    await deps.onDeleteUser(action.payload);
    return;
  }
  if (action.type === 'deleteHub' && action.payload) {
    await deps.onDeleteHub(action.payload);
    return;
  }
  if (action.type === 'deleteRole' && action.payload) {
    if (!deps.onDeleteRole) throw new Error('Role deletion is not available.');
    await deps.onDeleteRole(action.payload);
    return;
  }
  if (action.type === 'resetData') {
    throw new Error('Local demo data reset is no longer available. Use the API-backed environment.');
  }
  if (action.type === 'resetRoles') {
    await resetAllRolePermissions(deps);
  }
}

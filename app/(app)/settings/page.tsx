'use client';

import { useState, useEffect, useMemo, useCallback, type SubmitEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent,
  useHubs, useCreateHub, useUpdateHub, useDeleteHub, useUpgradeHub, useDowngradeHub,
  useRoles, useCreateRole, useUpdateRole, useDeleteRole, useResetPassword, useUpdateProfile,
} from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { useDataScope } from '@/hooks/use-data-scope';
import { HAS_API } from '@/lib/require-api';
import {
  PERMISSION_GROUPS, Permission,
} from '@/lib/permissions';
import {
  buildRolePermissionsMap,
  defaultPermissionsForRoleLabel,
  fePermissionsToApiInput,
  isCompanyAdminRole,
  roleLabel,
} from '@/lib/role-permissions';
import {
  getRoleBadgeClasses,
  getRoleDotClass,
  countGroupPermissions,
  formatHubCountLabel,
  getConfirmActionMessage,
  getPasswordStrength,
  getPasswordStrengthTextClass,
  getPermissionGroupCheckboxClass,
  isCompanyAdminSelection,
  resolveRoleId,
  resolveUserHubId,
  runConfirmAction,
  validateUserSave,
  type ConfirmActionType,
} from '@/lib/settings-helpers';
import { ApiRole } from '@/types/api';
import { Agent, Hub, OwnershipType } from '@/types';
import { hubOptionLabel } from '@/lib/api-mappers';
import { toast } from 'sonner';
import { SubmitButton } from '@/components/submit-button';
import {
  Save, User, Lock, Moon, Sun, Trash2, AlertTriangle,
  Users, Plus, X, Pencil, MapPin, Building2, Shield,
  ChevronDown, ChevronRight, Check, RotateCcw,
} from 'lucide-react';

const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const labelCls = 'text-sm font-medium';
const btnPrimary = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2';
const btnSecondary = 'inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2';

export default function SettingsPage() {
  const { user, refetch: refetchUser } = useAuth();
  const { canSwitchHubs, hubId: scopeHubId } = useDataScope();
  const agentsQuery = useMemo(
    () => (HAS_API && !canSwitchHubs && scopeHubId ? { hub_id: scopeHubId, limit: 200 } : { limit: 200 }),
    [canSwitchHubs, scopeHubId],
  );
  const { data: agents = [] } = useAgents(agentsQuery);
  const { data: hubs = [] } = useHubs();
  const { data: apiRoles = [] } = useRoles();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const createHub = useCreateHub();
  const updateHub = useUpdateHub();
  const deleteHub = useDeleteHub();
  const upgradeHub = useUpgradeHub();
  const downgradeHub = useDowngradeHub();
  const updateRole = useUpdateRole();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const resetPassword = useResetPassword();
  const updateProfile = useUpdateProfile();
  const { can } = usePermissions();

  const allRoles: ApiRole[] = useMemo(() => {
    if (!HAS_API || apiRoles.length === 0) return [];
    return [...apiRoles].sort((a, b) => {
      const aSystem = a.is_system !== false ? 0 : 1;
      const bSystem = b.is_system !== false ? 0 : 1;
      if (aSystem !== bSystem) return aSystem - bSystem;
      return a.label.localeCompare(b.label);
    });
  }, [apiRoles]);

  const systemRolesOnly: ApiRole[] = useMemo(
    () => allRoles.filter((r) => r.is_system !== false),
    [allRoles],
  );

  const canManageUsers = can('settings.manage_users');
  const canManageHubs = can('settings.manage_hubs');
  const canManageRoles = can('settings.manage_roles');
  const canResetData = can('settings.reset_data');

  const activeHubs = hubs.filter((h) => h.isActive);
  const hubOnlyLocations = activeHubs.filter((h) => h.locationType === 'hub');

  const [activeTab, setActiveTab] = useState<'Profile' | 'Users' | 'Hubs' | 'Roles & Permissions' | 'Preferences' | 'Data'>('Profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.hubName ?? user?.location ?? 'All Hubs');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Agent>>({ role: 'Hub Manager', location: activeHubs[0]?.name || 'Lagos' });
  const [confirmAction, setConfirmAction] = useState<{ type: ConfirmActionType; payload?: string } | null>(null);

  // Hub management state
  const [showHubModal, setShowHubModal] = useState(false);
  const [editingHub, setEditingHub] = useState<Partial<Hub>>({ isActive: true, locationType: 'hub' });
  const [hubTypeFilter, setHubTypeFilter] = useState<'all' | 'hub' | 'rsp'>('all');
  const [downgradingHub, setDowngradingHub] = useState<Hub | null>(null);
  const [downgradeManagerAction, setDowngradeManagerAction] = useState<'keep' | 'reassign'>('keep');
  const [downgradeReassignHubId, setDowngradeReassignHubId] = useState('');
  const [downgradeParentHubId, setDowngradeParentHubId] = useState('');
  const [downgradeOwnershipType, setDowngradeOwnershipType] = useState<OwnershipType>('RO');
  const [childRspActions, setChildRspActions] = useState<Record<string, { action: 'reassign' | 'standalone'; target_hub_id?: string }>>({});

  const filteredHubs = useMemo(() => {
    if (hubTypeFilter === 'all') return hubs;
    return hubs.filter((h) => h.locationType === hubTypeFilter);
  }, [hubs, hubTypeFilter]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({ label: '', description: '' });

  // Roles & Permissions state
  const [rolePerms, setRolePerms] = useState<Record<string, Permission[]>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(PERMISSION_GROUPS.map((g) => g.label)));
  const [rolesDirty, setRolesDirty] = useState(false);

  const selectedRoleRecord = useMemo(
    () => allRoles.find((r) => r._id === selectedRoleId) ?? allRoles[0],
    [allRoles, selectedRoleId],
  );
  const selectedRoleLabel = selectedRoleRecord ? roleLabel(selectedRoleRecord) : 'Hub Manager';

  const syncRolesFromApi = useCallback(() => {
    if (!HAS_API || apiRoles.length === 0) return;
    setRolePerms(buildRolePermissionsMap(apiRoles));
    if (!selectedRoleId) {
      const defaultRole = apiRoles.find((r) => r.name === 'hub_manager') ?? apiRoles[0];
      setSelectedRoleId(defaultRole._id);
    }
  }, [apiRoles, selectedRoleId]);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    syncRolesFromApi();
  }, [syncRolesFromApi]);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setLocation(user.hubName ?? user.location ?? '');
  }, [user]);

  // ── Profile ──
  const handleProfileUpdate = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!HAS_API) {
      toast.info('Connect to the API to save profile changes.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        full_name: name.trim(),
        phone: phone.trim(),
      });
      refetchUser();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  const handlePasswordUpdate = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password.'); return; }
    if (!newPassword || newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    try {
      await resetPassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.');
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('fudfarmer_theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('fudfarmer_theme', 'light'); }
  };

  const isAdminRole = (roleLabelName: string) => isCompanyAdminSelection(apiRoles, roleLabelName);

  // ── Users ──
  const handleSaveUser = async () => {
    const roleLabelName = editingUser.role ?? 'Hub Manager';
    const roleId = resolveRoleId(apiRoles, roleLabelName);
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
          phone: editingUser.phone || '',
          role_id: roleId,
          hub_id: hubId,
        });
        toast.success('User created. A welcome email with login details was sent.');
      }
      setShowUserModal(false);
      setEditingUser({ role: 'Hub Manager', location: activeHubs[0]?.name || user?.hubName || 'Lagos' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user.');
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === user?.id) { toast.error("Can't delete yourself."); return; }
    setConfirmAction({ type: 'deleteUser', payload: id });
  };

  // ── Hubs ──
  const handleSaveHub = async () => {
    if (!editingHub.name) { toast.error('Hub name is required.'); return; }
    const duplicate = hubs.find((h) => h.name.toLowerCase() === editingHub.name!.toLowerCase() && h.id !== editingHub.id);
    if (duplicate) { toast.error('A hub with that name already exists.'); return; }
    if (editingHub.locationType === 'rsp' && !editingHub.ownershipType) {
      toast.error('Select ownership type for this RSP (Retail Owned or Retail Franchise).');
      return;
    }

    try {
      const hubManager = editingHub.hubManagerId || null;
      if (editingHub.id) {
        await updateHub.mutateAsync({
          id: editingHub.id,
          hub_name: editingHub.name,
          hub_address: editingHub.address,
          hub_phone: editingHub.phone,
          hub_manager: hubManager,
          is_active: editingHub.isActive,
          location_type: editingHub.locationType,
          parent_hub: editingHub.locationType === 'rsp' ? (editingHub.parentHubId || null) : null,
          ownership_type: editingHub.locationType === 'rsp' ? editingHub.ownershipType ?? undefined : undefined,
        });
      } else {
        const hubName = editingHub.name ?? '';
        await createHub.mutateAsync({
          hub_name: hubName,
          hub_address: editingHub.address,
          hub_phone: editingHub.phone,
          hub_manager: hubManager || undefined,
          is_active: editingHub.isActive !== false,
          location_type: editingHub.locationType ?? 'hub',
          parent_hub: editingHub.locationType === 'rsp' ? (editingHub.parentHubId || null) : null,
          ownership_type: editingHub.locationType === 'rsp' ? editingHub.ownershipType ?? undefined : undefined,
        });
      }
      setShowHubModal(false);
      setEditingHub({ isActive: true, locationType: 'hub' });
      toast.success('Hub saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save hub.');
    }
  };

  const handleToggleHub = async (hub: Hub) => {
    try {
      await updateHub.mutateAsync({ id: hub.id, is_active: !hub.isActive });
      toast.success(hub.isActive ? `Hub "${hub.name}" deactivated.` : `Hub "${hub.name}" activated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update hub.');
    }
  };

  const handleDeleteHub = (id: string) => {
    setConfirmAction({ type: 'deleteHub', payload: id });
  };

  const openDowngradeModal = (hub: Hub) => {
    const children = hubs.filter((h) => h.parentHubId === hub.id);
    const actions: Record<string, { action: 'reassign' | 'standalone'; target_hub_id?: string }> = {};
    for (const child of children) {
      actions[child.id] = { action: 'standalone' };
    }
    setChildRspActions(actions);
    setDowngradeManagerAction('keep');
    setDowngradeReassignHubId('');
    setDowngradeParentHubId('');
    setDowngradeOwnershipType('RO');
    setDowngradingHub(hub);
  };

  const handleConfirmDowngrade = async () => {
    if (!downgradingHub) return;
    const children = hubs.filter((h) => h.parentHubId === downgradingHub.id);
    try {
      await downgradeHub.mutateAsync({
        id: downgradingHub.id,
        child_rsp_actions: children.map((c) => ({
          rsp_id: c.id,
          action: childRspActions[c.id]?.action ?? 'standalone',
          target_hub_id: childRspActions[c.id]?.target_hub_id,
        })),
        manager_action: downgradeManagerAction,
        reassign_hub_id: downgradeManagerAction === 'reassign' ? downgradeReassignHubId : undefined,
        parent_hub_id: downgradeParentHubId || null,
        ownership_type: downgradeOwnershipType,
      });
      setDowngradingHub(null);
      toast.success(`"${downgradingHub.name}" downgraded to RSP.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to downgrade hub.');
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

  // ── Roles & Permissions ──
  const rolePermKey = selectedRoleId;

  const togglePermission = (perm: Permission) => {
    if (selectedRoleRecord && isCompanyAdminRole(selectedRoleRecord)) return;
    const current = rolePerms[rolePermKey] || [];
    const next = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
    setRolePerms({ ...rolePerms, [rolePermKey]: next });
    setRolesDirty(true);
  };

  const toggleGroup = (groupLabel: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupLabel)) next.delete(groupLabel); else next.add(groupLabel);
    setExpandedGroups(next);
  };

  const toggleAllInGroup = (group: typeof PERMISSION_GROUPS[0]) => {
    if (selectedRoleRecord && isCompanyAdminRole(selectedRoleRecord)) return;
    const current = rolePerms[rolePermKey] || [];
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => current.includes(k));
    const next = allSelected
      ? current.filter((p) => !groupKeys.includes(p))
      : [...new Set([...current, ...groupKeys])];
    setRolePerms({ ...rolePerms, [rolePermKey]: next });
    setRolesDirty(true);
  };

  const handleSaveRoles = async () => {
    if (!HAS_API || !selectedRoleId) {
      toast.error('Connect to the API to save role permissions.');
      return;
    }
    const perms = rolePerms[rolePermKey] ?? [];
    try {
      await updateRole.mutateAsync({
        id: selectedRoleId,
        permissions: fePermissionsToApiInput(perms),
      });
      setRolesDirty(false);
      toast.success(`Permissions saved for ${selectedRoleLabel}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions.');
    }
  };

  const handleResetRoles = () => {
    setConfirmAction({ type: 'resetRoles' });
  };

  const handleCreateRole = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedLabel = newRole.label.trim();
    if (!trimmedLabel) {
      toast.error('Role name is required.');
      return;
    }
    const slug = trimmedLabel.toLowerCase().replace(/\s+/g, '_');
    try {
      const created = await createRole.mutateAsync({
        name: slug,
        label: trimmedLabel,
        description: newRole.description.trim() || undefined,
        permissions: fePermissionsToApiInput([]),
      });
      setShowRoleModal(false);
      setNewRole({ label: '', description: '' });
      setSelectedRoleId(created._id);
      setRolePerms((prev) => ({ ...prev, [created._id]: [] }));
      toast.success(`Role "${trimmedLabel}" created.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create role.');
    }
  };

  const handleDeleteRole = (id: string) => {
    setConfirmAction({ type: 'deleteRole', payload: id });
  };

  const selectedPerms = rolePerms[rolePermKey] || [];
  const totalPerms = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);
  const isAdminRoleSelected = selectedRoleRecord
    ? isCompanyAdminRole(selectedRoleRecord)
    : false;

  const roleTabs = useMemo(
    () => allRoles.map((r) => ({
      id: r._id,
      label: roleLabel(r),
      isCustom: r.is_system === false,
    })),
    [allRoles],
  );

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    try {
      await runConfirmAction(action, {
        hasApi: HAS_API,
        systemRoles: systemRolesOnly,
        onDeleteUser: (id) => deleteAgent.mutateAsync(id),
        onDeleteHub: (id) => deleteHub.mutateAsync(id),
        onDeleteRole: (id) => deleteRole.mutateAsync(id),
        onUpdateRole: (id, permissions) => updateRole.mutateAsync({ id, permissions }),
        syncRolesFromApi,
        setRolesDirty,
        defaultPermissionsForRoleLabel,
        fePermissionsToApiInput,
        isCompanyAdminRole,
      });
      if (action.type === 'deleteUser') toast.success('User deleted.');
      else if (action.type === 'deleteHub') toast.success('Hub deleted.');
      else if (action.type === 'deleteRole') {
        if (selectedRoleId === action.payload) {
          const remaining = allRoles.filter((r) => r._id !== action.payload);
          setSelectedRoleId(remaining[0]?._id ?? '');
        }
        toast.success('Role deleted.');
      } else if (action.type === 'resetRoles') toast.success('System role permissions reset to defaults.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    }
    setConfirmAction(null);
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const tabs = ['Profile', 'Users', 'Hubs', 'Roles & Permissions', 'Preferences', 'Data'] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-muted-foreground">Manage your profile, team, hubs, roles, and preferences.</p></div>

      <div className="flex border-b overflow-x-auto">{tabs.map((tab) => (
        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          {tab === 'Roles & Permissions' && <Shield size={14} />}
          {tab}
        </button>
      ))}</div>

      {/* ══════ PROFILE TAB ══════ */}
      {activeTab === 'Profile' && (
        <div className="space-y-8">
          <form onSubmit={handleProfileUpdate} className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><User size={18} /> Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label htmlFor="profile-name" className={labelCls}>Full Name</label><input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label htmlFor="profile-email" className={labelCls}>Email</label><input id="profile-email" type="email" value={email} readOnly disabled className={`${inputCls} opacity-70 cursor-not-allowed`} title="Email is managed by your administrator" /></div>
              <div className="space-y-2"><label htmlFor="profile-phone" className={labelCls}>Phone</label><input id="profile-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label htmlFor="profile-hub" className={labelCls}>Hub</label>
                <input id="profile-hub" type="text" value={location || '—'} readOnly disabled className={`${inputCls} opacity-70 cursor-not-allowed`} title="Hub is assigned by your administrator" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getRoleBadgeClasses(user?.role ?? '')}`}>{user?.role}</span>
              <span className="text-xs text-muted-foreground">Role assigned by Company Admin</span>
            </div>
            <SubmitButton type="submit" loading={updateProfile.isPending} className={btnPrimary}><Save size={14} className="mr-2" /> Save Changes</SubmitButton>
          </form>

          <form onSubmit={handlePasswordUpdate} className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Lock size={18} /> Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2"><label htmlFor="current-password" className={labelCls}>Current Password</label><input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} autoComplete="current-password" /></div>
              <div className="space-y-2"><label htmlFor="new-password" className={labelCls}>New Password</label><input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} autoComplete="new-password" />{newPassword && (<div className="mt-2 space-y-1"><div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} /></div><p className={`text-xs font-medium ${getPasswordStrengthTextClass(passwordStrength.color)}`}>{passwordStrength.label}</p></div>)}</div>
              <div className="space-y-2"><label htmlFor="confirm-password" className={labelCls}>Confirm Password</label><input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} autoComplete="new-password" /></div>
            </div>
            <SubmitButton type="submit" disabled={!HAS_API} loading={resetPassword.isPending} className={btnPrimary}><Lock size={14} className="mr-2" /> Update Password</SubmitButton>
            {!HAS_API && <p className="text-xs text-muted-foreground">Connect to the API to change your password.</p>}
          </form>
        </div>
      )}

      {/* ══════ USERS TAB ══════ */}
      {activeTab === 'Users' && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><Users size={18} /> Team Members</h3>
            {canManageUsers && <button onClick={() => { setEditingUser({ role: 'Hub Manager', location: activeHubs[0]?.name || 'Lagos' }); setShowUserModal(true); }} className={btnPrimary}><Plus size={14} className="mr-2" /> Add User</button>}
          </div>
          <div className="border rounded-lg divide-y">
            {agents.map((agent) => (
              <div key={agent.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold border">{agent.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeClasses(agent.role)}`}>{agent.role}</span>
                      <span className="text-xs text-muted-foreground">{agent.email} &middot; {agent.location}</span>
                    </div>
                  </div>
                </div>
                {canManageUsers && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUser(agent); setShowUserModal(true); }} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-accent"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteUser(agent.id)} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ HUBS TAB ══════ */}
      {activeTab === 'Hubs' && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Building2 size={18} /> Hubs &amp; RSPs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{formatHubCountLabel(activeHubs.length, hubs.length)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={hubTypeFilter}
                  onChange={(e) => setHubTypeFilter(e.target.value as 'all' | 'hub' | 'rsp')}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All locations</option>
                  <option value="hub">Hubs only</option>
                  <option value="rsp">RSPs only</option>
                </select>
                {canManageHubs && (
                  <button onClick={() => { setEditingHub({ isActive: true, locationType: 'hub' }); setShowHubModal(true); }} className={btnPrimary}>
                    <Plus size={14} className="mr-2" /> Add Location
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Parent Hub</th>
                    <th className="p-3 font-medium">Manager</th>
                    <th className="p-3 font-medium">Children</th>
                    <th className="p-3 font-medium">Status</th>
                    {canManageHubs && <th className="p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredHubs.map((hub) => {
                    const hubAgents = agents.filter((a) => a.location === hub.name);
                    return (
                      <tr key={hub.id} className={`border-b last:border-0 ${hub.isActive ? '' : 'opacity-50'}`}>
                        <td className="p-3">
                          <div className="font-medium">{hub.name}</div>
                          {hub.address && <div className="text-xs text-muted-foreground">{hub.address}</div>}
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">{hub.code || 'N/A'}</span>
                          {hub.locationType === 'rsp' && hub.ownershipType && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {hub.ownershipType === 'RO' ? 'Retail Owned' : 'Retail Franchise'}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.locationType === 'hub' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
                            {hub.locationType === 'hub' ? 'Hub' : 'RSP'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{hub.parentHubName ?? '—'}</td>
                        <td className="p-3">{hub.managerName ?? '—'}</td>
                        <td className="p-3">{hub.locationType === 'hub' ? (hub.childRspCount ?? 0) : '—'}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hub.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                            {hub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManageHubs && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => { setEditingHub(hub); setShowHubModal(true); }} className="text-xs text-primary hover:underline">Edit</button>
                              <button onClick={() => handleToggleHub(hub)} className="text-xs text-muted-foreground hover:underline">
                                {hub.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              {hub.locationType === 'rsp' && (
                                <button onClick={() => handleUpgradeHub(hub)} className="text-xs text-cyan-700 hover:underline">Upgrade</button>
                              )}
                              {hub.locationType === 'hub' && (
                                <button onClick={() => openDowngradeModal(hub)} className="text-xs text-amber-700 hover:underline">Downgrade</button>
                              )}
                              {hubAgents.length === 0 && (
                                <button onClick={() => handleDeleteHub(hub.id)} className="text-xs text-destructive hover:underline">Delete</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!canManageHubs && (
              <p className="text-xs text-muted-foreground italic">You don&apos;t have permission to manage hubs.</p>
            )}
          </div>
        </div>
      )}

      {/* ══════ ROLES & PERMISSIONS TAB ══════ */}
      {activeTab === 'Roles & Permissions' && (
        <div className="space-y-5">
          {HAS_API ? (
        <>
          {/* Role selector */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Shield size={18} /> Roles & Permissions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configure what each role can access and do across the CRM.</p>
              </div>
              <div className="flex gap-2">
                {canManageRoles && (
                  <button onClick={() => setShowRoleModal(true)} className={btnPrimary}><Plus size={14} className="mr-2" /> Add Role</button>
                )}
                <button onClick={handleResetRoles} className={btnSecondary}><RotateCcw size={14} className="mr-2" /> Reset All</button>
                {rolesDirty && <SubmitButton onClick={handleSaveRoles} loading={updateRole.isPending} className={btnPrimary}><Save size={14} className="mr-2" /> Save Changes</SubmitButton>}
              </div>
            </div>

            {/* Role pills */}
            <div className="flex flex-wrap gap-2">
              {roleTabs.map((role) => {
                const count = (rolePerms[role.id] || []).length;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${selectedRoleId === role.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-input hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getRoleDotClass(role.label)}`} />
                      <span>{role.label}</span>
                      {role.isCustom && (
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Custom</span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-normal">{count}/{totalPerms}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {isAdminRoleSelected && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                <Shield size={16} className="text-amber-600 shrink-0" />
                <span className="text-amber-800 dark:text-amber-300">Company Admin always has full access to all features. Permissions cannot be modified.</span>
              </div>
            )}

            {canManageRoles && selectedRoleRecord?.is_system === false && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteRole(selectedRoleId)}
                  className="inline-flex items-center rounded-md text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 h-9 px-4 py-2"
                >
                  <Trash2 size={14} className="mr-2" /> Delete Role
                </button>
              </div>
            )}
          </div>

          {/* Permission groups */}
          {canManageRoles ? (
            <div className="rounded-xl border bg-card divide-y">
              {PERMISSION_GROUPS.map((group) => {
                const isExpanded = expandedGroups.has(group.label);
                const groupPerms = group.permissions.map((p) => p.key);
                const selectedCount = groupPerms.filter((k) => selectedPerms.includes(k)).length;
                const allSelected = selectedCount === groupPerms.length;
                const someSelected = selectedCount > 0 && !allSelected;

                return (
                  <div key={group.label}>
                    {/* Group header */}
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleAllInGroup(group)}
                          disabled={isAdminRoleSelected}
                          className={getPermissionGroupCheckboxClass(allSelected, someSelected, isAdminRoleSelected)}
                        >
                          {allSelected && <Check size={12} strokeWidth={3} />}
                          {someSelected && !allSelected && <div className="h-0.5 w-2 bg-primary rounded" />}
                        </button>
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2 text-left hover:bg-accent/50 rounded-md py-1 -my-1 px-1 -mx-1"
                          onClick={() => toggleGroup(group.label)}
                        >
                          <span className="font-semibold text-sm">{group.label}</span>
                          <span className="text-xs text-muted-foreground">{selectedCount}/{groupPerms.length}</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleGroup(group.label)}
                        aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>

                    {/* Individual permissions */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 space-y-1 ml-8">
                        {group.permissions.map((perm) => {
                          const checked = selectedPerms.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer transition-colors ${
                                checked ? 'bg-primary/5' : 'hover:bg-accent/50'
                              } ${isAdminRoleSelected ? 'cursor-not-allowed opacity-70' : ''}`}
                            >
                              <button
                                onClick={() => togglePermission(perm.key)}
                                disabled={isAdminRoleSelected}
                                className={`h-4.5 w-4.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                  checked
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                } ${isAdminRoleSelected ? 'opacity-50' : ''}`}
                                style={{ minWidth: '18px', minHeight: '18px', width: '18px', height: '18px' }}
                              >
                                {checked && <Check size={11} strokeWidth={3} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm">{perm.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-2 font-mono">{perm.key}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center">
              <Shield size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">You don&apos;t have permission to manage roles and permissions.</p>
            </div>
          )}

          {/* Save bar */}
          {rolesDirty && canManageRoles && (
            <div className="sticky bottom-4 flex items-center justify-between p-4 rounded-xl border bg-card shadow-lg">
              <p className="text-sm font-medium">Unsaved changes for <span className="text-primary">{selectedRoleLabel}</span></p>
              <div className="flex gap-2">
                <button onClick={() => { syncRolesFromApi(); setRolesDirty(false); }} className={btnSecondary}>Discard</button>
                <SubmitButton onClick={handleSaveRoles} loading={updateRole.isPending} className={btnPrimary}><Save size={14} className="mr-2" /> Save Permissions</SubmitButton>
              </div>
            </div>
          )}
        </>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center">
              <Shield size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Connect to the API to manage roles and permissions.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ PREFERENCES TAB ══════ */}
      {activeTab === 'Preferences' && (
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <h3 className="font-bold">Appearance</h3>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">{darkMode ? <Moon size={20} /> : <Sun size={20} />}<div><p className="font-medium">Dark Mode</p><p className="text-xs text-muted-foreground">Toggle between light and dark theme</p></div></div>
            <button onClick={toggleDarkMode} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
        </div>
      )}

      {/* ══════ DATA TAB ══════ */}
      {activeTab === 'Data' && (
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-destructive"><AlertTriangle size={18} /> Danger Zone</h3>
          {canResetData ? (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="font-medium text-destructive">Reset All Data</p>
              <p className="text-sm text-muted-foreground mt-1">This will permanently delete all CRM data and restore factory defaults.</p>
              <button onClick={() => setConfirmAction({ type: 'resetData' })} className="mt-4 inline-flex items-center rounded-md text-sm font-medium bg-destructive text-white hover:bg-destructive/90 h-9 px-4 py-2"><Trash2 size={14} className="mr-2" /> Reset Everything</button>
            </div>
          ) : (
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">You don&apos;t have permission to reset application data. Contact your Company Admin.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ USER MODAL ══════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">{editingUser.id ? 'Edit User' : 'Add User'}</h2><button onClick={() => setShowUserModal(false)}><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="space-y-2"><label htmlFor="user-name" className={labelCls}>Name *</label><input id="user-name" type="text" value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label htmlFor="user-email" className={labelCls}>Email *</label><input id="user-email" type="email" value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label htmlFor="user-phone" className={labelCls}>Phone</label><input id="user-phone" type="text" value={editingUser.phone || ''} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className={inputCls} /></div>
              <div className={`grid gap-4 ${isAdminRole(editingUser.role ?? '') ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className="space-y-2"><label htmlFor="user-role" className={labelCls}>Role</label><select id="user-role" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className={inputCls} disabled={!canSwitchHubs && !!editingUser.id}>{apiRoles.map((r) => (<option key={r._id} value={roleLabel(r)}>{roleLabel(r)}</option>))}</select></div>
                {!isAdminRole(editingUser.role ?? '') && (
                  <div className="space-y-2"><label htmlFor="user-hub" className={labelCls}>Hub</label>
                    <select
                      id="user-hub"
                      value={editingUser.location}
                      onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                      className={inputCls}
                      disabled={!canSwitchHubs}
                    >
                      {(canSwitchHubs ? activeHubs : hubs.filter((h) => h.id === scopeHubId || h.name === user?.hubName)).map((h) => (
                        <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {/* Role preview */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Role permissions preview</p>
                <div className="flex flex-wrap gap-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPerms = group.permissions.map((p) => p.key);
                    const previewKey = resolveRoleId(apiRoles, editingUser.role ?? '') ?? '';
                    const rp = rolePerms[previewKey] || [];
                    const count = countGroupPermissions(groupPerms, rp);
                    if (count === 0) return null;
                    return (
                      <span key={group.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${count === groupPerms.length ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {group.label} {count}/{groupPerms.length}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowUserModal(false)} className={btnSecondary}>Cancel</button>
              <SubmitButton onClick={handleSaveUser} loading={createAgent.isPending || updateAgent.isPending}>Save</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* ══════ HUB MODAL ══════ */}
      {showHubModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingHub.id ? 'Edit Location' : 'Add New Location'}</h2>
              <button onClick={() => setShowHubModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="hub-type" className={labelCls}>Type</label>
                  <select
                    id="hub-type"
                    value={editingHub.locationType ?? 'hub'}
                    onChange={(e) => setEditingHub({
                      ...editingHub,
                      locationType: e.target.value as Hub['locationType'],
                      parentHubId: e.target.value === 'hub' ? undefined : editingHub.parentHubId,
                      ownershipType: e.target.value === 'hub' ? undefined : (editingHub.ownershipType ?? 'RO'),
                    })}
                    className={inputCls}
                  >
                    <option value="hub">Hub</option>
                    <option value="rsp">RSP</option>
                  </select>
                </div>
                {editingHub.locationType === 'rsp' && (
                  <div className="space-y-2">
                    <label htmlFor="hub-parent" className={labelCls}>Parent Hub</label>
                    <select
                      id="hub-parent"
                      value={editingHub.parentHubId ?? ''}
                      onChange={(e) => setEditingHub({ ...editingHub, parentHubId: e.target.value || undefined })}
                      className={inputCls}
                    >
                      <option value="">Standalone</option>
                      {hubOnlyLocations.filter((h) => h.id !== editingHub.id).map((h) => (
                        <option key={h.id} value={h.id}>{hubOptionLabel(h)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {editingHub.locationType === 'rsp' && (
                <div className="space-y-2">
                  <label htmlFor="hub-ownership" className={labelCls}>Ownership *</label>
                  <select
                    id="hub-ownership"
                    value={editingHub.ownershipType ?? ''}
                    onChange={(e) => setEditingHub({
                      ...editingHub,
                      ownershipType: (e.target.value || undefined) as OwnershipType | undefined,
                    })}
                    className={inputCls}
                  >
                    <option value="">Select ownership</option>
                    <option value="RO">Retail Owned (RO)</option>
                    <option value="RF">Retail Franchise (RF)</option>
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="hub-code" className={labelCls}>Code</label>
                <input
                  id="hub-code"
                  type="text"
                  value={editingHub.id ? (editingHub.code || 'N/A') : 'Auto-assigned on save'}
                  disabled
                  className={`${inputCls} bg-muted/40 text-muted-foreground`}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="hub-name" className={labelCls}>Location Name *</label>
                <input id="hub-name" type="text" value={editingHub.name || ''} onChange={(e) => setEditingHub({ ...editingHub, name: e.target.value })} placeholder="e.g. Abuja" className={inputCls} />
              </div>
              <div className="space-y-2">
                <label htmlFor="hub-address" className={labelCls}>Address</label>
                <input id="hub-address" type="text" value={editingHub.address || ''} onChange={(e) => setEditingHub({ ...editingHub, address: e.target.value })} placeholder="Full address" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="hub-phone" className={labelCls}>Phone</label>
                  <input id="hub-phone" type="text" value={editingHub.phone || ''} onChange={(e) => setEditingHub({ ...editingHub, phone: e.target.value })} placeholder="Hub phone" className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="hub-manager" className={labelCls}>Manager</label>
                  <select
                    id="hub-manager"
                    value={editingHub.hubManagerId || ''}
                    onChange={(e) => setEditingHub({ ...editingHub, hubManagerId: e.target.value || undefined })}
                    className={inputCls}
                  >
                    <option value="">No manager</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hub-active" checked={editingHub.isActive !== false} onChange={(e) => setEditingHub({ ...editingHub, isActive: e.target.checked })} className="h-4 w-4 accent-primary" />
                <label htmlFor="hub-active" className="text-sm font-medium">Active</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowHubModal(false)} className={btnSecondary}>Cancel</button>
              <SubmitButton onClick={handleSaveHub} loading={createHub.isPending || updateHub.isPending}>Save Hub</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* ══════ DOWNGRADE HUB MODAL ══════ */}
      {downgradingHub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Downgrade &quot;{downgradingHub.name}&quot; to RSP</h2>
              <button onClick={() => setDowngradingHub(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            {hubs.filter((h) => h.parentHubId === downgradingHub.id).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Child RSP disposition</p>
                {hubs.filter((h) => h.parentHubId === downgradingHub.id).map((child) => (
                  <div key={child.id} className="rounded-md border p-3 space-y-2 text-sm">
                    <p className="font-medium">{child.name}</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={childRspActions[child.id]?.action === 'standalone'}
                          onChange={() => setChildRspActions({ ...childRspActions, [child.id]: { action: 'standalone' } })}
                        />
                        Standalone
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={childRspActions[child.id]?.action === 'reassign'}
                          onChange={() => setChildRspActions({ ...childRspActions, [child.id]: { action: 'reassign', target_hub_id: hubOnlyLocations[0]?.id } })}
                        />
                        Reassign to hub
                      </label>
                    </div>
                    {childRspActions[child.id]?.action === 'reassign' && (
                      <select
                        value={childRspActions[child.id]?.target_hub_id ?? ''}
                        onChange={(e) => setChildRspActions({
                          ...childRspActions,
                          [child.id]: { action: 'reassign', target_hub_id: e.target.value },
                        })}
                        className={inputCls}
                      >
                        {hubOnlyLocations.filter((h) => h.id !== downgradingHub.id).map((h) => (
                          <option key={h.id} value={h.id}>{hubOptionLabel(h)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Manager</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={downgradeManagerAction === 'keep'} onChange={() => setDowngradeManagerAction('keep')} />
                Keep as manager on this RSP
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={downgradeManagerAction === 'reassign'} onChange={() => setDowngradeManagerAction('reassign')} />
                Reassign manager to another Hub
              </label>
              {downgradeManagerAction === 'reassign' && (
                <select
                  value={downgradeReassignHubId}
                  onChange={(e) => setDowngradeReassignHubId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select target hub</option>
                  {hubOnlyLocations.filter((h) => h.id !== downgradingHub.id).map((h) => (
                    <option key={h.id} value={h.id}>{hubOptionLabel(h)}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Ownership *</label>
              <select
                value={downgradeOwnershipType}
                onChange={(e) => setDowngradeOwnershipType(e.target.value as OwnershipType)}
                className={inputCls}
              >
                <option value="RO">Retail Owned (RO)</option>
                <option value="RF">Retail Franchise (RF)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Place this RSP under hub (optional)</label>
              <select
                value={downgradeParentHubId}
                onChange={(e) => setDowngradeParentHubId(e.target.value)}
                className={inputCls}
              >
                <option value="">Standalone RSP</option>
                {hubOnlyLocations.filter((h) => h.id !== downgradingHub.id).map((h) => (
                  <option key={h.id} value={h.id}>{hubOptionLabel(h)}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDowngradingHub(null)} className={btnSecondary}>Cancel</button>
              <SubmitButton onClick={handleConfirmDowngrade} loading={downgradeHub.isPending}>Confirm downgrade</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* ══════ ROLE MODAL ══════ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add Role</h2>
              <button type="button" onClick={() => setShowRoleModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="role-label" className={labelCls}>Role name *</label>
                <input
                  id="role-label"
                  type="text"
                  value={newRole.label}
                  onChange={(e) => setNewRole({ ...newRole, label: e.target.value })}
                  placeholder="e.g. Warehouse Lead"
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="role-description" className={labelCls}>Description</label>
                <textarea
                  id="role-description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Optional description for this role"
                  className={`${inputCls} min-h-[80px] py-2`}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowRoleModal(false)} className={btnSecondary}>Cancel</button>
                <SubmitButton type="submit" loading={createRole.isPending}>Create Role</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ CONFIRM MODAL ══════ */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Are you sure?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {getConfirmActionMessage(confirmAction.type)}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmAction(null)} className={`flex-1 justify-center ${btnSecondary}`}>Cancel</button>
                <button
                  onClick={executeConfirmAction}
                  disabled={deleteRole.isPending || deleteAgent.isPending || deleteHub.isPending || updateRole.isPending}
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-white hover:bg-destructive/90 h-9 px-4 py-2 disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

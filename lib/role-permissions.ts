import { ApiRole } from '@/types/api';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MAP,
  Permission,
  RoleName,
} from '@/lib/permissions';

/** Mirrors backend `MODULE_SUBMODULES` in roles.entity.ts */
export const BACKEND_MODULE_SUBMODULES: Record<string, string[]> = {
  dashboard: ['view_dashboard'],
  analytics: ['view_analytics'],
  pos: ['view_pos', 'manage_pos_tills'],
  kitchen: ['view_kitchen', 'manage_kitchen_jobs', 'view_kitchen_costs', 'manage_kitchen_pricing', 'archive_kitchen_jobs'],
  inventory: [
    'view_inventory',
    'create_sku',
    'edit_product_detail',
    'adjust_stock',
    'transfer_btw_hubs',
    'request_inventory',
    'fulfill_inventory_requests',
    'import_csv',
    'export_csv',
  ],
  customers: ['view_customers', 'add_customer', 'edit_customer', 'delete_customer'],
  sales: [
    'view_sales',
    'create_sales',
    'edit_sales',
    'void_sales',
    'update_payment_status',
    'update_delivery_status',
    'import_sales_csv',
  ],
  credit: ['view_credit', 'record_payment', 'set_due_date'],
  interactions: ['view_interactions', 'log_interaction', 'resolve_interaction'],
  audit_trail: ['view_audit_trail'],
  settings: ['manage_users', 'manage_hubs', 'view_all_hubs', 'manage_roles'],
};

type ApiSubModule = { name: string; enabled: boolean };
type ApiModulePermission = { module: string; submodules?: ApiSubModule[] };

export function apiRoleToFePermissions(role: ApiRole): Permission[] {
  if (role.name === 'company_admin') return [...ALL_PERMISSIONS];

  const enabled = new Set<string>();
  const modules = (role.permissions ?? []) as ApiModulePermission[];
  for (const mod of modules) {
    for (const sub of mod.submodules ?? []) {
      if (sub.enabled) enabled.add(sub.name);
    }
  }
  return ALL_PERMISSIONS.filter((p) => enabled.has(PERMISSION_MAP[p]));
}

export function fePermissionsToApiInput(perms: Permission[]) {
  const enabledSet = new Set(perms.map((p) => PERMISSION_MAP[p]));
  return Object.entries(BACKEND_MODULE_SUBMODULES).map(([module, subs]) => ({
    module,
    submodules: subs.filter((s) => enabledSet.has(s)),
  }));
}

export function buildRolePermissionsMap(roles: ApiRole[]): Record<string, Permission[]> {
  const map: Record<string, Permission[]> = {};
  for (const role of roles) {
    map[role._id] = apiRoleToFePermissions(role);
  }
  return map;
}

export function defaultPermissionsForRoleLabel(label: string): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[label as RoleName] ?? [];
}

export function roleLabel(role: ApiRole): string {
  return role.label || role.name;
}

export function isCompanyAdminRole(role: ApiRole): boolean {
  return role.name === 'company_admin' || role.label === 'Company Admin';
}

/** Plain-language group names and one-line descriptions for the roles matrix. Keys are PERMISSION_GROUPS labels. */
const GROUP_DISPLAY: Record<string, { label: string; description: string }> = {
  Dashboard: { label: 'Dashboard', description: 'The home page with today’s numbers.' },
  Analytics: { label: 'Analytics', description: 'Reports and trends.' },
  POS: { label: 'Point of sale', description: 'Tills, cashiers and POS takings.' },
  Kitchen: { label: 'Kitchen', description: 'Kitchen jobs, quotes, recipes and pricing.' },
  Inventory: { label: 'Inventory', description: 'Stock levels, transfers and requests.' },
  Suppliers: { label: 'Suppliers', description: 'Supplier records and issues.' },
  Customers: { label: 'Customers', description: 'Customer records.' },
  Sales: { label: 'Sales', description: 'Recording, editing and voiding sales.' },
  Credits: { label: 'Credits', description: 'Money owed and repayments.' },
  Interactions: { label: 'Engagement', description: 'Feedback, enquiries and compensations.' },
  'Audit Trail': { label: 'Audit trail', description: 'The history of changes.' },
  Settings: { label: 'Settings', description: 'Users, locations, and roles and access.' },
};

export function permissionGroupDisplay(groupLabel: string): { label: string; description: string } {
  return GROUP_DISPLAY[groupLabel] ?? { label: groupLabel, description: '' };
}

/** Sentence-style permission label: "&" becomes "and", "/" becomes "or". */
export function permissionDisplayLabel(label: string): string {
  return label.replace(/\s*&\s*/g, ' and ').replace(/\s*\/\s*/g, ' or ');
}

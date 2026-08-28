import { Agent } from '../types';
import { AppUser } from '@/types/api';

export const ALL_PERMISSIONS = [
  'dashboard.view',
  'analytics.view',
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.adjust_stock',
  'inventory.transfer',
  'inventory.request',
  'inventory.fulfill_requests',
  'inventory.import',
  'inventory.export',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'suppliers.deactivate',
  'suppliers.log_issue',
  'suppliers.resolve_issue',
  'customers.view',
  'customers.create',
  'customers.edit',
  'sales.view',
  'sales.create',
  'sales.edit',
  'sales.void',
  'sales.update_status',
  'sales.update_delivery',
  'sales.import',
  'credits.view',
  'credits.record_payment',
  'credits.set_due_date',
  'interactions.view',
  'interactions.create',
  'interactions.resolve',
  'audit.view',
  'settings.manage_users',
  'settings.manage_hubs',
  'settings.view_all_hubs',
  'settings.manage_roles',
  'settings.reset_data',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface PermissionGroup {
  label: string;
  icon: string;
  permissions: { key: Permission; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    permissions: [
      { key: 'dashboard.view', label: 'View dashboard' },
    ],
  },
  {
    label: 'Analytics',
    icon: 'BarChart3',
    permissions: [
      { key: 'analytics.view', label: 'View analytics & reports' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'Package',
    permissions: [
      { key: 'inventory.view', label: 'View inventory' },
      { key: 'inventory.create', label: 'Create new SKU' },
      { key: 'inventory.edit', label: 'Edit product details' },
      { key: 'inventory.adjust_stock', label: 'Adjust stock levels' },
      { key: 'inventory.transfer', label: 'Transfer between hubs' },
      { key: 'inventory.request', label: 'Request stock from hubs' },
      { key: 'inventory.fulfill_requests', label: 'Approve & fulfill inventory requests' },
      { key: 'inventory.import', label: 'Import movements (Excel)' },
      { key: 'inventory.export', label: 'Export CSV' },
    ],
  },
  {
    label: 'Suppliers',
    icon: 'Truck',
    permissions: [
      { key: 'suppliers.view', label: 'View suppliers' },
      { key: 'suppliers.create', label: 'Add supplier' },
      { key: 'suppliers.edit', label: 'Edit supplier' },
      { key: 'suppliers.deactivate', label: 'Deactivate supplier' },
      { key: 'suppliers.log_issue', label: 'Log supplier issue' },
      { key: 'suppliers.resolve_issue', label: 'Resolve supplier issue' },
    ],
  },
  {
    label: 'Customers',
    icon: 'Users',
    permissions: [
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.create', label: 'Add new customer' },
      { key: 'customers.edit', label: 'Edit customer details' },
    ],
  },
  {
    label: 'Sales',
    icon: 'ShoppingCart',
    permissions: [
      { key: 'sales.view', label: 'View sales' },
      { key: 'sales.create', label: 'Record new sale' },
      { key: 'sales.edit', label: 'Edit sale details' },
      { key: 'sales.void', label: 'Void a sale' },
      { key: 'sales.update_status', label: 'Update payment status' },
      { key: 'sales.update_delivery', label: 'Update delivery status' },
      { key: 'sales.import', label: 'Import sales (Excel)' },
    ],
  },
  {
    label: 'Credits',
    icon: 'CreditCard',
    permissions: [
      { key: 'credits.view', label: 'View credit records' },
      { key: 'credits.record_payment', label: 'Record payment' },
      { key: 'credits.set_due_date', label: 'Set due dates' },
    ],
  },
  {
    label: 'Interactions',
    icon: 'MessageSquare',
    permissions: [
      { key: 'interactions.view', label: 'View feedback, enquiries & compensations' },
      { key: 'interactions.create', label: 'Create new entry' },
      { key: 'interactions.resolve', label: 'Resolve / close entry' },
    ],
  },
  {
    label: 'Audit Trail',
    icon: 'FileText',
    permissions: [
      { key: 'audit.view', label: 'View audit logs' },
    ],
  },
  {
    label: 'Settings',
    icon: 'Settings',
    permissions: [
      { key: 'settings.manage_users', label: 'Add, edit & remove users' },
      { key: 'settings.manage_hubs', label: 'Manage hub locations' },
      { key: 'settings.view_all_hubs', label: 'View all hubs (company-wide data)' },
      { key: 'settings.manage_roles', label: 'Configure roles & permissions' },
      { key: 'settings.reset_data', label: 'Reset all data' },
    ],
  },
];

export const PERMISSION_MAP: Record<Permission, string> = {
  'dashboard.view': 'view_dashboard',
  'analytics.view': 'view_analytics',
  'inventory.view': 'view_inventory',
  'inventory.create': 'create_sku',
  'inventory.edit': 'edit_product_detail',
  'inventory.adjust_stock': 'adjust_stock',
  'inventory.transfer': 'transfer_btw_hubs',
  'inventory.request': 'request_inventory',
  'inventory.fulfill_requests': 'fulfill_inventory_requests',
  'inventory.import': 'import_csv',
  'inventory.export': 'export_csv',
  'suppliers.view': 'view_suppliers',
  'suppliers.create': 'create_supplier',
  'suppliers.edit': 'edit_supplier',
  'suppliers.deactivate': 'deactivate_supplier',
  'suppliers.log_issue': 'log_supplier_issue',
  'suppliers.resolve_issue': 'resolve_supplier_issue',
  'customers.view': 'view_customers',
  'customers.create': 'add_customer',
  'customers.edit': 'edit_customer',
  'sales.view': 'view_sales',
  'sales.create': 'create_sales',
  'sales.edit': 'edit_sales',
  'sales.void': 'void_sales',
  'sales.update_status': 'update_payment_status',
  'sales.update_delivery': 'update_delivery_status',
  'sales.import': 'import_sales_csv',
  'credits.view': 'view_credit',
  'credits.record_payment': 'record_payment',
  'credits.set_due_date': 'set_due_date',
  'interactions.view': 'view_interactions',
  'interactions.create': 'log_interaction',
  'interactions.resolve': 'resolve_interaction',
  'audit.view': 'view_audit_trail',
  'settings.manage_users': 'manage_users',
  'settings.manage_hubs': 'manage_hubs',
  'settings.view_all_hubs': 'view_all_hubs',
  'settings.manage_roles': 'manage_roles',
  'settings.reset_data': 'manage_users',
};

// ── Settings → Roles tab defaults (API reset only; not persisted in localStorage) ──
export type RoleName = Agent['role'];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  'Company Admin': [...ALL_PERMISSIONS],
  'Hub Manager': [
    'dashboard.view',
    'analytics.view',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust_stock', 'inventory.transfer', 'inventory.request', 'inventory.fulfill_requests', 'inventory.import', 'inventory.export',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.deactivate', 'suppliers.log_issue', 'suppliers.resolve_issue',
    'customers.view', 'customers.create', 'customers.edit',
    'sales.view', 'sales.create', 'sales.edit', 'sales.update_status', 'sales.update_delivery',
    'credits.view', 'credits.record_payment', 'credits.set_due_date',
    'interactions.view', 'interactions.create', 'interactions.resolve',
    'audit.view',
  ],
  'Finance': [
    'dashboard.view',
    'analytics.view',
    'inventory.view',
    'suppliers.view',
    'customers.view',
    'sales.view', 'sales.update_status',
    'credits.view', 'credits.record_payment', 'credits.set_due_date',
    'interactions.view',
    'audit.view',
  ],
  'Customer Success': [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit',
    'sales.view',
    'credits.view',
    'interactions.view', 'interactions.create', 'interactions.resolve',
  ],
};

export function hasPermission(user: AppUser | null, permission: Permission): boolean {
  if (!user) return false;
  const backendKey = PERMISSION_MAP[permission];
  if (!backendKey) return false;
  return user.permissions.includes(backendKey);
}

export function hasAnyPermission(user: AppUser | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

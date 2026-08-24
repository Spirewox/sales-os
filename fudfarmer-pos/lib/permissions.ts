/**
 * Role-based access control (§21, §22).
 *
 * Access is role + permission, not a role check scattered through the UI, so a
 * permission can be widened or narrowed in one place. The PRD's matrix is
 * tri-state — a role can hold a permission FULLY, in a LIMITED form, or not at
 * all — and that middle state carries real meaning:
 *
 *   discount.apply  limited → allowed up to the store threshold; beyond it needs approval
 *   refund.process  limited → may start a return, but an approver must authorise it
 *   cash.reconcile  limited → own shift only, not the whole store
 *   inventory/users/audit limited → scoped to their own store, not the estate
 */

export type PosRole = 'cashier' | 'manager' | 'inventory' | 'finance' | 'admin';

export const POS_ROLES: { key: PosRole; label: string; blurb: string }[] = [
  { key: 'cashier',   label: 'Cashier',           blurb: 'Sells, takes payment, closes own shift' },
  { key: 'manager',   label: 'Store Manager',     blurb: 'Approves, voids, sees the whole store' },
  { key: 'inventory', label: 'Inventory Manager', blurb: 'Stock, products and movements' },
  { key: 'finance',   label: 'Finance',           blurb: 'Sales, refunds, reconciliation, reports' },
  { key: 'admin',     label: 'Super Admin',       blurb: 'Everything, including settings and audit' },
];

export type Permission =
  | 'sale.create' | 'payment.process'
  | 'sale.viewOwn' | 'sale.viewAll'
  | 'discount.apply' | 'discount.approve'
  | 'refund.process' | 'refund.approve'
  | 'transaction.void'
  | 'cash.reconcile' | 'shift.closeOwn'
  | 'inventory.adjust' | 'product.manage' | 'user.manage'
  | 'audit.view' | 'settings.manage';

export const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: 'sale.create', label: 'Create Sale' },
  { key: 'payment.process', label: 'Process Payment' },
  { key: 'sale.viewOwn', label: 'View Own Sales' },
  { key: 'sale.viewAll', label: 'View All Store Sales' },
  { key: 'discount.apply', label: 'Apply Discount' },
  { key: 'discount.approve', label: 'Approve Discount' },
  { key: 'refund.process', label: 'Process Refund' },
  { key: 'refund.approve', label: 'Approve Refund' },
  { key: 'transaction.void', label: 'Void Transaction' },
  { key: 'cash.reconcile', label: 'View Cash Reconciliation' },
  { key: 'shift.closeOwn', label: 'Close Own Shift' },
  { key: 'inventory.adjust', label: 'Adjust Inventory' },
  { key: 'product.manage', label: 'Manage Products' },
  { key: 'user.manage', label: 'Manage Users' },
  { key: 'audit.view', label: 'View Audit Logs' },
  { key: 'settings.manage', label: 'System Settings' },
];

export type PermLevel = 'none' | 'limited' | 'full';
const N: PermLevel = 'none', L: PermLevel = 'limited', F: PermLevel = 'full';

/** Straight from the PRD's permission matrix. */
export const MATRIX: Record<PosRole, Record<Permission, PermLevel>> = {
  cashier: {
    'sale.create': F, 'payment.process': F, 'sale.viewOwn': F, 'sale.viewAll': N,
    'discount.apply': L, 'discount.approve': N, 'refund.process': L, 'refund.approve': N,
    'transaction.void': N, 'cash.reconcile': L, 'shift.closeOwn': F,
    'inventory.adjust': N, 'product.manage': N, 'user.manage': N, 'audit.view': N, 'settings.manage': N,
  },
  manager: {
    'sale.create': F, 'payment.process': F, 'sale.viewOwn': F, 'sale.viewAll': F,
    'discount.apply': F, 'discount.approve': F, 'refund.process': F, 'refund.approve': F,
    'transaction.void': F, 'cash.reconcile': F, 'shift.closeOwn': F,
    'inventory.adjust': L, 'product.manage': L, 'user.manage': L, 'audit.view': L, 'settings.manage': N,
  },
  inventory: {
    'sale.create': N, 'payment.process': N, 'sale.viewOwn': F, 'sale.viewAll': F,
    'discount.apply': N, 'discount.approve': N, 'refund.process': N, 'refund.approve': N,
    'transaction.void': N, 'cash.reconcile': N, 'shift.closeOwn': N,
    'inventory.adjust': F, 'product.manage': F, 'user.manage': N, 'audit.view': L, 'settings.manage': N,
  },
  finance: {
    'sale.create': N, 'payment.process': N, 'sale.viewOwn': F, 'sale.viewAll': F,
    'discount.apply': F, 'discount.approve': F, 'refund.process': F, 'refund.approve': F,
    'transaction.void': F, 'cash.reconcile': F, 'shift.closeOwn': N,
    'inventory.adjust': N, 'product.manage': N, 'user.manage': N, 'audit.view': F, 'settings.manage': N,
  },
  admin: {
    'sale.create': F, 'payment.process': F, 'sale.viewOwn': F, 'sale.viewAll': F,
    'discount.apply': F, 'discount.approve': F, 'refund.process': F, 'refund.approve': F,
    'transaction.void': F, 'cash.reconcile': F, 'shift.closeOwn': F,
    'inventory.adjust': F, 'product.manage': F, 'user.manage': F, 'audit.view': F, 'settings.manage': F,
  },
};

export const level = (role: PosRole, p: Permission): PermLevel => MATRIX[role]?.[p] ?? 'none';
/** Holds the permission at all (full or limited). */
export const can = (role: PosRole | undefined, p: Permission): boolean =>
  !!role && level(role, p) !== 'none';
/** Holds it without restriction — use for approvals and estate-wide views. */
export const canFully = (role: PosRole | undefined, p: Permission): boolean =>
  !!role && level(role, p) === 'full';

/** Legacy tills stored `supervisor`; that maps onto Store Manager. */
export const normaliseRole = (r: string): PosRole =>
  r === 'supervisor' ? 'manager' : (['cashier', 'manager', 'inventory', 'finance', 'admin'].includes(r) ? r as PosRole : 'cashier');

export const roleLabel = (r: PosRole) => POS_ROLES.find((x) => x.key === r)?.label || r;

import {
  LayoutDashboard, Package, Users, Banknote, CreditCard, History, Settings, BarChart3, Truck, Monitor, Megaphone, ChefHat,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  /** Custom visibility (Engagement shows for customers.view or interactions.view). */
  anyOf?: Permission[];
};

export type NavGroup = { label: string; items: NavItem[] };

/** Grouped by job: review, sell, run operations, administer. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
    ],
  },
  {
    label: 'Sell',
    items: [
      { href: '/sales', label: 'Sales', icon: Banknote, permission: 'sales.view' },
      { href: '/pos', label: 'POS', icon: Monitor, permission: 'pos.view' },
      { href: '/credits', label: 'Credits', icon: CreditCard, permission: 'credits.view' },
      { href: '/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
      { href: '/engagement', label: 'Engagement', icon: Megaphone, anyOf: ['customers.view', 'interactions.view'] },
    ],
  },
  {
    label: 'Operate',
    items: [
      { href: '/inventory', label: 'Inventory', icon: Package, permission: 'inventory.view' },
      { href: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers.view' },
      { href: '/kitchen', label: 'Kitchen', icon: ChefHat, permission: 'kitchen.view' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/audit', label: 'Audit trail', icon: History, permission: 'audit.view' },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const EXTRA_TITLES: Record<string, string> = { '/insights': 'Insights', '/jobs': 'Kitchen job' };

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

/** Page title for the phone top bar. */
export function titleForPath(pathname: string): string {
  for (const g of NAV_GROUPS) for (const i of g.items) if (isActivePath(pathname, i.href)) return i.label;
  const extra = Object.keys(EXTRA_TITLES).find((k) => pathname.startsWith(k));
  return extra ? EXTRA_TITLES[extra] : 'Sales OS';
}

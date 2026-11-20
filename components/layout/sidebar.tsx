'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useInventory, useFeedback, useEnquiries, useCreditSummary } from '@/hooks/use-queries';
import { useKitchenJobs } from '@/hooks/use-kitchen';
import { Permission } from '@/lib/permissions';
import {
  LayoutDashboard, Package, Users, Banknote,
  CreditCard, History,
  Settings, LogOut, Menu, X, BarChart3, Truck, Monitor, Megaphone, ChefHat, ChevronsLeft, ChevronsRight,
  // Sparkles — temporarily unused while Insights nav is hidden
} from 'lucide-react';
import { useState, useMemo, useEffect, useSyncExternalStore } from 'react';
import { BrandLogo, BrandMark } from '@/components/brand';
import { cn } from '@/lib/utils';

const COLLAPSE_KEY = 'sidebar-collapsed';
const collapseListeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};
const setCollapsedPref = (v: boolean) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
  } catch {
    /* per-device preference only */
  }
  collapseListeners.forEach((l) => l());
};
/** Desktop sidebar collapsed state, remembered per device. */
function useCollapsed() {
  return useSyncExternalStore(
    (l) => {
      collapseListeners.add(l);
      return () => collapseListeners.delete(l);
    },
    readCollapsed,
    () => false,
  );
}

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
  { href: '/pos', label: 'POS', icon: Monitor, permission: 'pos.view' },
  { href: '/kitchen', label: 'Kitchen', icon: ChefHat, permission: 'kitchen.view' },
  // Temporarily hidden — re-enable with Sparkles import when Insights returns
  // { href: '/insights', label: 'Insights', icon: Sparkles, permission: 'analytics.view' },
  { href: '/inventory', label: 'Inventory', icon: Package, permission: 'inventory.view' },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers.view' },
  { href: '/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { href: '/engagement', label: 'Engagement', icon: Megaphone },
  { href: '/sales', label: 'Sales', icon: Banknote, permission: 'sales.view' },
  { href: '/credits', label: 'Credits', icon: CreditCard, permission: 'credits.view' },
  { href: '/audit', label: 'Audit Trail', icon: History, permission: 'audit.view' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const { data: inventory } = useInventory(undefined, { enabled: can('inventory.view') });
  const canViewInteractions = can('interactions.view');
  const { data: feedback } = useFeedback(undefined, { enabled: canViewInteractions });
  const { data: enquiries } = useEnquiries(undefined, { enabled: canViewInteractions });
  const { data: creditSummary = [] } = useCreditSummary(undefined, { enabled: can('credits.view') });
  // New jobs waiting to be accepted (limit 1: only the stage counts are needed).
  const { data: kitchenJobs } = useKitchenJobs({ stage: 'new', limit: 1 }, { enabled: can('kitchen.view'), live: true });
  const newKitchenJobs = kitchenJobs?.counts.new ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsedPref = useCollapsed();
  // The drawer on phones always shows labels.
  const collapsed = collapsedPref && !mobileOpen;
  const toggleCollapsed = () => setCollapsedPref(!collapsedPref);

  // Ctrl+B / Cmd+B toggles the sidebar (skipped while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'b' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      setCollapsedPref(!readCollapsed());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const lowStockCount = useMemo(() => {
    if (!inventory) return 0;
    return inventory.filter((i) => i.currentStock <= i.minStockLevel).length;
  }, [inventory]);

  const openFeedbackCount = useMemo(() => {
    if (!feedback) return 0;
    return feedback.filter((f) => f.status === 'Open').length;
  }, [feedback]);

  const openEnquiriesCount = useMemo(() => {
    if (!enquiries) return 0;
    return enquiries.filter((e) => e.status === 'Open').length;
  }, [enquiries]);

  const overdueCreditsCount = useMemo(() => {
    return creditSummary.reduce((sum, row) => sum + row.overdueCount, 0);
  }, [creditSummary]);

  const badgeFor = (href: string, label: string): number => {
    if (label === 'Inventory') return lowStockCount;
    if (href === '/engagement') return canViewInteractions ? openFeedbackCount + openEnquiriesCount : 0;
    if (href === '/kitchen') return newKitchenJobs;
    if (label === 'Credits') return overdueCreditsCount;
    return 0;
  };

  const navLink = (href: string, label: string, Icon: typeof LayoutDashboard, isActive: boolean, badge = 0) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? (badge ? `${label} (${badge})` : label) : undefined}
      aria-label={collapsed ? (badge ? `${label}, ${badge}` : label) : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-all duration-150',
        collapsed ? 'justify-center px-0' : 'px-3',
        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon size={collapsed ? 18 : 16} strokeWidth={isActive ? 2.25 : 1.75} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {badge > 0 &&
        (collapsed ? (
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" aria-hidden />
        ) : (
          <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{badge}</span>
        ))}
    </Link>
  );

  const content = (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className={cn('flex h-[61px] items-center border-b border-sidebar-border', collapsed ? 'justify-center' : 'px-5')}>
        {collapsed ? (
          <BrandMark size={28} />
        ) : (
          <>
            <BrandLogo variant="color" width={152} className="dark:hidden" />
            <BrandLogo variant="white" width={152} className="hidden dark:block" />
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('scrollbar-none flex-1 space-y-0.5 overflow-y-auto py-3', collapsed ? 'px-2.5' : 'px-3')}>
        {navItems
          .filter((item) => (item.href === '/engagement' ? can('customers.view') || canViewInteractions : !item.permission || can(item.permission)))
          .map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return navLink(item.href, item.label, item.icon, isActive, badgeFor(item.href, item.label));
          })}
      </nav>

      {/* Settings */}
      <div className={cn('border-t border-sidebar-border py-2', collapsed ? 'px-2.5' : 'px-3')}>
        {navLink('/settings', 'Settings', Settings, pathname === '/settings')}
      </div>

      {/* User Info */}
      {user && (
        <div className={cn('border-t border-sidebar-border py-3', collapsed ? 'px-2' : 'px-4')}>
          <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-3')}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
              title={collapsed ? `${user.name} · ${user.role} · ${user.hubName ?? 'All Hubs'}` : undefined}
            >
              {user.name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">{user.name}</p>
                <p className="text-[10px] text-sidebar-foreground/75" title={user.roleName || undefined}>
                  {user.role} &middot; {user.hubName ?? 'All Hubs'}
                </p>
              </div>
            )}
            <button onClick={logout} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Logout" aria-label="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        className="fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-lg border bg-card p-2 shadow-sm md:hidden"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'group/sidebar fixed inset-y-0 left-0 z-40 w-[260px] shrink-0 transform transition-[transform,width] duration-200 ease-out md:relative md:translate-x-0',
          collapsed && 'md:w-[72px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {content}
        {/* Desktop collapse handle on the sidebar edge */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsedPref ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsedPref}
          title={`${collapsedPref ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          className={cn(
            'absolute -right-3 top-[18px] z-10 hidden h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-opacity hover:text-foreground md:inline-flex',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsedPref ? 'opacity-100' : 'opacity-0 group-hover/sidebar:opacity-100',
          )}
        >
          {collapsedPref ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>
      </aside>
    </>
  );
}

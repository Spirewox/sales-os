'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useInventory, useFeedback, useEnquiries, useCreditSummary } from '@/hooks/use-queries';
import { Permission } from '@/lib/permissions';
import {
  LayoutDashboard, Package, Users, Banknote,
  CreditCard, History, MessageSquare,
  Settings, LogOut, Menu, X, BarChart3, Truck, Sparkles,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { BrandLogo } from '@/components/brand';

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
  { href: '/insights', label: 'Insights', icon: Sparkles, permission: 'analytics.view' },
  { href: '/inventory', label: 'Inventory', icon: Package, permission: 'inventory.view' },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers.view' },
  { href: '/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { href: '/sales', label: 'Sales', icon: Banknote, permission: 'sales.view' },
  { href: '/credits', label: 'Credits', icon: CreditCard, permission: 'credits.view' },
  { href: '/interactions', label: 'Interactions', icon: MessageSquare, permission: 'interactions.view' },
  { href: '/audit', label: 'Audit Trail', icon: History, permission: 'audit.view' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const { data: inventory } = useInventory();
  const { data: feedback } = useFeedback();
  const { data: enquiries } = useEnquiries();
  const { data: creditSummary = [] } = useCreditSummary();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const content = (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center px-5 py-4 border-b border-sidebar-border">
        <BrandLogo variant="color" width={152} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.filter((item) => !item.permission || can(item.permission)).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
              {item.label === 'Inventory' && lowStockCount > 0 && (
                <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {lowStockCount}
                </span>
              )}
              {item.label === 'Interactions' && (openFeedbackCount + openEnquiriesCount) > 0 && (
                <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {openFeedbackCount + openEnquiriesCount}
                </span>
              )}
              {item.label === 'Credits' && overdueCreditsCount > 0 && (
                <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {overdueCreditsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-sidebar-border px-3 py-2">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
            pathname === '/settings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Settings size={16} strokeWidth={pathname === '/settings' ? 2.25 : 1.75} />
          <span>Settings</span>
        </Link>
      </div>

      {/* User Info */}
      {user && (
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary border border-primary/20">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-sidebar-foreground">{user.name}</p>
              <p className="text-[10px] text-muted-foreground" title={user.roleName || undefined}>
                {user.role} &middot; {user.hubName ?? 'All Hubs'}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
              title="Logout"
            >
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
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center rounded-lg border bg-card p-2 shadow-sm"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] transform transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}

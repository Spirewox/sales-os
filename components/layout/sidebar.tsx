'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Menu } from '@base-ui/react/menu';
import { Bell, Check, ChevronsUpDown, LogOut, Menu as MenuIcon, Monitor, Moon, Sun, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useInventory, useFeedback, useEnquiries, useCreditSummary } from '@/hooks/use-queries';
import { useKitchenJobs } from '@/hooks/use-kitchen';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { BrandLogo } from '@/components/brand';
import { NotificationBell } from '@/contexts/crm-notifications-context';
import { LocationSelect } from '@/components/app/location-select';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, isActivePath, titleForPath, type NavItem } from './nav-config';

const NAV_BADGE = 'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums';

type SidebarProps = { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void };

export function Sidebar({ mobileOpen, onMobileOpenChange }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const { data: inventory } = useInventory();
  const canViewInteractions = can('interactions.view');
  const { data: feedback } = useFeedback(undefined, { enabled: canViewInteractions });
  const { data: enquiries } = useEnquiries(undefined, { enabled: canViewInteractions });
  const { data: creditSummary = [] } = useCreditSummary();
  // New jobs waiting to be accepted (limit 1: only the stage counts are needed).
  const { data: kitchenJobs } = useKitchenJobs({ stage: 'new', limit: 1 }, { enabled: can('kitchen.view'), live: true });
  const hubScope = useHubScopeFilter();
  const close = () => onMobileOpenChange(false);

  // Close the phone menu with Escape (the layout closes it on navigation).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileOpenChange(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileOpenChange]);

  const counts = useMemo(() => {
    const lowStock = inventory?.filter((i) => i.currentStock <= i.minStockLevel).length ?? 0;
    const openTickets = (feedback?.filter((f) => f.status === 'Open').length ?? 0) + (enquiries?.filter((e) => e.status === 'Open').length ?? 0);
    const overdue = creditSummary.reduce((sum, row) => sum + row.overdueCount, 0);
    return { lowStock, openTickets, overdue, newJobs: kitchenJobs?.counts.new ?? 0 };
  }, [inventory, feedback, enquiries, creditSummary, kitchenJobs]);

  const visible = (item: NavItem) => (item.anyOf ? item.anyOf.some((p) => can(p)) : !item.permission || can(item.permission));

  const badgeFor = (item: NavItem, active: boolean) => {
    const neutral = active ? 'bg-primary-foreground text-primary' : 'bg-sidebar-accent text-sidebar-accent-foreground';
    if (item.href === '/inventory' && counts.lowStock > 0)
      return <span className={`${NAV_BADGE} bg-warning text-warning-foreground`} aria-label={`${counts.lowStock} stock alerts`}>{counts.lowStock}</span>;
    if (item.href === '/credits' && counts.overdue > 0)
      return <span className={`${NAV_BADGE} bg-destructive text-destructive-foreground`} aria-label={`${counts.overdue} overdue credits`}>{counts.overdue}</span>;
    if (item.href === '/engagement' && canViewInteractions && counts.openTickets > 0)
      return <span className={`${NAV_BADGE} ${neutral}`} aria-label={`${counts.openTickets} open tickets`}>{counts.openTickets}</span>;
    if (item.href === '/kitchen' && counts.newJobs > 0)
      return <span className={`${NAV_BADGE} ${neutral}`} aria-label={`${counts.newJobs} new kitchen jobs`}>{counts.newJobs}</span>;
    return null;
  };

  return (
    <>
      {/* Phone overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={close} aria-hidden />}

      <aside
        aria-label="Main"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] transition-[transform,visibility] duration-200 md:visible md:relative md:z-auto md:translate-x-0',
          mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
        <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
          {/* Brand + bell */}
          <div className="flex items-center justify-between gap-2 py-4 pr-3 pl-5">
            <BrandLogo variant="color" width={140} className="dark:hidden" />
            <BrandLogo variant="white" width={140} className="hidden dark:block" />
            <div className="hidden md:block"><NotificationBell placement="sidebar" /></div>
            <button type="button" onClick={close} aria-label="Close menu" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent md:hidden">
              <X size={18} aria-hidden />
            </button>
          </div>

          {/* App-wide location */}
          {(hubScope.canSwitchHubs || hubScope.hubName) && (
            <div className="px-3 pb-3">
              <p className="px-2 pb-1.5 text-xs font-medium text-sidebar-foreground/70">Location</p>
              <LocationSelect scope={hubScope} className="w-full bg-background" />
            </div>
          )}

          {/* Navigation */}
          <nav aria-label="Primary" className="flex-1 space-y-4 overflow-y-auto border-t border-sidebar-border px-3 py-3">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter(visible);
              if (items.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="px-3 pb-1 text-xs font-medium text-sidebar-foreground/70">{group.label}</p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                              active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            )}
                          >
                            <item.icon size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                            <span>{item.label}</span>
                            {badgeFor(item, active)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          <UserMenu onNavigate={close} />
        </div>
      </aside>
    </>
  );
}

/** Footer account menu: profile, alerts, theme, log out. */
function UserMenu({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const { user, logout } = useAuth();
  const { theme = 'system', setTheme } = useTheme();
  if (!user) return null;
  const item = 'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="border-t border-sidebar-border p-2">
      <Menu.Root>
        <Menu.Trigger className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-sidebar-accent">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary" aria-hidden>
            {user.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-sidebar-foreground">{user.name}</span>
            <span className="block truncate text-xs text-sidebar-foreground/75" title={user.roleName || undefined}>{user.role}</span>
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Account menu</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="start" sideOffset={6} className="z-50">
            <Menu.Popup className="w-[244px] rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item className={item} render={<Link href="/settings" onClick={onNavigate} />}>
                <User aria-hidden /> Profile and password
              </Menu.Item>
              <Menu.Item className={item} render={<Link href="/settings?tab=alerts" onClick={onNavigate} />}>
                <Bell aria-hidden /> Alert settings
              </Menu.Item>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Group>
                <Menu.GroupLabel className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Theme</Menu.GroupLabel>
                <Menu.RadioGroup value={theme} onValueChange={(v) => setTheme(String(v))}>
                  {themes.map((t) => (
                    <Menu.RadioItem key={t.id} value={t.id} className={item} closeOnClick={false}>
                      <t.icon aria-hidden /> <span className="flex-1">{t.label}</span>
                      <Menu.RadioItemIndicator><Check className="text-primary!" aria-hidden /></Menu.RadioItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Group>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item className={cn(item, 'text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive')} onClick={logout}>
                <LogOut aria-hidden /> Log out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

/** Phone top bar: menu, page title, bell. Replaces the buttons that floated over content. */
export function MobileTopBar({ menuOpen, onMenu }: Readonly<{ menuOpen: boolean; onMenu: () => void }>) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:hidden">
      <button type="button" onClick={onMenu} aria-label="Open menu" aria-expanded={menuOpen} className="inline-flex size-9 items-center justify-center rounded-md border bg-card">
        <MenuIcon size={18} aria-hidden />
      </button>
      <p className="min-w-0 flex-1 truncate text-base font-semibold">{titleForPath(pathname)}</p>
      <NotificationBell />
    </div>
  );
}

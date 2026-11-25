'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTheme } from 'next-themes';
import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import { Bell, Check, ChevronsUpDown, LogOut, MapPin, Menu as MenuIcon, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useInventory, useFeedback, useEnquiries, useCreditSummary } from '@/hooks/use-queries';
import { useKitchenJobs } from '@/hooks/use-kitchen';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { BrandLogo, BrandMark } from '@/components/brand';
import { NotificationBell } from '@/contexts/crm-notifications-context';
import { LocationSelect } from '@/components/app/location-select';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, isActivePath, titleForPath, type NavItem } from './nav-config';

const NAV_BADGE = 'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums';

type SidebarProps = { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void };

const COLLAPSED_KEY = 'fudfarmer_nav_collapsed';
const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Desktop-only icon rail, remembered per browser. Phones always get the full drawer. */
function useNavCollapsed() {
  const [collapsed, setState] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setState((c) => {
      const next = !c;
      try {
        if (next) localStorage.setItem(COLLAPSED_KEY, '1');
        else localStorage.removeItem(COLLAPSED_KEY);
      } catch {
        /* storage blocked: keep the in-memory value */
      }
      return next;
    });
  }, []);
  // Ctrl+B / ⌘B toggles the rail, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'b' || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  return { collapsed, toggle };
}

/** Label tooltip for rail icons; renders the child unchanged when the rail is expanded. */
function RailTip({ label, show, children }: Readonly<{ label: string; show: boolean; children: ReactElement }>) {
  if (!show) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={10} className="z-50">
          <Tooltip.Popup className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md">{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const { data: inventory } = useInventory(undefined, { enabled: can('inventory.view') });
  const canViewInteractions = can('interactions.view');
  const { data: feedback } = useFeedback(undefined, { enabled: canViewInteractions });
  const { data: enquiries } = useEnquiries(undefined, { enabled: canViewInteractions });
  const { data: creditSummary = [] } = useCreditSummary(undefined, { enabled: can('credits.view') });
  // New jobs waiting to be accepted (limit 1: only the stage counts are needed).
  const { data: kitchenJobs } = useKitchenJobs({ stage: 'new', limit: 1 }, { enabled: can('kitchen.view'), live: true });
  const hubScope = useHubScopeFilter();
  const close = () => onMobileOpenChange(false);
  const { collapsed, toggle } = useNavCollapsed();
  // Rail styles apply from md up only; the phone drawer is always full width.
  const rail = (classes: string) => (collapsed ? classes : '');

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

  const badgeInfo = (item: NavItem): { n: number; label: string; tone: 'warning' | 'danger' | 'neutral' } | null => {
    if (item.href === '/inventory' && counts.lowStock > 0) return { n: counts.lowStock, label: 'stock alerts', tone: 'warning' };
    if (item.href === '/credits' && counts.overdue > 0) return { n: counts.overdue, label: 'overdue credits', tone: 'danger' };
    if (item.href === '/engagement' && canViewInteractions && counts.openTickets > 0) return { n: counts.openTickets, label: 'open tickets', tone: 'neutral' };
    if (item.href === '/kitchen' && counts.newJobs > 0) return { n: counts.newJobs, label: 'new kitchen jobs', tone: 'neutral' };
    return null;
  };

  const badgeFor = (item: NavItem, active: boolean) => {
    const b = badgeInfo(item);
    if (!b) return null;
    const tone =
      b.tone === 'warning' ? 'bg-warning text-warning-foreground'
        : b.tone === 'danger' ? 'bg-destructive text-destructive-foreground'
          : active ? 'bg-primary-foreground text-primary' : 'bg-sidebar-accent text-sidebar-accent-foreground';
    return (
      <span className={cn(NAV_BADGE, tone, rail('md:hidden'))} aria-label={`${b.n} ${b.label}`}>{b.n}</span>
    );
  };

  /** On the rail a count becomes a dot on the icon; the number moves to the tooltip and screen-reader text. */
  const railDot = (item: NavItem) => {
    const b = badgeInfo(item);
    if (!b || !collapsed) return null;
    const tone = b.tone === 'warning' ? 'bg-warning' : b.tone === 'danger' ? 'bg-destructive' : 'bg-primary';
    return <span aria-hidden className={cn('absolute -top-1 -right-1 hidden size-2.5 rounded-full ring-2 ring-sidebar md:block', tone)} />;
  };
  const tipFor = (item: NavItem) => {
    const b = badgeInfo(item);
    return b ? `${item.label}, ${b.n} ${b.label}` : item.label;
  };

  return (
    <>
      {/* Phone overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={close} aria-hidden />}

      <aside
        aria-label="Main"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] shrink-0 transition-[transform,visibility,width] duration-200 md:visible md:relative md:z-30 md:translate-x-0 motion-reduce:transition-none',
          mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
          rail('md:w-[68px]'),
        )}
      >
        <Tooltip.Provider delay={150}>
        <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
          {/* Brand + bell */}
          <div className={cn('flex items-center justify-between gap-2 py-4 pr-3 pl-5', rail('md:flex-col md:justify-start md:gap-3 md:px-0'))}>
            <BrandLogo variant="color" width={140} className={cn('dark:hidden', rail('md:hidden'))} />
            <BrandLogo variant="white" width={140} className={cn('hidden dark:block', rail('md:hidden dark:md:hidden'))} />
            {collapsed && <BrandMark size={28} className="hidden md:block" />}
            <div className="hidden md:block"><NotificationBell placement="sidebar" /></div>
            <button type="button" onClick={close} aria-label="Close menu" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent md:hidden">
              <X size={18} aria-hidden />
            </button>
          </div>

          {/* App-wide location */}
          {(hubScope.canSwitchHubs || hubScope.hubName) && (
            <>
              <div className={cn('px-3 pb-3', rail('md:hidden'))}>
                <p className="px-2 pb-1.5 text-xs font-medium text-sidebar-foreground/70">Location</p>
                <LocationSelect scope={hubScope} className="w-full bg-background" />
              </div>
              {collapsed && (
                <div className="hidden justify-center pb-3 md:flex">
                  <RailTip show label={`Location: ${hubScope.filterHub === 'All' ? (hubScope.canSwitchHubs ? 'All locations' : hubScope.hubName) : hubScope.filterHub}. Expand to change`}>
                    <button type="button" onClick={toggle} aria-label={`Location: ${hubScope.filterHub === 'All' ? (hubScope.canSwitchHubs ? 'All locations' : hubScope.hubName) : hubScope.filterHub}. Expand the menu to change it`} className="inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
                      <MapPin size={16} aria-hidden />
                    </button>
                  </RailTip>
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <nav aria-label="Primary" className={cn('scrollbar-none flex-1 space-y-4 overflow-y-auto border-t border-sidebar-border px-3 py-3', rail('md:space-y-3 md:px-2'))}>
            {NAV_GROUPS.map((group, gi) => {
              const items = group.items.filter(visible);
              if (items.length === 0) return null;
              return (
                <div key={group.label} className={cn(gi > 0 && rail('md:border-t md:border-sidebar-border md:pt-3'))}>
                  <p className={cn('px-3 pb-1 text-xs font-medium text-sidebar-foreground/70', rail('md:sr-only'))}>{group.label}</p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <RailTip show={collapsed} label={tipFor(item)}>
                            <Link
                              href={item.href}
                              onClick={close}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                rail('md:h-10 md:justify-center md:px-0'),
                              )}
                            >
                              <span className="relative inline-flex">
                                <item.icon size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                                {railDot(item)}
                              </span>
                              <span className={rail('md:sr-only')}>{item.label}</span>
                              {badgeFor(item, active)}
                            </Link>
                          </RailTip>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="hidden border-t border-sidebar-border p-2 md:block">
            <RailTip show={collapsed} label={`Expand menu (${isMac() ? '⌘' : 'Ctrl+'}B)`}>
              <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                title={collapsed ? undefined : `Collapse menu (${isMac() ? '⌘' : 'Ctrl+'}B)`}
                className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', rail('justify-center px-0'))}
              >
                {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
                <span className={rail('sr-only')}>Collapse menu</span>
              </button>
            </RailTip>
          </div>

          <UserMenu onNavigate={close} collapsed={collapsed} />
        </div>
        </Tooltip.Provider>
      </aside>
    </>
  );
}

/** Footer account menu: profile, alerts, theme, log out. */
function UserMenu({ onNavigate, collapsed }: Readonly<{ onNavigate: () => void; collapsed: boolean }>) {
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
        <Menu.Trigger title={collapsed ? user.name : undefined} className={cn('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-sidebar-accent', collapsed && 'md:justify-center md:px-0')}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary" aria-hidden>
            {user.name.charAt(0)}
          </span>
          <span className={cn('min-w-0 flex-1', collapsed && 'md:hidden')}>
            <span className="block truncate text-[13px] font-medium text-sidebar-foreground">{user.name}</span>
            <span className="block truncate text-xs text-sidebar-foreground/75" title={user.roleName || undefined}>{user.role}</span>
          </span>
          <ChevronsUpDown size={14} className={cn("shrink-0 text-muted-foreground", collapsed && "md:hidden")} aria-hidden />
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

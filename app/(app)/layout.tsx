'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MobileTopBar, Sidebar } from '@/components/layout/sidebar';
import { BrandLoader } from '@/components/brand';
import { CrmNotificationsProvider } from '@/contexts/crm-notifications-context';
import { HubContextProvider } from '@/contexts/hub-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState({ open: false, path: pathname });
  // Close the phone menu after navigating.
  if (menu.path !== pathname) setMenu({ open: false, path: pathname });
  const setMenuOpen = (open: boolean) => setMenu({ open, path: pathname });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Block only when there is no cached/resolved session user
  if (!user) {
    return <BrandLoader />;
  }

  // CRM notifications are app-wide. POS till activity is mounted only on /pos (see app/(app)/pos/layout.tsx).
  return (
    <CrmNotificationsProvider key={user.id}>
      <HubContextProvider key={`hub-${user.id}`}>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar mobileOpen={menu.open} onMobileOpenChange={setMenuOpen} />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar menuOpen={menu.open} onMenu={() => setMenuOpen(true)} />
            <main className="min-w-0 flex-1 overflow-y-auto bg-background p-4 md:p-8 lg:p-10">{children}</main>
          </div>
        </div>
      </HubContextProvider>
    </CrmNotificationsProvider>
  );
}

'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { BrandLoader } from '@/components/brand';
import { CrmNotificationsProvider, NotificationBell } from '@/contexts/crm-notifications-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

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
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-background p-5 pt-14 md:p-8 md:pt-8 lg:p-10 lg:pt-10">
          <div className="mb-3 flex justify-end">
            <NotificationBell />
          </div>
          {children}
        </main>
      </div>
    </CrmNotificationsProvider>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { DashboardContent } from './_dashboard/dashboard-content';

export default function DashboardPage() {
  const router = useRouter();
  const { can } = usePermissions();
  // Kitchen-only roles (e.g. Kitchen Manager) have no dashboard data; send them to their workspace.
  const kitchenOnly = !can('dashboard.view') && can('kitchen.view');
  useEffect(() => {
    if (kitchenOnly) router.replace('/kitchen');
  }, [kitchenOnly, router]);
  if (kitchenOnly) return null;
  return <DashboardContent />;
}

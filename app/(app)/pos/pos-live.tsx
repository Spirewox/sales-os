'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { CrmLiveProvider } from '@/contexts/crm-live-context';

/** POS live tills (WebSocket via pos/live-ticket), only for users who can view POS and only on /pos pages. */
export function PosLive({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  if (!user || !can('pos.view')) return <>{children}</>;
  return <CrmLiveProvider key={user.id}>{children}</CrmLiveProvider>;
}

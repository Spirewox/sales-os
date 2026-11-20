'use client';

import { useMemo } from 'react';
import { useAgents, useHubs, useRoles } from '@/hooks/use-queries';
import { useDataScope } from '@/hooks/use-data-scope';
import { HAS_API } from '@/lib/require-api';
import type { ApiRole } from '@/types/api';
import { asList } from './settings-ui';

/** Users, locations and roles for the Organisation sections, with malformed responses turned into empty lists. */
export function useSettingsData() {
  const { canSwitchHubs, hubId: scopeHubId } = useDataScope();
  const agentsQuery = useMemo(
    () => (HAS_API && !canSwitchHubs && scopeHubId ? { hub_id: scopeHubId, limit: 200 } : { limit: 200 }),
    [canSwitchHubs, scopeHubId],
  );
  const agentsResult = useAgents(agentsQuery);
  const hubsResult = useHubs();
  const rolesResult = useRoles();
  const agents = asList(agentsResult.data);
  const hubs = asList(hubsResult.data);
  const apiRoles = asList(rolesResult.data);

  // System roles first, then custom roles, each alphabetical.
  const allRoles: ApiRole[] = useMemo(() => {
    if (!HAS_API || apiRoles.length === 0) return [];
    return [...apiRoles].sort((a, b) => {
      const aSystem = a.is_system !== false ? 0 : 1;
      const bSystem = b.is_system !== false ? 0 : 1;
      if (aSystem !== bSystem) return aSystem - bSystem;
      return a.label.localeCompare(b.label);
    });
  }, [apiRoles]);

  const activeHubs = useMemo(() => hubs.filter((h) => h.isActive), [hubs]);

  return {
    agents,
    agentsLoading: agentsResult.isPending,
    hubs,
    hubsLoading: hubsResult.isPending,
    apiRoles,
    allRoles,
    activeHubs,
    canSwitchHubs,
    scopeHubId,
  };
}

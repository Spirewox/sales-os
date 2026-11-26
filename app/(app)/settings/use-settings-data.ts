'use client';

import { useMemo } from 'react';
import { useAgents, useHubs, useRoles } from '@/hooks/use-queries';
import { useDataScope } from '@/hooks/use-data-scope';
import { HAS_API } from '@/lib/require-api';
import { visibleHubs } from '@/lib/hub-visibility';
import { managesOtherHubs } from '@/lib/user-locations';
import type { ApiRole } from '@/types/api';
import { asList } from './settings-ui';

/** Users, locations and roles for the Organisation sections, with malformed responses turned into empty lists. */
export function useSettingsData() {
  const { canSwitchHubs, hubId: scopeHubId, visibleHubIds } = useDataScope();
  const hubsResult = useHubs();
  const hubs = asList(hubsResult.data);
  // One hub (with its RSPs), as today: ask for its users. Several hubs or all: ask for everyone;
  // the API scopes the list to what the person may see.
  const managesSeveral = !canSwitchHubs && managesOtherHubs(visibleHubIds, scopeHubId, hubs);
  const agentsQuery = useMemo(
    () => (HAS_API && !canSwitchHubs && !managesSeveral && scopeHubId ? { hub_id: scopeHubId, limit: 200 } : { limit: 200 }),
    [canSwitchHubs, managesSeveral, scopeHubId],
  );
  const agentsResult = useAgents(agentsQuery);
  const rolesResult = useRoles();
  const agents = asList(agentsResult.data);
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
  // What this person may assign to a user: every active location for an admin, their locations for a
  // manager of several, and their own hub only for a single-hub manager (as before).
  const visibleKey = visibleHubIds.join(',');
  const editableHubIds = useMemo(() => {
    if (!canSwitchHubs && !managesSeveral) return new Set(scopeHubId ? [scopeHubId] : []);
    return new Set(visibleHubs(hubs, { isGlobal: canSwitchHubs, hubId: scopeHubId, visibleHubIds: visibleKey ? visibleKey.split(',') : [] }).map((h) => h.id));
  }, [hubs, canSwitchHubs, managesSeveral, scopeHubId, visibleKey]);

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
    editableHubIds,
  };
}

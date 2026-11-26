'use client';

import { useMemo, useState } from 'react';
import { useDataScope } from '@/hooks/use-data-scope';
import { useHubs } from '@/hooks/use-queries';
import { useHubContext } from '@/contexts/hub-context';

import { HAS_API } from '@/lib/require-api';
import { allLocationsLabel, resolveFilterHub, visibleHubs } from '@/lib/hub-visibility';

export function useHubScopeFilter() {
  const { canSwitchHubs: isGlobal, hubId, hubName, visibleHubIds } = useDataScope();
  const { data: hubs = [] } = useHubs();
  // The API returns permitted locations. Also constrain cached results while a session changes:
  // a manager of several locations sees exactly those, others their hub and its RSPs.
  const visibleKey = visibleHubIds.join(',');
  const activeHubs = useMemo(
    () => visibleHubs(hubs, { isGlobal, hubId, visibleHubIds: visibleKey ? visibleKey.split(',') : [] }),
    [hubs, isGlobal, hubId, visibleKey],
  );
  const canSwitchHubs = isGlobal || activeHubs.length > 1;

  const lockedHubName = useMemo(() => {
    if (hubName) return hubName;
    if (hubId) {
      const match = activeHubs.find((h) => h.id === hubId);
      if (match) return match.name;
    }
    return activeHubs[0]?.name ?? '';
  }, [hubName, hubId, activeHubs]);

  // Follows the app-wide location when the provider is mounted; local state otherwise.
  const shared = useHubContext();
  const [localHub, setLocalHub] = useState<string>('All');
  const selectedHub = shared?.selectedHub ?? localHub;
  const setFilterHub = shared?.setSelectedHub ?? setLocalHub;
  // A location this user cannot see (a link from an admin, say) falls back to all of theirs.
  const filterHub = resolveFilterHub(selectedHub, activeHubs);

  const hubIdForApi = useMemo(() => {
    if (!HAS_API || !canSwitchHubs || filterHub === 'All') return undefined;
    return activeHubs.find((h) => h.name === filterHub)?.id;
  }, [canSwitchHubs, filterHub, activeHubs]);

  const hubOptions = useMemo(
    () => (canSwitchHubs ? ['All', ...activeHubs.map((h) => h.name)] : []),
    [canSwitchHubs, activeHubs],
  );

  const hubOptionsDetailed = useMemo(
    () =>
      canSwitchHubs
        ? activeHubs.map((h) => ({
            id: h.id,
            name: h.name,
            locationType: h.locationType,
          }))
        : [],
    [canSwitchHubs, activeHubs],
  );

  const matchesHub = (locationName: string | undefined) =>
    filterHub === 'All' || locationName === filterHub;

  const defaultHubName = isGlobal
    ? activeHubs[0]?.name ?? lockedHubName
    : lockedHubName;

  const defaultHubId = useMemo(() => {
    const name = defaultHubName;
    return activeHubs.find((h) => h.name === name)?.id ?? hubId ?? undefined;
  }, [defaultHubName, activeHubs, hubId]);

  return {
    canSwitchHubs,
    /** "All locations" for an admin, "All my locations" for a manager of several. */
    allLabel: allLocationsLabel(isGlobal),
    hubName: lockedHubName,
    filterHub,
    setFilterHub,
    hubIdForApi,
    hubOptions,
    hubOptionsDetailed,
    activeHubs,
    matchesHub,
    defaultHubName,
    defaultHubId,
  };
}

export type HubScopeFilter = ReturnType<typeof useHubScopeFilter>;

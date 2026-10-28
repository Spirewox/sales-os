'use client';

import { useMemo, useState } from 'react';
import { useDataScope } from '@/hooks/use-data-scope';
import { useHubs } from '@/hooks/use-queries';

import { HAS_API } from '@/lib/require-api';

export function useHubScopeFilter() {
  const { canSwitchHubs: isGlobal, hubId, hubName } = useDataScope();
  const { data: hubs = [] } = useHubs();
  // The API returns permitted locations. Also constrain cached results while a session changes.
  const activeHubs = useMemo(() => hubs.filter((h) => h.isActive &&
    (isGlobal || h.id === hubId || h.parentHubId === hubId)), [hubs, isGlobal, hubId]);
  const canSwitchHubs = isGlobal || activeHubs.length > 1;

  const lockedHubName = useMemo(() => {
    if (hubName) return hubName;
    if (hubId) {
      const match = activeHubs.find((h) => h.id === hubId);
      if (match) return match.name;
    }
    return activeHubs[0]?.name ?? '';
  }, [hubName, hubId, activeHubs]);

  const [selectedHub, setFilterHub] = useState<string>('All');
  const filterHub = activeHubs.some((h) => h.name === selectedHub) ? selectedHub : 'All';

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

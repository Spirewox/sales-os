import type { Hub } from '@/types';

/** Who is looking: a Company Admin sees everything; others see their assigned locations. */
export type ScopeInput = { isGlobal: boolean; hubId: string | null; visibleHubIds?: string[] };

/**
 * The active locations a user may see and switch between. With `visibleHubIds` from whoami, exactly
 * those; without it (older sessions, single-hub managers), their hub and the RSPs under it.
 */
export function visibleHubs(hubs: Hub[], scope: ScopeInput): Hub[] {
  const active = hubs.filter((h) => h.isActive);
  if (scope.isGlobal) return active;
  if (scope.visibleHubIds?.length) {
    const visible = new Set(scope.visibleHubIds);
    return active.filter((h) => visible.has(h.id));
  }
  return active.filter((h) => h.id === scope.hubId || h.parentHubId === scope.hubId);
}

/** "All locations" for a Company Admin, "All my locations" for anyone limited to some. */
export function allLocationsLabel(isGlobal: boolean): 'All locations' | 'All my locations' {
  return isGlobal ? 'All locations' : 'All my locations';
}

/** A chosen location the user can see, or 'All' (their locations together) when they cannot. */
export function resolveFilterHub(selected: string, visible: Hub[]): string {
  return visible.some((h) => h.name === selected) ? selected : 'All';
}

/** A user's locations in one cell: "Lagos Hub", or "Lagos Hub +2" with all of them as a tooltip. */
export function assignedSummary(names: string[]): { label: string; title?: string } {
  if (names.length === 0) return { label: '-' };
  if (names.length === 1) return { label: names[0] };
  return { label: `${names[0]} +${names.length - 1}`, title: names.join(', ') };
}

/** Whether a user may act at a location (approve or fulfil its requests): any visible one, or their hub. */
export function canActAt(visibleIds: string[], hubId: string | null | undefined, locationId: string): boolean {
  return visibleIds.length ? visibleIds.includes(locationId) : !!hubId && hubId === locationId;
}

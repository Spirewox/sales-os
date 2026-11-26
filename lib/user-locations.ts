import type { Hub } from '@/types';

/** The rules for which locations a user is assigned, shared by Settings → Users and its tests. */
const CASHIER_NOTE = 'A cashier works at one location.';

/**
 * The locations a role keeps. A POS cashier holds one (their till belongs to it); every other
 * non-admin role may hold several. The primary falls back to the first chosen location.
 */
export function locationsForRole(isPosRole: boolean, hubIds: string[], primary: string | undefined): { hubIds: string[]; primary: string | undefined; note?: string } {
  const main = primary && hubIds.includes(primary) ? primary : hubIds[0];
  if (isPosRole && hubIds.length > 1) return { hubIds: main ? [main] : [], primary: main, note: CASHIER_NOTE };
  return { hubIds, primary: main };
}

/** A manager editing a colleague changes only the locations they can see; the others are kept. */
export function mergeAssignedHubs(original: string[], editable: Set<string>, chosen: string[]): string[] {
  return [...original.filter((id) => !editable.has(id)), ...chosen.filter((id) => editable.has(id))];
}

export function validateUserLocations(input: { isAdminRole: boolean; isPosRole: boolean; hubIds: string[]; primary?: string }): string | null {
  if (input.isAdminRole) return null;
  if (input.hubIds.length === 0) return 'Choose at least one location.';
  if (input.isPosRole && input.hubIds.length > 1) return CASHIER_NOTE;
  if (input.primary && !input.hubIds.includes(input.primary)) return 'The primary location must be one of the chosen locations.';
  return null;
}

/**
 * The primary after the chosen locations change: kept while chosen, unless it is a location the
 * editor cannot see that only became primary as a stopgap (not `original`); otherwise one the editor
 * can see, else the first.
 */
export function nextPrimary(hubIds: string[], current: string | undefined, editable: Set<string>, original?: string): string | undefined {
  const editorsOwn = hubIds.find((id) => editable.has(id));
  if (current && hubIds.includes(current) && (editable.has(current) || current === original || !editorsOwn)) return current;
  return editorsOwn ?? hubIds[0];
}

/**
 * Where the form starts. A new user has nothing to keep and starts at the editor's own hub (none
 * for an admin, who picks); an edit starts from the user's locations, or, on older records, the hub
 * named in `location`.
 */
export function startingAssignment(
  user: { isNew: boolean; hubIds?: string[]; location?: string },
  hubs: Hub[],
  defaultHubId: string | undefined,
): { original: string[]; chosen: string[]; primary: string | undefined } {
  if (user.isNew) return { original: [], chosen: defaultHubId ? [defaultHubId] : [], primary: defaultHubId };
  const original = user.hubIds?.length ? user.hubIds : hubs.filter((h) => h.name === user.location).map((h) => h.id);
  return { original, chosen: original, primary: original[0] };
}

/**
 * What a save sends. An admin role holds no locations. A cashier holds the one location picked,
 * which may move them off a location the editor cannot change (a closed hub, say). Anyone else keeps
 * the locations the editor cannot see, plus the editor's choice, with the primary among them.
 */
export function finalAssignment(input: {
  adminRole: boolean; isPosRole: boolean; original: string[]; chosen: string[]; editable: Set<string>; primary: string | undefined;
}): { hubIds: string[]; primary: string | undefined } {
  if (input.adminRole) return { hubIds: [], primary: undefined };
  if (input.isPosRole) {
    const one = input.chosen[0] ?? input.original[0];
    return { hubIds: one ? [one] : [], primary: one };
  }
  const hubIds = mergeAssignedHubs(input.original, input.editable, input.chosen);
  const primary = input.primary && hubIds.includes(input.primary) ? input.primary : hubIds.find((id) => input.editable.has(id)) ?? hubIds[0];
  return { hubIds, primary };
}

/** A user's locations with their primary (the API's `hub`) first, whatever order the list came in. */
export function primaryFirstIds(primary: string | undefined, ids: string[]): string[] {
  if (!primary) return ids;
  return [primary, ...ids.filter((id) => id !== primary)];
}

/**
 * Whether a manager's visible locations reach beyond their own hub and its RSPs, that is whether
 * they manage several locations rather than one hub as today.
 */
export function managesOtherHubs(visibleIds: string[], hubId: string | null | undefined, hubs: Hub[]): boolean {
  return visibleIds.some((id) => id !== hubId && hubs.find((h) => h.id === id)?.parentHubId !== hubId);
}

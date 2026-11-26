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

/**
 * Package-only types for LocationSelect, in place of the app's useHubScopeFilter hook and Hub
 * model. Build the scope from your own location data.
 */
export type LocationOption = { id?: string; name: string; locationType?: string; code?: string };

export type HubScopeFilter = {
  /** False when the person can see one location only: LocationSelect then shows it read-only. */
  canSwitchHubs: boolean;
  /** The person's own location, shown read-only when they cannot switch. */
  hubName: string;
  /** The selected location's name, or 'All'. */
  filterHub: string;
  setFilterHub: (name: string) => void;
  hubOptionsDetailed: LocationOption[];
  /** Words for the "All" option, such as "All my locations". Defaults to "All locations". */
  allLabel?: string;
};

/** "Lagos Hub (Hub · LG1)": the label LocationSelect shows for each option. Copied from lib/api-mappers.ts. */
export function hubOptionLabel(hub: LocationOption, extras?: string): string {
  const typeLabel = hub.locationType === 'rsp' ? 'RSP' : 'Hub';
  const codePart = hub.code ? ` · ${hub.code}` : '';
  const base = `${hub.name} (${typeLabel}${codePart})`;
  return extras ? `${base} ${extras}` : base;
}

/**
 * Whether a row at `rowHub` belongs in a mock list. With no requested location the server limits
 * to the user's visible locations (null visible = the admin, everything); a requested location
 * outside them shows nothing, as the API's 403 would.
 */
export function hubInScope(requested: string | null, rowHub: string | null | undefined, visible: string[] | null): boolean {
  if (requested) return rowHub === requested && (!visible || visible.includes(requested));
  return !visible || (!!rowHub && visible.includes(rowHub));
}

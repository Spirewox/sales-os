/**
 * Mock answers for listing and saving users with several locations. Kept apart from handler.ts
 * (which reaches runtime enums) so `npm test` can load it.
 */
import type { ApiAgentUser } from '@/types/api';
import { validateUserLocations } from '@/lib/user-locations';

type HubRef = { _id: string; hub_name?: string };
type Body = Partial<Omit<ApiAgentUser, 'hub' | 'hubs'>> & { hub_id?: string; hub_ids?: string[]; role_id?: string };

const hubIdsOf = (u: ApiAgentUser) => (u.hubs?.length ? u.hubs.map((h) => h._id) : u.hub?._id ? [u.hub._id] : []);

/** GET users: hub_id matches any of a user's locations; with none, the caller's visible ones (null = all). */
export function filterUsers(users: ApiAgentUser[], q: URLSearchParams, visible: string[] | null = null): ApiAgentUser[] {
  const asked = q.get('hub_id');
  return users.filter((u) => {
    const ids = hubIdsOf(u);
    if (asked) return ids.includes(asked);
    // Users with no location (company-wide roles) stay listed.
    return !visible || ids.length === 0 || ids.some((id) => visible.includes(id));
  });
}

let seq = 0;
/** POST users/create (id null) or PATCH users/:id, keeping hub_ids with the primary first. */
export function saveUser(
  users: ApiAgentUser[], hubs: HubRef[], id: string | null, body: Body, isPosRole: (roleId: string) => boolean = () => false,
): { status: number; data: unknown } {
  const existing = id === null ? undefined : users.find((u) => u._id === id);
  if (id !== null && !existing) return { status: 404, data: { message: 'User not found.' } };
  const { hub_id, hub_ids, role_id, ...rest } = body;
  if (hub_ids) {
    const problem = validateUserLocations({ isAdminRole: false, isPosRole: !!role_id && isPosRole(role_id), hubIds: hub_ids, primary: hub_id });
    if (problem) return { status: 400, data: { message: problem } };
  }
  const ordered = hub_ids ? [...(hub_id ? [hub_id] : []), ...hub_ids.filter((h) => h !== hub_id)] : undefined;
  const refs = ordered?.map((h) => ({ _id: h, hub_name: hubs.find((x) => x._id === h)?.hub_name ?? h }));
  const patch = { ...rest, ...(refs ? { hubs: refs, hub: refs[0] ?? null } : {}) };
  if (existing) {
    Object.assign(existing, patch);
    return { status: 200, data: existing };
  }
  seq += 1;
  const created = { _id: `user_new_${seq}`, full_name: '', email: '', phone: '', is_active: true, createdAt: new Date().toISOString(), ...patch } as ApiAgentUser;
  users.push(created);
  return { status: 200, data: created };
}

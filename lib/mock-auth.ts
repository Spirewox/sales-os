/**
 * Dev-only mock sign-in for front-end/design work without a backend.
 * Active only when NEXT_PUBLIC_API_URL is unset AND running `next dev`.
 * Any email/password signs in as a full-access Company Admin; an email starting multi@ signs in as
 * a Hub Manager of several locations (see lib/mock-personas.ts).
 */
import type { AppUser } from '@/types/api';
import { MOCK_API } from '@/lib/require-api';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MAP } from '@/lib/permissions';
import { MULTI_VISIBLE_HUB_IDS, parseMockSession, type MockPersona } from '@/lib/mock-personas';

export const MOCK_AUTH = MOCK_API;

const MOCK_SESSION_KEY = 'fudfarmer_mock_session';

export const MOCK_USER: AppUser = {
  id: 'mock-user',
  name: 'Design Preview',
  email: 'design@fudfarmer.local',
  phone: '',
  is_active: true,
  hubId: null,
  hubName: null,
  location: 'All hubs',
  dataScope: 'all',
  role: 'Company Admin',
  roleName: 'company_admin',
  permissions: Object.values(PERMISSION_MAP),
  visibleHubIds: [],
};

/** A Hub Manager of Ife Hub (with Modakeke RSP) and Nasarawa Hub, who may also manage users. */
export const MOCK_MULTI_USER: AppUser = {
  id: 'user_2',
  name: 'Kunle Oyewole',
  email: 'multi@fudfarmer.local',
  phone: '',
  is_active: true,
  hubId: 'hub_ife',
  hubName: 'Ife Hub',
  location: 'Ife Hub',
  dataScope: 'hub',
  role: 'Hub Manager',
  roleName: 'hub_manager',
  permissions: [...DEFAULT_ROLE_PERMISSIONS['Hub Manager'], 'settings.manage_users' as const].map((p) => PERMISSION_MAP[p]),
  visibleHubIds: MULTI_VISIBLE_HUB_IDS,
};

function storedPersona(): MockPersona | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseMockSession(localStorage.getItem(MOCK_SESSION_KEY));
  } catch {
    return null;
  }
}

export function hasMockSession(): boolean {
  return storedPersona() !== null;
}

/** The signed-in mock user: the admin, or the manager of several locations. */
export function currentMockUser(): AppUser {
  return storedPersona() === 'multi' ? MOCK_MULTI_USER : MOCK_USER;
}

export function setMockSession(active: boolean, persona: MockPersona = 'admin'): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) localStorage.setItem(MOCK_SESSION_KEY, persona === 'multi' ? 'multi' : '1');
    else localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // Ignore storage failures
  }
}

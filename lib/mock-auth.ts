/**
 * Dev-only mock sign-in for front-end/design work without a backend.
 * Active only when NEXT_PUBLIC_API_URL is unset AND running `next dev`.
 * Any email/password signs in as a full-access Company Admin.
 */
import type { AppUser } from '@/types/api';
import { MOCK_API } from '@/lib/require-api';
import { PERMISSION_MAP } from '@/lib/permissions';

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

export function hasMockSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MOCK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMockSession(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) localStorage.setItem(MOCK_SESSION_KEY, '1');
    else localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // Ignore storage failures
  }
}

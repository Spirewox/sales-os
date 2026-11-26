/**
 * Mock-mode sign-in personas: the admin (any email) and a Hub Manager of several locations
 * (an email starting multi@). Pure, so `npm test` can load it; lib/mock-auth.ts builds the users.
 */
export type MockPersona = 'admin' | 'multi';

/** Kunle Oyewole manages Ife Hub (with its Modakeke RSP) and Nasarawa Hub. */
export const MULTI_VISIBLE_HUB_IDS = ['hub_ife', 'rsp_modakeke', 'hub_nasarawa'];

export function mockPersonaForEmail(email: string): MockPersona {
  return email.trim().toLowerCase().startsWith('multi@') ? 'multi' : 'admin';
}

/** The stored session value: '1' (older sessions, the admin) or a persona name. */
export function parseMockSession(value: string | null): MockPersona | null {
  if (value === 'multi') return 'multi';
  if (value === '1' || value === 'admin') return 'admin';
  return null;
}

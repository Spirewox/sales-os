/** True when a real backend is configured via NEXT_PUBLIC_API_URL. */
export const REAL_API = Boolean(process.env.NEXT_PUBLIC_API_URL);

/**
 * Dev-only mock backend: `next dev` with no NEXT_PUBLIC_API_URL serves sample data
 * from lib/mock-api so the UI can be designed without a backend. Never on in production builds.
 */
export const MOCK_API = !REAL_API && process.env.NODE_ENV === 'development';

/** Shared API-mode guard for hooks (real backend or dev mock). */
export const HAS_API = REAL_API || MOCK_API;

export function requireApi(feature = 'This operation'): void {
  if (!HAS_API) {
    throw new Error(`${feature} requires API connection (set NEXT_PUBLIC_API_URL)`);
  }
}

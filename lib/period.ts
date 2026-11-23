import { APP_TIMEZONE } from '@/lib/format';

/** One period vocabulary for the whole app. */
export const PERIOD_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]['id'] | 'custom';
export type Period = { preset: PeriodPreset; from?: string; to?: string };

/** YYYY-MM-DD for a date as seen in Lagos. */
export function lagosDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Inclusive YYYY-MM-DD bounds; null bounds mean open-ended. */
export function periodRange(p: Period, now: Date = new Date()): { from: string | null; to: string | null } {
  const today = lagosDay(now);
  switch (p.preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'custom':
      return { from: p.from ?? null, to: p.to ?? null };
    default:
      return { from: null, to: null };
  }
}

/** The equally long period immediately before `p`, for "vs previous" comparisons. */
export function previousRange(p: Period, now: Date = new Date()): { from: string; to: string } | null {
  const { from, to } = periodRange(p, now);
  if (!from || !to) return null;
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
  return { from: addDays(from, -days), to: addDays(from, -1) };
}

/** True when an ISO timestamp or YYYY-MM-DD falls inside the period (Lagos days). */
export function inPeriod(value: string | Date | null | undefined, p: Period, now?: Date): boolean {
  if (p.preset === 'all') return true;
  if (!value) return false;
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : lagosDay(new Date(value));
  const { from, to } = periodRange(p, now);
  return (!from || day >= from) && (!to || day <= to);
}

export function periodLabel(p: Period): string {
  if (p.preset !== 'custom') return PERIOD_PRESETS.find((x) => x.id === p.preset)?.label ?? 'All time';
  const fmt = (s?: string) => (s ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…');
  return `${fmt(p.from)} to ${fmt(p.to)}`;
}

/** URL encoding: ?period=30d, or ?period=custom&from=2026-11-01&to=2026-11-20 */
export function parsePeriod(params: URLSearchParams, fallback: PeriodPreset = '30d'): Period {
  const raw = params.get('period') as PeriodPreset | null;
  if (raw === 'custom') return { preset: 'custom', from: params.get('from') ?? undefined, to: params.get('to') ?? undefined };
  if (raw && PERIOD_PRESETS.some((x) => x.id === raw)) return { preset: raw };
  return { preset: fallback };
}

export function periodToParams(p: Period, fallback: PeriodPreset = '30d'): Record<string, string | null> {
  if (p.preset === 'custom') return { period: 'custom', from: p.from ?? null, to: p.to ?? null };
  return { period: p.preset === fallback ? null : p.preset, from: null, to: null };
}

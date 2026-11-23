import type { DashboardPeriod, DashboardTrendGranularity } from '@/types/api';
import { parsePeriod, periodRange, previousRange, type Period } from '@/lib/period';

/**
 * The dashboard is a daily check: three short windows plus All time, which the old per-section
 * Daily / Weekly / Monthly / All toggles offered (All was their default).
 */
export const DASHBOARD_PERIODS = [
  { id: 'today', label: 'Today', previous: 'vs yesterday' },
  { id: '7d', label: 'Last 7 days', previous: 'vs previous 7 days' },
  { id: '30d', label: 'Last 30 days', previous: 'vs previous 30 days' },
  { id: 'all', label: 'All time', previous: '' },
] as const;

export type DashboardPeriodId = (typeof DASHBOARD_PERIODS)[number]['id'];
export const DASHBOARD_DEFAULT_PERIOD: DashboardPeriodId = 'today';

/** Reads ?period= and falls back to Today for anything the dashboard does not offer. */
export function parseDashboardPeriod(params: URLSearchParams): DashboardPeriodId {
  const p = parsePeriod(params, DASHBOARD_DEFAULT_PERIOD).preset;
  return DASHBOARD_PERIODS.some((x) => x.id === p) ? (p as DashboardPeriodId) : DASHBOARD_DEFAULT_PERIOD;
}

/** Everything the sections need to query one window: exact dates, the previous window and the API presets. */
export function dashboardWindow(id: DashboardPeriodId) {
  const period: Period = { preset: id };
  const range = periodRange(period);
  const previous = previousRange(period);
  // All time charts by month, as the old "All" toggle did.
  const granularity: DashboardTrendGranularity = id === 'today' ? 'day' : id === '7d' ? 'week' : id === '30d' ? 'month' : 'all';
  const categoryPeriod: DashboardPeriod = id === 'today' ? 'today' : id === '7d' ? 'week' : id === '30d' ? 'month' : 'all';
  const meta = DASHBOARD_PERIODS.find((p) => p.id === id)!;
  return { period, range, previous, granularity, categoryPeriod, label: meta.label, previousLabel: meta.previous };
}

export type DashboardWindow = ReturnType<typeof dashboardWindow>;

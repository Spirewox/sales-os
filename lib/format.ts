/**
 * Shared number and money formatting. Use these instead of local helpers so every page
 * reads the same way: ₦1.2M in summaries, ₦1,234,567 in tables and drawers, ₦2M on axes.
 */
export const NAIRA = '₦';

/** Exact amount for tables, drawers and receipts: ₦1,234,567. */
export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '-';
  const sign = n < 0 ? '-' : '';
  return `${sign}${NAIRA}${Math.round(Math.abs(n)).toLocaleString('en-NG')}`;
}

/** Short amount for KPIs and summaries: ₦850, ₦12k, ₦1.2M, ₦3.4B. */
export function formatMoneyShort(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '-';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${NAIRA}${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${NAIRA}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${NAIRA}${Math.round(abs / 1_000)}k`;
  return `${sign}${NAIRA}${Math.round(abs)}`;
}

/** Chart axis ticks: whole units only, never ₦2000k. */
export function formatAxisMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${NAIRA}${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${NAIRA}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${NAIRA}${Math.round(abs / 1_000)}k`;
  return `${sign}${NAIRA}${Math.round(abs)}`;
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '-';
  return Math.round(n).toLocaleString('en-NG');
}

export function formatPercent(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return '-';
  return `${n.toFixed(digits)}%`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

/** Business timezone: every date on screen is Lagos time, whatever the device says. */
export const APP_TIMEZONE = 'Africa/Lagos';

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { timeZone: APP_TIMEZONE, ...opts });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { timeZone: APP_TIMEZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Shared Recharts tooltip styling (themed through CSS variables). */
export const CHART_TOOLTIP = {
  contentStyle: { backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)', borderRadius: 'var(--radius)', fontSize: 12 },
  itemStyle: { color: 'var(--popover-foreground)' },
  labelStyle: { color: 'var(--muted-foreground)' },
  cursor: { stroke: 'var(--border)' },
} as const;

/**
 * Recharts text styles, the exact values the app's charts pass today (G-08).
 * fontSize 12 is --text-xs (12px); paddingTop 8 is spacing step 2 (8px).
 * - tick: XAxis/YAxis `tick` (fill + size)
 * - legend: Legend `wrapperStyle`
 * - legendBelow: Legend `wrapperStyle` under a chart, with the 8px gap
 * - label: size only, for a Pie `style` or a `tick` that keeps Recharts' default fill
 */
export const CHART_TEXT = {
  tick: { fill: 'var(--muted-foreground)', fontSize: 12 },
  legend: { fontSize: 12, color: 'var(--muted-foreground)' },
  legendBelow: { fontSize: 12, color: 'var(--muted-foreground)', paddingTop: 8 },
  label: { fontSize: 12 },
} as const;

function trim(v: number): string {
  return v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, '');
}

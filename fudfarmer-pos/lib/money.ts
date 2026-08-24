/** Money helpers — integers (kobo) internally, formatted only at the edge. */

export const toKobo = (naira: number) => Math.round(naira * 100);
export const toNaira = (kobo: number) => kobo / 100;

/** ₦12,500.00 */
export const fmt = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Compact: ₦1.2M / ₦12k / ₦950 — for dashboards, not receipts. */
export const fmtShort = (kobo: number) => {
  const n = kobo / 100;
  if (Math.abs(n) >= 1_000_000) return '₦' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return '₦' + (n / 1000).toFixed(0) + 'k';
  return '₦' + Math.round(n).toLocaleString();
};

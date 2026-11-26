'use client';

import { StatusBadge, type Tone } from '@/components/app';
import { formatMoney } from '@/lib/format';
import type { PosRow } from '@/lib/pos-rows';

export type PosSection = 'transactions' | 'tills' | 'shifts' | 'reviews';
export type PosTab = 'overview' | PosSection;

export type { PosRow } from '@/lib/pos-rows';
export { rowMethod, rowReference } from '@/lib/pos-rows';

/** POS amounts arrive in kobo. */
export const formatKobo = (value?: number | null) => (value == null ? '-' : formatMoney(value / 100));


const TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const posTime = (value?: string | null) => (value ? TIME.format(new Date(value)) : '-');

export const TRANSACTION_STATUSES = [
  { value: 'awaiting', label: 'Awaiting payment', tone: 'warning' },
  { value: 'completed', label: 'Completed', tone: 'good' },
  { value: 'cancelled', label: 'Cancelled', tone: 'neutral' },
  { value: 'review', label: 'Needs review', tone: 'danger' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];

export const SHIFT_STATUSES = [
  { value: 'open', label: 'Open', tone: 'warning' },
  { value: 'closed', label: 'Closed', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];

export const TRANSACTION_KINDS = [
  { value: 'sale', label: 'Sale' },
  { value: 'repayment', label: 'Repayment' },
  { value: 'refund', label: 'Refund' },
  { value: 'void', label: 'Void' },
] as const;

export function OperationStatus({ status, section }: Readonly<{ status?: string; section: 'transactions' | 'shifts' }>) {
  const list: readonly { value: string; label: string; tone: Tone }[] = section === 'shifts' ? SHIFT_STATUSES : TRANSACTION_STATUSES;
  const match = list.find((s) => s.value === status);
  if (!status) return <StatusBadge tone="danger">Needs review</StatusBadge>;
  return <StatusBadge tone={match?.tone ?? 'neutral'}>{match?.label ?? status}</StatusBadge>;
}

export function TillStatus({ row }: Readonly<{ row: Pick<PosRow, 'revoked' | 'registered'> }>) {
  if (row.revoked) return <StatusBadge tone="neutral">Revoked</StatusBadge>;
  if (row.registered) return <StatusBadge tone="good">Registered</StatusBadge>;
  return <StatusBadge tone="warning">Awaiting passkey</StatusBadge>;
}

/** Keep a selected value visible in its picker even before its option list loads. */
export const withSelected = (options: { value: string; label: string }[], value: string | null, label: string) =>
  value && !options.some((o) => o.value === value) ? [...options, { value, label }] : options;

export function LoadError({ show, what, retry }: Readonly<{ show: boolean; what: string; retry: () => void }>) {
  if (!show) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      Could not load {what}. <button type="button" className="font-medium underline" onClick={retry}>Try again</button>
    </p>
  );
}

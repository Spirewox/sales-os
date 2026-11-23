import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'good' | 'warning' | 'danger' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-primary/10 text-primary',
  // A light tint keeps amber text above 4.5:1 in light mode; the border carries the colour.
  warning: 'border border-warning/40 bg-warning/5 text-warning',
  danger: 'border border-destructive/30 bg-destructive/5 text-destructive',
  info: 'border bg-background text-foreground',
};

/**
 * One status vocabulary per domain. Colour carries state only:
 * danger = overdue, out, failed; warning = pending, low, partial; good = paid, in stock, resolved.
 */
export const STATUS_TONES = {
  payment: { Paid: 'good', Partial: 'warning', Credit: 'warning', Overdue: 'danger', Voided: 'neutral', Unpaid: 'warning' },
  stock: { 'In stock': 'good', Low: 'warning', Out: 'danger', Expiring: 'warning', Expired: 'danger' },
  work: { Open: 'warning', 'In progress': 'neutral', Resolved: 'good', Closed: 'neutral', Pending: 'warning', Approved: 'good', Rejected: 'danger', Fulfilled: 'good' },
} as const satisfies Record<string, Record<string, Tone>>;

export type StatusDomain = keyof typeof STATUS_TONES;

type Props =
  | { domain: StatusDomain; status: string; tone?: never; children?: never; className?: string }
  | { tone: Tone; children: React.ReactNode; domain?: never; status?: never; className?: string };

export function StatusBadge(props: Readonly<Props>) {
  const tone: Tone = props.tone ?? ((STATUS_TONES[props.domain!] as Record<string, Tone>)[props.status!] ?? 'neutral');
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap', TONE[tone], props.className)}>
      {props.children ?? props.status}
    </span>
  );
}

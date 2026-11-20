import type { ReactNode } from 'react';
import { StatusBadge, type Column } from '@/components/app';
import type { EngagementCustomer } from '@/hooks/use-queries';
import { formatDate, formatMoney, plural } from '@/lib/format';

export type ChurnActivity = 'All' | 'At Risk' | 'Dormant';

export const LOYALTY_OPTIONS = ['All', 'Prospect', 'First-Time Buyer', 'Repeat Buyer', 'Loyal', 'Bronze', 'Silver', 'Gold'] as const;

export const activityLabel = (a: ChurnActivity) => (a === 'At Risk' ? 'At risk' : a === 'Dormant' ? 'Dormant' : 'All activity');

export function RiskBadge({ activity }: Readonly<{ activity: EngagementCustomer['activity'] }>) {
  return <StatusBadge tone={activity === 'Dormant' ? 'danger' : 'warning'}>{activityLabel(activity)}</StatusBadge>;
}

const muted = (children: ReactNode) => <span className="block text-xs font-normal text-muted-foreground">{children}</span>;

export const churnColumns: Column<EngagementCustomer>[] = [
  {
    id: 'customer',
    header: 'Customer',
    mobile: 'title',
    sortValue: (r) => r.name.toLowerCase(),
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block">{r.name}</span>
        {r.company && r.company !== r.name && muted(r.company)}
        {muted([r.loyaltyGrade ? `${r.loyalty}, ${r.loyaltyGrade}` : r.loyalty, r.hub].filter(Boolean).join(' · '))}
      </span>
    ),
  },
  {
    id: 'risk',
    header: 'Risk',
    mobile: 'value',
    sortValue: (r) => (r.activity === 'Dormant' ? 2 : 1),
    cell: (r) => <span title={r.recommendedAction || undefined}><RiskBadge activity={r.activity} /></span>,
  },
  {
    id: 'lastPurchase',
    header: 'Last purchase',
    mobile: 'meta',
    sortValue: (r) => r.lastOrderDate,
    cell: (r) => <span className="whitespace-nowrap">{r.lastOrderDate ? formatDate(r.lastOrderDate) : '-'}</span>,
  },
  {
    id: 'daysSince',
    header: 'Days since',
    align: 'right',
    mobile: 'meta',
    sortValue: (r) => r.daysSinceLast,
    cell: (r) => (
      <span className="block whitespace-nowrap">
        <span className="md:hidden">Last bought </span>{r.daysSinceLast}d<span className="md:hidden"> ago</span>
        {r.daysLate > 0 && <span className="block text-xs font-medium text-warning max-md:inline max-md:ml-1">{r.daysLate}d late</span>}
      </span>
    ),
  },
  {
    id: 'gap',
    header: 'Usual gap',
    align: 'right',
    hideBelow: 'lg',
    sortValue: (r) => Math.round(r.avgInterval),
    cell: (r) => (Math.round(r.avgInterval) > 0 ? `${Math.round(r.avgInterval)}d` : <span className="text-xs text-muted-foreground">Single purchase</span>),
  },
  {
    id: 'ltv',
    header: 'Lifetime value',
    align: 'right',
    mobile: 'subtitle',
    sortValue: (r) => r.ltv,
    cell: (r) => (
      <span className="block whitespace-nowrap">
        <span className="font-medium text-foreground">{formatMoney(r.ltv)}</span>
        <span className="block text-xs text-muted-foreground max-md:inline max-md:ml-1">{plural(r.totalOrders, 'order')}</span>
      </span>
    ),
  },
];

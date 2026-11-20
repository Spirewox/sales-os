'use client';

import type { useRouter } from 'next/navigation';
import { MessageSquare, ShoppingCart } from 'lucide-react';
import type { Customer } from '@/types';
import type { CreditCustomerSummary } from '@/types/credits';
import { formatDate, formatMoney, formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { OverflowMenu, type Column } from '@/components/app';
import { customerTitle, hasPhone, logFeedbackHref, recordSaleHref } from './customer-links';

type Router = ReturnType<typeof useRouter>;

function Outstanding({ credit }: Readonly<{ credit?: CreditCustomerSummary }>) {
  if (!credit || credit.totalOutstanding <= 0) return <span className="text-muted-foreground max-md:hidden">-</span>;
  const overdue = credit.overdueCount > 0;
  return (
    <span className={cn('font-medium tabular-nums', overdue && 'text-destructive')}>
      <span className="md:hidden">Owes </span>
      {formatMoney(credit.totalOutstanding)}
      {overdue && <span className="sr-only"> (overdue)</span>}
    </span>
  );
}

/** Columns for the customer list. `credits` is keyed by customer id; omit when it isn't loaded. */
export function customerColumns(credits: Map<string, CreditCustomerSummary> | null): Column<Customer>[] {
  return [
    {
      id: 'customer',
      header: 'Customer',
      mobile: 'title',
      cell: (c) => {
        const { primary, secondary } = customerTitle(c);
        return (
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{primary}</span>
            {secondary && <span className="truncate text-xs font-normal text-muted-foreground">{secondary}</span>}
          </span>
        );
      },
    },
    { id: 'phone', header: 'Phone', mobile: 'subtitle', cell: (c) => (hasPhone(c.phone) ? <span className="whitespace-nowrap tabular-nums">{c.phone}</span> : <span className="text-muted-foreground">-</span>) },
    { id: 'hub', header: 'Hub', mobile: 'meta', hideBelow: 'lg', cell: (c) => c.location || '-' },
    {
      id: 'last',
      header: 'Last purchase',
      mobile: 'meta',
      hideBelow: 'xl',
      cell: (c) => (c.lastPurchaseDate ? <span className="whitespace-nowrap">{formatDate(c.lastPurchaseDate)}</span> : <span className="text-muted-foreground">-</span>),
    },
    { id: 'orders', header: 'Orders', align: 'right', sortable: true, mobile: 'meta', cell: (c) => <span className="md:font-normal">{formatCount(c.totalOrders)}<span className="md:hidden"> orders</span></span> },
    { id: 'revenue', header: 'Revenue', align: 'right', sortable: true, mobile: 'value', cell: (c) => <span className="font-medium">{formatMoney(c.totalSpent)}</span> },
    ...(credits
      ? [{ id: 'outstanding', header: 'Outstanding', align: 'right' as const, mobile: 'meta' as const, cell: (c: Customer) => <Outstanding credit={credits.get(c.id)} /> }]
      : []),
  ];
}

/** Row `⋯`: Record sale and Log feedback, each behind its permission. */
export function CustomerRowActions({ customer, router, canSell, canLog }: Readonly<{ customer: Customer; router: Router; canSell: boolean; canLog: boolean }>) {
  return (
    <OverflowMenu
      size="sm"
      label={`Actions for ${customer.name}`}
      items={[
        { label: 'Record sale', icon: <ShoppingCart />, onSelect: () => router.push(recordSaleHref(customer.id)), hidden: !canSell },
        { label: 'Log feedback', icon: <MessageSquare />, onSelect: () => router.push(logFeedbackHref(customer.id)), hidden: !canLog },
      ]}
    />
  );
}

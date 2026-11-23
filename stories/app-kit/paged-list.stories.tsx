import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { EmptyState, StatusBadge, usePagedList } from '@/components/app';
import { formatMoney } from '@/lib/format';

type Credit = { id: string; customer: string; amount: number; status: 'Paid' | 'Partial' | 'Overdue' | 'Unpaid'; due: string };

const NAMES = ['Mama Put Kitchen', 'Chief Adebayo Stores', 'Halima Foods', 'Grace Catering', 'Bukka Hut Lekki', 'Iya Basira Canteen', 'Emeka Cold Room'];
const STATUS: Credit['status'][] = ['Unpaid', 'Partial', 'Overdue', 'Paid'];

function makeCredits(n: number): Credit[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `cr${i + 1}`,
    customer: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ''}`,
    amount: 15_000 + ((i * 4813) % 30) * 5_000,
    status: STATUS[i % STATUS.length],
    due: new Date(Date.UTC(2026, 10, 1 + (i % 28))).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));
}

/**
 * usePagedList demo: a card list (not a DataTable) using the hook's pageItems and pager.
 * The filter shows resetKey sending the list back to page 1.
 */
function CreditList({ count, defaultSize = 10, storageKey }: Readonly<{ count: number; defaultSize?: number; storageKey: string }>) {
  const [items] = useState(() => makeCredits(count));
  const [status, setStatus] = useState<'all' | Credit['status']>('all');
  const filtered = status === 'all' ? items : items.filter((c) => c.status === status);
  const { pageItems, pager } = usePagedList(filtered, storageKey, defaultSize, status);
  return (
    <div className="max-w-xl space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...STATUS] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className="h-8 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground">
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {pageItems.length === 0 ? (
          <EmptyState size="compact" title="No credits to show" description="Credits appear here when a sale is not paid in full." />
        ) : (
          <ul className="divide-y">
            {pageItems.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.customer}</p>
                  <p className="text-xs text-muted-foreground">Due {c.due}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">{formatMoney(c.amount)}</span>
                  <StatusBadge domain="payment" status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {pager}
      </div>
    </div>
  );
}

const meta: Meta<typeof CreditList> = {
  title: 'App kit/usePagedList',
  component: CreditList,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Client paging for lists that are not a DataTable (drawer lists, card lists). Returns the current page of items and the same footer the table uses. The page size choice is remembered per key; resetKey goes back to page 1.' } },
  },
};
export default meta;
type Story = StoryObj<typeof CreditList>;

export const Default: Story = { args: { count: 64, storageKey: 'story-credits' } };

/** Fewer items than the smallest page size: no footer. */
export const SinglePage: Story = { args: { count: 6, storageKey: 'story-credits-few' } };

export const Empty: Story = { args: { count: 0, storageKey: 'story-credits-empty' } };

export const ManyItems: Story = { args: { count: 480, defaultSize: 25, storageKey: 'story-credits-many' } };

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { count: 64, storageKey: 'story-credits-phone' },
};

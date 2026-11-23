import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { KpiStrip, type KpiCell } from '@/components/app';
import { formatCount, formatMoneyShort } from '@/lib/format';

const SALES_CELLS: KpiCell[] = [
  { label: 'Revenue', value: formatMoneyShort(18_450_000), change: { pct: 12.4, label: 'vs previous period' } },
  { label: 'Sales', value: formatCount(1284), detail: 'Last 30 days' },
  { label: 'Credit sales', value: formatMoneyShort(2_340_000), detail: '37 sales on credit', href: '/credits', tone: 'warning' },
  { label: 'Average order', value: formatMoneyShort(14_370), detail: 'Last 30 days' },
];

function FilteringStrip() {
  const [deliveriesOnly, setDeliveriesOnly] = useState(false);
  return (
    <KpiStrip
      label="Profit and volume"
      cells={[
        { label: 'Profit', value: formatMoneyShort(3_120_000), change: { pct: -4.2, label: 'vs previous period' } },
        { label: 'Deliveries', value: formatCount(412), detail: deliveriesOnly ? 'Showing deliveries only' : 'Show delivery sales', onClick: () => setDeliveriesOnly((d) => !d), active: deliveriesOnly },
        { label: 'Units sold', value: '8,420 kg', detail: '1,200 crates. Last 30 days' },
      ]}
    />
  );
}

const meta: Meta<typeof KpiStrip> = {
  title: 'App kit/KpiStrip',
  component: KpiStrip,
  tags: ['autodocs'],
  args: { cells: SALES_CELLS },
};
export default meta;
type Story = StoryObj<typeof KpiStrip>;

export const Default: Story = {};

/** Skeletons while loading, never a zero. */
export const Loading: Story = { args: { loading: true } };

/** Three cells; one filters the page (click to toggle). */
export const Filtering: Story = { render: () => <FilteringStrip /> };

export const Tones: Story = {
  args: {
    cells: [
      { label: 'Collected', value: formatMoneyShort(4_800_000), tone: 'good', detail: 'This month' },
      { label: 'Outstanding', value: formatMoneyShort(1_250_000), tone: 'warning', detail: '22 customers' },
      { label: 'Overdue', value: formatMoneyShort(640_000), tone: 'danger', detail: '9 customers past 30 days' },
      { label: 'Average markup', value: '18%', detail: 'Across 64 products' },
    ],
  },
};

/** goodWhen down: a fall in churned customers reads green. Neutral changes stay uncoloured. */
export const ChangeDirections: Story = {
  args: {
    cells: [
      { label: 'Churned customers', value: formatCount(31), change: { pct: -18, goodWhen: 'down' } },
      { label: 'Returns', value: formatCount(14), change: { pct: 6.5, goodWhen: 'down' } },
      { label: 'Stock on hand', value: formatMoneyShort(9_200_000), change: { pct: 2.1, goodWhen: 'neutral' } },
      { label: 'New customers', value: formatCount(57), change: { pct: 0 } },
    ],
  },
};

export const TwoCells: Story = { args: { cells: SALES_CELLS.slice(0, 2) } };

export const OneCell: Story = { args: { cells: SALES_CELLS.slice(0, 1) } };

/** Hidden cells (admin only figures) drop out and the grid reflows. */
export const HiddenCell: Story = {
  args: { cells: SALES_CELLS.map((c, i) => (i === 3 ? { ...c, hidden: true } : c)) },
};

export const LongText: Story = {
  args: {
    cells: [
      { label: 'Revenue from frozen poultry and processed meat', value: formatMoneyShort(128_450_000_000), change: { pct: 142, label: 'vs the same period last year' } },
      { label: 'Sales', value: formatCount(1_284_390), detail: 'Ikeja, Lekki, Abuja Central and 14 RSPs over the last 30 days' },
      { label: 'Credit sales', value: formatMoneyShort(2_340_000), detail: '37 sales on credit to 29 customers', href: '/credits', tone: 'warning' },
      { label: 'Average order', value: formatMoneyShort(14_370) },
    ],
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
};

export const PhoneThreeCells: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <FilteringStrip />,
};

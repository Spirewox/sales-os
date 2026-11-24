import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { Segmented } from '@/components/app';

type View = 'table' | 'cards' | 'chart';
const VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'cards', label: 'Cards' },
  { id: 'chart', label: 'Chart' },
] as const;

function Demo({ options = VIEWS as readonly { id: string; label: string }[], start = 'table' }: Readonly<{ options?: readonly { id: string; label: string }[]; start?: string }>) {
  const [value, setValue] = useState(start);
  return (
    <div className="space-y-3">
      <Segmented label="View" value={value} onChange={setValue} options={options} />
      <p className="text-xs text-muted-foreground">Selected: {value}</p>
    </div>
  );
}

const meta: Meta<typeof Segmented> = {
  title: 'App kit/Segmented',
  component: Segmented,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Segmented>;

export const Default: Story = { render: () => <Demo /> };

export const TwoOptions: Story = {
  render: () => <Demo options={[{ id: 'revenue', label: 'Revenue' }, { id: 'units', label: 'Units' }]} start="revenue" />,
};

export const FiveOptions: Story = {
  render: () => (
    <Demo
      start="30d"
      options={[
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7 days' },
        { id: '30d', label: '30 days' },
        { id: 'month', label: 'This month' },
        { id: 'all', label: 'All time' },
      ]}
    />
  ),
};

/** With one option there is nothing to choose, so it renders nothing. */
export const SingleOptionHidden: Story = {
  render: () => (
    <div className="space-y-2">
      <Segmented<View> label="View" value="table" onChange={fn()} options={[{ id: 'table', label: 'Table' }]} />
      <p className="text-xs text-muted-foreground">Nothing renders above this line.</p>
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="max-w-xs">
      <Demo start="outstanding" options={[{ id: 'outstanding', label: 'Outstanding credits' }, { id: 'collected', label: 'Collected this month' }]} />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Demo />,
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { userEvent, within } from 'storybook/test';
import { PeriodSelect } from '@/components/app';
import { lagosDay, periodLabel, type Period, type PeriodPreset } from '@/lib/period';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return lagosDay(d);
}

function Demo({ start = { preset: '30d' }, allowAll, presets, allowCustom }: Readonly<{ start?: Period; allowAll?: boolean; presets?: PeriodPreset[]; allowCustom?: boolean }>) {
  const [value, setValue] = useState<Period>(start);
  return (
    <div className="min-h-[460px] space-y-3">
      <PeriodSelect value={value} onChange={setValue} allowAll={allowAll} presets={presets} allowCustom={allowCustom} />
      <p className="text-xs text-muted-foreground">Value: {periodLabel(value)}</p>
    </div>
  );
}

const meta: Meta<typeof PeriodSelect> = {
  title: 'App kit/PeriodSelect',
  component: PeriodSelect,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Quick presets on the left, a range calendar on the right. Click a start day then an end day; Apply sets a custom range. Future days are disabled.' } },
  },
};
export default meta;
type Story = StoryObj<typeof PeriodSelect>;

/** Popover state lives inside PeriodSelect, so open stories click the trigger in play. */
const openPopover: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: /^Period:/ }));
};

export const Default: Story = { render: () => <Demo /> };

export const Open: Story = { play: openPopover, render: () => <Demo /> };

export const CustomRange: Story = {
  play: openPopover,
  render: () => <Demo start={{ preset: 'custom', from: daysAgo(20), to: daysAgo(6) }} />,
};

/** No All time option, for pages that need a bounded period. */
export const WithoutAllTime: Story = { play: openPopover, render: () => <Demo allowAll={false} /> };

/** Presets only, no calendar. */
export const PresetsOnly: Story = {
  play: openPopover,
  render: () => <Demo start={{ preset: '7d' }} presets={['today', '7d', '30d']} allowCustom={false} />,
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: openPopover,
  render: () => <Demo />,
};

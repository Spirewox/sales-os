import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Calendar, formatDay, type DayString } from '@/components/app';
import { lagosDay } from '@/lib/period';

const today = lagosDay();
function shift(n: number): DayString {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function Single({ start = null, min, max }: Readonly<{ start?: DayString | null; min?: DayString; max?: DayString }>) {
  const [value, setValue] = useState<DayString | null>(start);
  return (
    <div className="space-y-3">
      <div className="inline-block rounded-xl border bg-popover p-3"><Calendar value={value} onChange={setValue} min={min} max={max} /></div>
      <p className="text-xs text-muted-foreground">Selected: {value ? formatDay(value) : 'none'}</p>
    </div>
  );
}

function Range({ from = null, to = null, max }: Readonly<{ from?: DayString | null; to?: DayString | null; max?: DayString }>) {
  const [value, setValue] = useState<{ from: DayString | null; to: DayString | null }>({ from, to });
  return (
    <div className="space-y-3">
      <div className="inline-block rounded-xl border bg-popover p-3"><Calendar mode="range" value={value} onChange={setValue} max={max} /></div>
      <p className="text-xs text-muted-foreground">
        {value.from && value.to ? `${formatDay(value.from)} to ${formatDay(value.to)}` : value.from ? `${formatDay(value.from)}, now pick an end date` : 'Pick a start date'}
      </p>
    </div>
  );
}

const meta: Meta<typeof Calendar> = {
  title: 'App kit/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Month calendar: green for the chosen day, a soft green band for a range, an outlined green today (Lagos). Arrows move a day or week, PageUp and PageDown a month, Home and End the week.' } },
  },
};
export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = { render: () => <Single /> };

export const Selected: Story = { render: () => <Single start={shift(-3)} /> };

/** Future days disabled, as in PeriodSelect. */
export const MaxToday: Story = { render: () => <Single start={today} max={today} /> };

/** Only the next two weeks can be picked, as for a delivery date. */
export const MinAndMax: Story = { render: () => <Single min={today} max={shift(14)} /> };

export const RangeEmpty: Story = { render: () => <Range max={today} /> };

/** First click made: hover previews the band. */
export const RangeStarted: Story = { render: () => <Range from={shift(-10)} max={today} /> };

export const RangeComplete: Story = { render: () => <Range from={shift(-12)} to={shift(-2)} max={today} /> };

/** A specific month shown first when nothing is selected. */
export const DefaultMonth: Story = {
  render: () => <div className="inline-block rounded-xl border bg-popover p-3"><Calendar value={null} onChange={() => {}} defaultMonth="2026-02-01" /></div>,
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Range from={shift(-12)} to={shift(-2)} max={today} />,
};

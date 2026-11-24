import { useId, useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { userEvent, within } from 'storybook/test';
import { DateField, DateTimeField, FormField } from '@/components/app';
import { lagosDay } from '@/lib/period';

const today = lagosDay();
function shift(n: number) {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

type FieldProps = Partial<ComponentProps<typeof DateField>> & { label?: string; hint?: string; error?: string};

function Field({ value: start = '', label = 'Delivery date', hint, error, ...rest }: Readonly<FieldProps>) {
  const [value, setValue] = useState(start);
  const id = useId();
  return (
    <div className="min-h-[420px] max-w-xs">
      <FormField label={label} htmlFor={id} hint={hint} error={error}>
        <DateField id={id} value={value} onChange={setValue} invalid={!!error} {...rest} />
      </FormField>
    </div>
  );
}

function DateTime({ start = '' }: Readonly<{ start?: string }>) {
  const [value, setValue] = useState(start);
  const id = useId();
  return (
    <div className="min-h-[420px] max-w-sm space-y-2">
      <FormField label="Due" htmlFor={id} hint="Agents get a reminder an hour before.">
        <DateTimeField id={id} value={value} onChange={setValue} min={today} />
      </FormField>
      <p className="text-xs text-muted-foreground">Value: {value || 'none'}</p>
    </div>
  );
}

const meta: Meta<typeof DateField> = {
  title: 'App kit/DateField',
  component: DateField,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Form date input that opens the app calendar instead of the browser picker. DateTimeField adds a quarter hour time select and keeps the YYYY-MM-DDTHH:mm value shape.' } },
  },
};
export default meta;
type Story = StoryObj<typeof DateField>;

/** Popover state lives inside DateField, so open stories click the trigger in play. */
const openPopover: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getAllByRole('button')[0]);
};

export const Default: Story = { render: () => <Field /> };

export const WithValue: Story = { render: () => <Field value={shift(2)} /> };

export const Open: Story = { play: openPopover, render: () => <Field value={shift(2)} /> };

export const Clearable: Story = { render: () => <Field value={shift(2)} clearable label="Expiry date" hint="Leave empty for products that don't expire." /> };

/** Today falls outside min and max, so the Today button is off. */
export const MinMax: Story = { play: openPopover, render: () => <Field min={shift(3)} max={shift(17)} label="Collection date" /> };

export const Invalid: Story = { render: () => <Field error="Choose a delivery date" /> };

export const Disabled: Story = { render: () => <Field value={shift(-1)} disabled hint="Locked after dispatch." /> };

export const CustomPlaceholder: Story = { render: () => <Field placeholder="Any day" label="Last order before" /> };

export const DateTimeEmpty: Story = { name: 'DateTimeField', render: () => <DateTime /> };

export const DateTimeWithValue: Story = { name: 'DateTimeField with value', render: () => <DateTime start={`${shift(1)}T09:30`} /> };

/** A time between quarter hours is kept as its own option. */
export const DateTimeOffSlot: Story = { name: 'DateTimeField off slot time', render: () => <DateTime start={`${shift(1)}T14:07`} /> };

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: openPopover, render: () => <Field value={shift(2)} clearable />,
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/** Labelled row: the label is joined to the box with htmlFor, so clicking the text toggles it. */
function CheckboxRow({ id, label, hint, initial = false, disabled }: Readonly<{ id: string; label: string; hint?: string; initial?: boolean; disabled?: boolean }>) {
  const [checked, setChecked] = useState(initial);
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <Checkbox id={id} checked={checked} onCheckedChange={setChecked} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: { onCheckedChange: fn(), 'aria-label': 'Only show overdue jobs' },
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox on base-ui (role="checkbox", aria-checked, a hidden native input for forms). It has no visible label of its own: pair it with a Label through id and htmlFor, or pass aria-label. Space toggles. Focus-visible draws a 3px ring like Input.',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Indeterminate: Story = { args: { indeterminate: true, 'aria-label': 'Select all on this page' } };
export const DisabledUnchecked: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { defaultChecked: true, disabled: true } };

export const Invalid: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox id="sb-count" aria-invalid aria-describedby="sb-count-error" />
        <Label htmlFor="sb-count">Confirm the stock count</Label>
      </div>
      <p id="sb-count-error" className="text-xs text-destructive">Confirm the count before you save.</p>
    </div>
  ),
};

export const LabelledRow: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <CheckboxRow id="sb-overdue" label="Only show overdue jobs" hint="Hide jobs that are still within their due date." />
      <CheckboxRow id="sb-costs" label="Include running costs" hint="Add gas, power and packaging to the cost of this job." initial />
      <CheckboxRow id="sb-stock" label="Take ingredients from Fudfarmer stock" disabled />
    </div>
  ),
};

export const FocusVisible: Story = {
  render: () => (
    <div className="max-w-md">
      <CheckboxRow id="sb-focus" label="Only show overdue jobs" hint="Tab to the box to see the focus ring." />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => (
    <div className="space-y-2">
      <CheckboxRow id="sb-phone-overdue" label="Only show overdue jobs" hint="Hide jobs that are still within their due date." />
      <CheckboxRow id="sb-phone-alert" label="Don't alert the person who made the change" initial />
    </div>
  ),
};

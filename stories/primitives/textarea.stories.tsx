import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/** Labelled field: the label is joined to the textarea with htmlFor. */
function TextareaField({ id, label, hint, initial = '', placeholder, disabled }: Readonly<{ id: string; label: string; hint?: string; initial?: string; placeholder?: string; disabled?: boolean }>) {
  const [value, setValue] = useState(initial);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={2000} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: { 'aria-label': 'Notes for the kitchen', placeholder: 'Allergies, packaging, timing' },
  parameters: {
    docs: {
      description: {
        component:
          'Native textarea with the Input field styles. It grows with its content (field-sizing-content) from a 64px minimum. It has no visible label of its own: pair it with a Label through id and htmlFor, or pass aria-label.',
      },
    },
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: 'No groundnut oil. Pack the moi moi in two trays of 12.' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Soak the beans overnight, then boil for 40 minutes.' } };

export const Invalid: Story = {
  render: () => (
    <div className="grid max-w-md gap-1.5">
      <Label htmlFor="sb-reason">Reason for cancelling</Label>
      <Textarea id="sb-reason" aria-invalid aria-describedby="sb-reason-error" required />
      <p id="sb-reason-error" className="text-xs text-destructive">Add a reason so the team knows why.</p>
    </div>
  ),
};

export const LabelledField: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <TextareaField id="sb-notes" label="Notes for the kitchen" placeholder="Allergies, packaging, timing" hint="The kitchen sees this on the job card." />
      <TextareaField id="sb-supplier" label="Supplier notes" initial="Delivers on Tuesdays and Fridays. Call before 10am to change an order." />
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="max-w-xs">
      <TextareaField
        id="sb-long"
        label="Method or notes"
        initial={'Soak the beans overnight.\nPeel and blend with peppers and onions.\nAdd oil and stock, then steam in leaves for 45 minutes.\nLet them rest for 10 minutes before packing.'}
      />
    </div>
  ),
};

export const FocusVisible: Story = {
  render: () => (
    <div className="max-w-md">
      <TextareaField id="sb-focus" label="Notes for the kitchen" hint="Tab into the field to see the focus ring." />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => (
    <div className="space-y-4">
      <TextareaField id="sb-phone-notes" label="Notes for the kitchen" placeholder="Allergies, packaging, timing" />
      <TextareaField id="sb-phone-reason" label="Reason for cancelling" />
    </div>
  ),
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { Switch } from '@/components/ui/switch';

/** Labelled row, the pattern used in components/alert-settings.tsx. */
function SwitchRow({ id, label, hint, initial = false, disabled }: Readonly<{ id: string; label: string; hint: string; initial?: boolean; disabled?: boolean }>) {
  const [checked, setChecked] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium">{label}</p>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} disabled={disabled} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} />
    </div>
  );
}

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: { checked: false, onCheckedChange: fn(), 'aria-label': 'Email alerts' },
  parameters: {
    docs: {
      description: {
        component:
          'Controlled on/off switch (role="switch", aria-checked). It has no visible label of its own: always pass aria-labelledby pointing at the row label, or aria-label. Space or Enter toggles. Focus-visible draws a 2px ring with offset.',
      },
    },
  },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const DisabledOff: Story = { args: { disabled: true } };
export const DisabledOn: Story = { args: { checked: true, disabled: true } };

export const Interactive: Story = {
  render: () => (
    <div className="max-w-md">
      <SwitchRow id="sb-email" label="Email" hint="Send alerts to the email address on your profile." />
    </div>
  ),
};

export const InSettings: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <SwitchRow id="sb-push" label="Phone and laptop pop-ups" hint="Show alerts as notifications on the devices you have turned on below." initial />
      <SwitchRow id="sb-device" label="This device" hint="Checking this device…" disabled />
      <SwitchRow id="sb-urgent" label="Only urgent alerts by email" hint="Turn off to get every alert by email, not just overdue and escalated jobs." initial />
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="max-w-xs">
      <SwitchRow id="sb-long" label="Accept bank transfers and card payments at the till for walk-in customers" hint="Staff will see these options when recording a sale at any branch." />
    </div>
  ),
};

export const FocusVisible: Story = {
  render: () => (
    <div className="space-y-2">
      <SwitchRow id="sb-focus" label="Email" hint="Tab to the switch to see the focus ring." />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => (
    <div className="space-y-2">
      <SwitchRow id="sb-phone-push" label="Phone and laptop pop-ups" hint="Show alerts as notifications on the devices you have turned on below." initial />
      <SwitchRow id="sb-phone-email" label="Email" hint="Send alerts to the email address on your profile." />
    </div>
  ),
};

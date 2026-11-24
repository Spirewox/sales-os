import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { ConfirmDialog } from '@/components/app';

type Props = ComponentProps<typeof ConfirmDialog>;

/** Trigger plus dialog; the dialog closes on Cancel or Confirm. */
function WithTrigger({ startOpen = false, ...props }: Readonly<Partial<Props> & { startOpen?: boolean }>) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
        {props.confirmLabel ?? 'Void sale'}
      </button>
      {open && (
        <ConfirmDialog
          title="Void this sale?"
          message="Sale #A3F92 to Mama Put Kitchen for ₦45,000 will be voided and its stock returned to Ikeja hub. This can't be undone."
          confirmLabel="Void sale"
          {...props}
          onCancel={() => { props.onCancel?.(); setOpen(false); }}
          onConfirm={() => { props.onConfirm?.(); setOpen(false); }}
        />
      )}
    </>
  );
}

const meta: Meta<typeof ConfirmDialog> = {
  title: 'App kit/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  args: { onCancel: fn(), onConfirm: fn() },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="min-h-[480px] p-4"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  render: (args) => <WithTrigger onCancel={args.onCancel} onConfirm={args.onConfirm} />,
};

export const Open: Story = {
  render: (args) => <WithTrigger startOpen onCancel={args.onCancel} onConfirm={args.onConfirm} />,
};

export const Busy: Story = {
  render: (args) => <WithTrigger startOpen busy onCancel={args.onCancel} onConfirm={args.onConfirm} />,
};

/** Default tone: a non destructive confirmation, no warning icon, green button. */
export const DefaultTone: Story = {
  render: (args) => (
    <WithTrigger
      startOpen
      tone="default"
      title="Mark all 12 tasks done?"
      message="They move to Done for every agent at Lekki hub."
      confirmLabel="Mark done"
      onCancel={args.onCancel}
      onConfirm={args.onConfirm}
    />
  ),
};

export const LongText: Story = {
  render: (args) => (
    <WithTrigger
      startOpen
      title="Deactivate Chukwuemeka Okonkwo-Adeyemi and reassign 148 customers?"
      message={
        <>
          <p>Their open credits (₦1,284,500 across 23 customers) stay on the books and move to the hub manager at Abuja Central.</p>
          <p className="mt-2">They lose access at once. You can reactivate them later from Settings.</p>
        </>
      }
      confirmLabel="Deactivate and reassign"
      onCancel={args.onCancel}
      onConfirm={args.onConfirm}
    />
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: (args) => <WithTrigger startOpen onCancel={args.onCancel} onConfirm={args.onConfirm} />,
};

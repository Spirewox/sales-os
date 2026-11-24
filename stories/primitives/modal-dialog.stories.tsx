import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { ModalDialog } from '@/components/ui/modal-dialog';

const btn = 'inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted';
const primary = 'inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90';

function ConfirmPanel({ titleId, title, body, onClose }: Readonly<{ titleId: string; title: string; body: string; onClose: () => void }>) {
  return (
    <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
      <h2 id={titleId} className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btn}>Cancel</button>
        <button type="button" onClick={onClose} className={primary}>Confirm</button>
      </div>
    </div>
  );
}

function SidePanel({ titleId, onClose }: Readonly<{ titleId: string; onClose: () => void }>) {
  return (
    <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-card shadow-lg">
      <header className="flex items-center justify-between border-b p-4">
        <h2 id={titleId} className="text-base font-semibold">Customer details</h2>
        <button type="button" onClick={onClose} className={btn}>Close</button>
      </header>
      <dl className="space-y-3 p-4 text-sm">
        <div><dt className="text-xs text-muted-foreground">Name</dt><dd className="font-medium">Mama Nkechi Provisions</dd></div>
        <div><dt className="text-xs text-muted-foreground">Contact</dt><dd>WhatsApp +234 803 555 0142</dd></div>
        <div><dt className="text-xs text-muted-foreground">Outstanding credit</dt><dd className="tabular-nums">NGN 48,500</dd></div>
      </dl>
    </aside>
  );
}

/** Trigger plus useState, the way every call site opens it. */
function Demo({ align = 'center', dismissible = true, startOpen = false, title = 'Delete this sale?', body = 'The sale and its payment record will be removed from reports.' }: Readonly<{ align?: 'center' | 'end'; dismissible?: boolean; startOpen?: boolean; title?: string; body?: string }>) {
  const [open, setOpen] = useState(startOpen);
  const titleId = useId();
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={btn} onClick={() => setOpen(true)}>{align === 'end' ? 'Open customer' : 'Delete sale'}</button>
      {open && (
        <ModalDialog onClose={close} align={align} labelledBy={titleId} dismissible={dismissible}>
          {align === 'end' ? <SidePanel titleId={titleId} onClose={close} /> : <ConfirmPanel titleId={titleId} title={title} body={body} onClose={close} />}
        </ModalDialog>
      )}
    </>
  );
}

const meta = {
  title: 'Primitives/ModalDialog',
  component: ModalDialog,
  tags: ['autodocs'],
  args: { onClose: fn(), children: null, label: 'Record new sale' },
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '420px' },
      description: {
        component:
          'Shared modal shell for popup forms and detail panels: native <dialog open> with aria-modal, Escape and backdrop click to close, focus moved in on open and returned to the trigger on close. Name it with labelledBy (visible heading id) or label. align="end" docks a side sheet. dismissible={false} for typed forms, so Escape and backdrop clicks do nothing. The panel child needs relative z-10 to sit above the backdrop button.',
      },
    },
  },
  decorators: [(Story) => <div className="min-h-[420px] p-6"><Story /></div>],
} satisfies Meta<typeof ModalDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { render: () => <Demo /> };

export const Open: Story = { render: () => <Demo startOpen /> };

export const SideSheet: Story = { render: () => <Demo align="end" startOpen /> };

export const NotDismissible: Story = {
  render: () => <Demo startOpen dismissible={false} title="Discard this sale?" body="Escape and backdrop clicks are ignored here. Use Cancel or Confirm." />,
};

export const LongText: Story = {
  render: () => (
    <Demo
      startOpen
      title="Remove Chiamaka Eze-Williams from the Lekki branch and reassign her open orders?"
      body="Her 14 open orders, 3 pending credit approvals and the stock count she started this morning will move to the branch supervisor. She keeps read access to past sales until the end of the month."
    />
  ),
};

export const FocusVisible: Story = {
  render: () => <Demo startOpen title="Focus moves into the dialog" body="The first focusable control receives focus on open. Tab cycles through Cancel and Confirm; closing returns focus to the trigger." />,
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Demo startOpen />,
};

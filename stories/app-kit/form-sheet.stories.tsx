import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { DateField, FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { formatMoney } from '@/lib/format';

const CUSTOMERS = [
  { value: '', label: 'Choose a customer' },
  { value: 'c1', label: 'Mama Put Kitchen' },
  { value: 'c2', label: 'Chief Adebayo Stores' },
  { value: 'c3', label: 'Halima Foods' },
];
const PAYMENT = [
  { value: 'Paid', label: 'Paid in full' },
  { value: 'Partial', label: 'Part payment' },
  { value: 'Credit', label: 'On credit' },
];

type DemoProps = {
  startOpen?: boolean;
  submitting?: boolean;
  width?: 'md' | 'lg';
  withSecondary?: boolean;
  withDestructive?: boolean;
  withErrors?: boolean;
  prefilled?: boolean;
  onSubmit?: () => void;
  onClose?: () => void;
};

/** Record sale form: Save stays off with a reason until a customer is chosen. */
function RecordSale({ startOpen = true, submitting, width, withSecondary, withDestructive, withErrors, prefilled, onSubmit, onClose }: Readonly<DemoProps>) {
  const [open, setOpen] = useState(startOpen);
  const [customer, setCustomer] = useState(prefilled ? 'c1' : '');
  const [qty, setQty] = useState(prefilled ? '10' : '');
  const [price, setPrice] = useState(prefilled ? '4500' : '');
  const [paid, setPaid] = useState(prefilled ? '40000' : '');
  const [payment, setPayment] = useState('Partial');
  const [delivery, setDelivery] = useState('');
  const [note, setNote] = useState('');
  const total = Number(qty || 0) * Number(price || 0);
  const balance = Math.max(0, total - Number(paid || 0));
  const reason = !customer ? 'Choose a customer' : !qty || !price ? 'Add a quantity and price' : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Record sale
      </button>
      {open && (
        <FormSheet
          title={prefilled ? 'Edit sale' : 'Record sale'}
          description="Ikeja hub, sold by Adaeze Okafor"
          onClose={() => { onClose?.(); setOpen(false); }}
          onSubmit={() => { onSubmit?.(); setOpen(false); }}
          submitLabel={prefilled ? 'Save changes' : 'Record sale'}
          disabledReason={reason}
          submitting={submitting}
          width={width}
          preview={total > 0 ? <>Total {formatMoney(total)} · Balance {formatMoney(balance)}</> : undefined}
          secondaryActions={withSecondary ? <button type="button" onClick={fn()} className="h-9 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">Save draft</button> : undefined}
          destructiveAction={withDestructive ? <button type="button" onClick={fn()} className="h-9 rounded-md px-3 text-sm font-medium text-destructive hover:bg-destructive/10">Void sale</button> : undefined}
        >
          <FormSection title="Customer">
            <FormField label="Customer" htmlFor="fs-customer" required error={withErrors && !customer ? 'Choose a customer' : null}>
              <FilterSelect id="fs-customer" ariaLabel="Customer" value={customer} onChange={setCustomer} options={CUSTOMERS} />
            </FormField>
          </FormSection>
          <FormSection title="Items" description="Prices default to the hub price list.">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity" htmlFor="fs-qty" required error={withErrors && !qty ? 'Enter a quantity' : null}>
                <input id="fs-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" aria-invalid={withErrors && !qty} className={fieldClass} />
              </FormField>
              <FormField label="Unit price (₦)" htmlFor="fs-price" required hint="Markup 18% over cost">
                <input id="fs-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={fieldClass} />
              </FormField>
            </div>
          </FormSection>
          <FormSection title="Payment">
            <FormField label="Payment" htmlFor="fs-payment">
              <FilterSelect id="fs-payment" ariaLabel="Payment" value={payment} onChange={setPayment} options={PAYMENT} />
            </FormField>
            <FormField label="Amount paid (₦)" htmlFor="fs-paid" hint="The balance goes to credits.">
              <input id="fs-paid" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={fieldClass} />
            </FormField>
          </FormSection>
          <FormSection title="Delivery" description="Only for sales delivered to the customer." optional>
            <FormField label="Delivery date" htmlFor="fs-delivery">
              <DateField id="fs-delivery" value={delivery} onChange={setDelivery} clearable />
            </FormField>
            <FormField label="Note for the rider" htmlFor="fs-note">
              <textarea id="fs-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${fieldClass} h-auto py-2`} />
            </FormField>
          </FormSection>
          <FormSection title="Internal note" optional defaultOpen>
            <FormField label="Note" htmlFor="fs-internal" hint="Only staff see this.">
              <input id="fs-internal" className={fieldClass} placeholder="Optional" disabled={submitting} />
            </FormField>
          </FormSection>
        </FormSheet>
      )}
    </>
  );
}

const meta: Meta<typeof FormSheet> = {
  title: 'App kit/FormSheet',
  component: FormSheet,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: 720 }, description: { component: 'Full height side sheet for create and edit. Escape and backdrop clicks do not close it. FormSection groups fields (optional ones start collapsed), FormField wires label, control and hint or error, fieldClass styles plain inputs.' } },
  },
  decorators: [(Story) => <div className="min-h-[720px] p-4"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof FormSheet>;

/** Closed: the trigger opens it. */
export const Default: Story = { render: () => <RecordSale startOpen={false} onSubmit={fn()} onClose={fn()} /> };

/** Open and empty: Save is off and says why. */
export const Open: Story = { render: () => <RecordSale onSubmit={fn()} onClose={fn()} /> };

/** Filled in, with the derived total and balance above the footer. */
export const Filled: Story = { render: () => <RecordSale prefilled onSubmit={fn()} /> };

export const Submitting: Story = { render: () => <RecordSale prefilled submitting /> };

export const WithErrors: Story = { render: () => <RecordSale withErrors /> };

/** Save draft before Cancel, one destructive action at the far left. */
export const AllFooterSlots: Story = { render: () => <RecordSale prefilled withSecondary withDestructive /> };

export const Wide: Story = { render: () => <RecordSale prefilled width="lg" /> };

/** FormSection and FormField outside a sheet. */
export const Fields: Story = {
  render: () => (
    <div className="max-w-md space-y-6 rounded-xl border bg-card p-5">
      <FormSection title="Business" description="As it appears on receipts.">
        <FormField label="Business name" htmlFor="f-name" required hint="Shown on receipts and statements.">
          <input id="f-name" className={fieldClass} defaultValue="Mama Put Kitchen" />
        </FormField>
        <FormField label="WhatsApp number" htmlFor="f-wa" error="Enter a Nigerian number, like 0803 155 5100">
          <input id="f-wa" className={fieldClass} defaultValue="0803" aria-invalid />
        </FormField>
        <FormField label="Customer code" htmlFor="f-code" hint="Set by the system.">
          <input id="f-code" className={fieldClass} defaultValue="CUS-00418" disabled />
        </FormField>
      </FormSection>
      <FormSection title="Delivery address" optional description="For customers who get deliveries.">
        <FormField label="Address" htmlFor="f-addr">
          <input id="f-addr" className={fieldClass} placeholder="Street, area, city" />
        </FormField>
      </FormSection>
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <RecordSale prefilled withSecondary withDestructive />,
};

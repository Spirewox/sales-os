import type { Meta, StoryObj } from '@storybook/nextjs';
import { STATUS_TONES, StatusBadge } from '@/components/app';

const meta: Meta<typeof StatusBadge> = {
  title: 'App kit/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'One status vocabulary per domain. Colour carries real state only: danger for overdue or out, warning for pending or low, good for paid or resolved.' } },
  },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {
  args: { domain: 'payment', status: 'Paid' },
};

/** Every status in every domain, with the tone STATUS_TONES maps it to. */
export const AllDomains: Story = {
  render: () => (
    <div className="space-y-4">
      {(Object.keys(STATUS_TONES) as (keyof typeof STATUS_TONES)[]).map((domain) => (
        <div key={domain} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{domain}</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATUS_TONES[domain]).map((status) => (
              <StatusBadge key={status} domain={domain} status={status} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

/** Explicit tones with your own words, for states outside the three domains. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge tone="good">Active</StatusBadge>
      <StatusBadge tone="warning">Due in 3 days</StatusBadge>
      <StatusBadge tone="danger">Failed</StatusBadge>
      <StatusBadge tone="neutral">Inactive</StatusBadge>
      <StatusBadge tone="info">RSP</StatusBadge>
    </div>
  ),
};

/** A status the domain does not know falls back to neutral. */
export const UnknownStatus: Story = {
  args: { domain: 'payment', status: 'Refunded' },
};

/** Badges never wrap; long words stay on one line inside a narrow cell. */
export const LongText: Story = {
  render: () => (
    <div className="w-48 space-y-2 rounded-md border p-3">
      <StatusBadge tone="warning">Awaiting confirmation from hub manager</StatusBadge>
      <p className="text-sm">Mama Put Kitchen, Ikeja</p>
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge domain="payment" status="Paid" />
      <StatusBadge domain="payment" status="Partial" />
      <StatusBadge domain="payment" status="Overdue" />
      <StatusBadge domain="stock" status="Low" />
    </div>
  ),
};

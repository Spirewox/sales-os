import type { Meta, StoryObj } from '@storybook/nextjs';
import { Plus, Receipt, Users } from 'lucide-react';
import { fn } from 'storybook/test';
import { EmptyState } from '@/components/app';

const recordButton = (
  <button type="button" onClick={fn()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
    <Plus size={16} aria-hidden /> Record sale
  </button>
);
const clearFilters = (
  <button type="button" onClick={fn()} className="text-sm font-medium text-primary hover:underline">Clear filters</button>
);

const meta: Meta<typeof EmptyState> = {
  title: 'App kit/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No sales to show',
    description: 'No sales recorded for the last 30 days.',
  },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { icon: <Receipt />, action: recordButton },
};

/** Inside a table or panel. */
export const Compact: Story = {
  render: (args) => (
    <div className="rounded-xl border bg-card">
      <EmptyState {...args} size="compact" />
    </div>
  ),
  args: { icon: <Receipt />, description: 'No sales match these filters for the last 7 days.', action: clearFilters },
};

export const TitleOnly: Story = {
  args: { title: 'Nothing to show', description: undefined },
};

export const WithoutAction: Story = {
  args: { icon: <Users />, title: 'No customers yet', description: 'Customers appear here after their first sale.' },
};

export const LongText: Story = {
  args: {
    icon: <Receipt />,
    title: 'No sales match Ikeja hub, Agent Chukwuemeka Okonkwo-Adeyemi, Category frozen poultry and processed meat',
    description: 'Try a wider period, another location, or remove the agent and category filters to see sales recorded by the rest of the team at this hub.',
    action: clearFilters,
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { icon: <Receipt />, action: recordButton },
};

import type { Meta, StoryObj } from '@storybook/nextjs';
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { fn } from 'storybook/test';
import { OverflowMenu, PageHeader, SectionTabs } from '@/components/app';

const recordButton = (
  <button type="button" onClick={fn()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
    <Plus size={16} aria-hidden /> Record sale
  </button>
);
const secondary = (
  <button type="button" onClick={fn()} className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
    Price list
  </button>
);
const overflow = (
  <OverflowMenu
    label="More sales actions"
    items={[
      { label: 'Import sales', icon: <Upload aria-hidden />, onSelect: fn() },
      { label: 'Catalog sales template', icon: <FileSpreadsheet aria-hidden />, onSelect: fn() },
      { label: 'Export sales', icon: <Download aria-hidden />, onSelect: fn() },
    ]}
  />
);
const tabs = (
  <SectionTabs
    label="Sales sections"
    value="sales"
    onChange={fn()}
    tabs={[
      { id: 'sales', label: 'Sales' },
      { id: 'credits', label: 'Credits', count: 12, countTone: 'warning' },
      { id: 'returns', label: 'Returns' },
    ]}
  />
);

const meta: Meta<typeof PageHeader> = {
  title: 'App kit/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Sales',
    description: 'Record sales and check what was sold, to whom, and what is still owed.',
  },
};
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: { actions: recordButton, overflow },
};

export const TitleOnly: Story = {
  args: { description: undefined },
};

export const WithSecondaryAction: Story = {
  args: { actions: <>{secondary}{recordButton}</>, overflow },
};

export const WithTabs: Story = {
  args: { actions: recordButton, overflow, tabs },
};

export const OverflowOnly: Story = {
  args: { title: 'Audit log', description: 'Who changed what, and when.', overflow },
};

export const LongText: Story = {
  args: {
    title: 'Customer engagement and churn risk across every hub and RSP',
    description: 'Customers who bought regularly and then stopped, grouped by how long since their last order, with the agent responsible and the last WhatsApp follow up logged against each account.',
    actions: <>{secondary}{recordButton}</>,
    overflow,
    tabs,
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { actions: recordButton, overflow, tabs },
};

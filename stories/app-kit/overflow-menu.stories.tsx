import type { Meta, StoryObj } from '@storybook/nextjs';
import { Archive, Ban, Download, FileSpreadsheet, Pencil, Trash2, Upload } from 'lucide-react';
import { fn } from 'storybook/test';
import { OverflowMenu, type OverflowItem } from '@/components/app';

const SALES_ITEMS: OverflowItem[] = [
  { label: 'Import sales', icon: <Upload aria-hidden />, onSelect: fn() },
  { label: 'Catalog sales template', icon: <FileSpreadsheet aria-hidden />, onSelect: fn() },
  { label: 'Custom product template', icon: <FileSpreadsheet aria-hidden />, onSelect: fn() },
  { label: 'Export sales', icon: <Download aria-hidden />, onSelect: fn() },
];

const meta: Meta<typeof OverflowMenu> = {
  title: 'App kit/OverflowMenu',
  component: OverflowMenu,
  tags: ['autodocs'],
  args: { items: SALES_ITEMS, label: 'More sales actions' },
  decorators: [(Story) => <div className="flex min-h-64 justify-end"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof OverflowMenu>;

export const Default: Story = {};

/** Destructive items sit last, in red, after a separator. */
export const WithDestructive: Story = {
  args: {
    label: 'More customer actions',
    items: [
      { label: 'Edit customer', icon: <Pencil aria-hidden />, onSelect: fn() },
      { label: 'Export statement', icon: <Download aria-hidden />, onSelect: fn() },
      { label: 'Deactivate', icon: <Ban aria-hidden />, onSelect: fn(), destructive: true },
      { label: 'Delete customer', icon: <Trash2 aria-hidden />, onSelect: fn(), destructive: true },
    ],
  },
};

export const DisabledItem: Story = {
  args: {
    items: [
      { label: 'Import sales', icon: <Upload aria-hidden />, onSelect: fn() },
      { label: 'Preparing template…', icon: <FileSpreadsheet aria-hidden />, onSelect: fn(), disabled: true },
      { label: 'Exporting…', icon: <Download aria-hidden />, onSelect: fn(), disabled: true },
    ],
  },
};

export const WithLinks: Story = {
  args: {
    items: [
      { label: 'Open audit log', href: '/audit' },
      { label: 'Help centre', href: 'https://example.com/help', external: true },
      { label: 'Archive supplier', icon: <Archive aria-hidden />, onSelect: fn(), destructive: true },
    ],
  },
};

/** Small trigger for table rows and drawers. */
export const Small: Story = { args: { size: 'sm' } };

/** Every item hidden: the menu renders nothing. */
export const AllHidden: Story = {
  args: { items: SALES_ITEMS.map((i) => ({ ...i, hidden: true })) },
};

export const LongText: Story = {
  args: {
    items: [
      { label: 'Download the catalog sales import template for Ikeja hub', icon: <FileSpreadsheet aria-hidden />, onSelect: fn() },
      { label: 'Export every sale in the selected period as a spreadsheet', icon: <Download aria-hidden />, onSelect: fn() },
      { label: 'Void all draft sales older than 30 days', icon: <Trash2 aria-hidden />, onSelect: fn(), destructive: true },
    ],
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
};

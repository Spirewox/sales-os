import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const RECORD_TYPES = [
  { value: 'All', label: 'All records' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Customer', label: 'Customer' },
  { value: 'System', label: 'System' },
];

const USERS = [
  { value: 'All', label: 'All users' },
  { value: 'u1', label: 'Adaeze Okafor' },
  { value: 'u2', label: 'Tunde Bakare' },
  { value: 'u3', label: 'Chiamaka Eze-Williams, Lekki branch supervisor' },
];

type DemoProps = {
  items?: { value: string; label: string }[];
  defaultValue?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  defaultOpen?: boolean;
  label?: string;
  triggerClassName?: string;
  onValueChange?: (v: string) => void;
};

/** Same composition as components/filter-select.tsx. */
function SelectDemo({ items = RECORD_TYPES, defaultValue = 'All', size = 'default', disabled, defaultOpen, label = 'Record type', triggerClassName = 'min-w-40', onValueChange }: DemoProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Select
      value={value}
      items={items}
      disabled={disabled}
      defaultOpen={defaultOpen}
      onValueChange={(next) => {
        if (typeof next === 'string') {
          setValue(next);
          onValueChange?.(next);
        }
      }}
    >
      <SelectTrigger size={size} aria-label={label} className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="max-h-72">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const meta = {
  title: 'Primitives/Select',
  component: SelectTrigger,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Base UI select. The app composes it through components/filter-select.tsx (Record type, Module and User filters on Audit trail). SelectTrigger has two sizes: default (32px) and sm (28px). Focus-visible draws a 3px ring; tab to the trigger to see it.',
      },
    },
  },
} satisfies Meta<typeof SelectTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <SelectDemo onValueChange={fn()} /> };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <SelectDemo size="default" label="Record type, default size" />
      <SelectDemo size="sm" label="Record type, small size" />
    </div>
  ),
};

export const Small: Story = { render: () => <SelectDemo size="sm" /> };

export const Open: Story = {
  render: () => <div className="h-64"><SelectDemo defaultOpen /></div>,
};

export const WithGroups: Story = {
  render: () => (
    <div className="h-72">
      <Select defaultValue="sales" defaultOpen items={[{ value: 'sales', label: 'Sales' }, { value: 'inventory', label: 'Inventory' }, { value: 'customers', label: 'Customers' }, { value: 'system', label: 'System' }]}>
        <SelectTrigger aria-label="Module" className="min-w-40"><SelectValue /></SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Business</SelectLabel>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="customers">Customers</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Admin</SelectLabel>
            <SelectItem value="system" disabled>System</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = { render: () => <SelectDemo disabled /> };

export const Invalid: Story = {
  render: () => (
    <Select defaultValue={null} items={USERS}>
      <SelectTrigger aria-label="User" aria-invalid className="min-w-40"><SelectValue placeholder="Choose a user" /></SelectTrigger>
      <SelectContent>
        {USERS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  ),
};

export const LongText: Story = {
  render: () => <SelectDemo items={USERS} defaultValue="u3" label="User" triggerClassName="w-56" />,
  parameters: { docs: { description: { story: 'The value line-clamps to one line inside a fixed-width trigger.' } } },
};

export const FocusVisible: Story = {
  render: () => (
    <div className="space-y-2">
      <SelectDemo />
      <p className="text-xs text-muted-foreground">Tab to the trigger to see the focus ring. Space or Enter opens the list; arrow keys move.</p>
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <SelectDemo items={USERS} label="User" triggerClassName="h-10 w-full" />,
};

import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Download, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'destructive-solid', 'link'] as const;
const TEXT_SIZES = ['xs', 'sm', 'default', 'lg', 'control'] as const;
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const;

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Record sale', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: [...TEXT_SIZES, ...ICON_SIZES] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Base UI button with cva variants. Used today inside the kit Sheet and Dialog. Size control is the app\'s action button and replaces SubmitButton. The loading prop disables the button, keeps focus on it, sets aria-busy and shows a spinner before the label; the label stays whatever the caller passes. Focus-visible draws a 3px ring in the ring token; tab to a button to see it.',
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((v) => (
        <Button key={v} {...args} variant={v}>
          {v === 'destructive' ? 'Delete sale' : v === 'destructive-solid' ? 'Void sale' : v === 'link' ? 'View customer' : v === 'default' ? 'Record sale' : 'Cancel'}
        </Button>
      ))}
    </div>
  ),
};

export const Outline: Story = { args: { variant: 'outline', children: 'Cancel' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Save draft' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Clear filters' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete sale' } };
export const Link: Story = { args: { variant: 'link', children: 'View customer' } };
export const DestructiveSolid: Story = { args: { variant: 'destructive-solid', size: 'control', children: 'Void sale' } };

export const Control: Story = {
  args: { size: 'control', children: 'Save changes' },
  parameters: { docs: { description: { story: 'The app\'s action button: 36px tall, px-4, rounded-md. Replaces SubmitButton.' } } },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {TEXT_SIZES.map((s) => (
        <Button key={s} {...args} size={s}>
          <Plus data-icon="inline-start" aria-hidden />
          Add item ({s})
        </Button>
      ))}
    </div>
  ),
};

export const IconSizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {ICON_SIZES.map((s) => (
        <Button key={s} {...args} variant="outline" size={s} aria-label={`Close (${s})`}>
          <X aria-hidden />
        </Button>
      ))}
    </div>
  ),
  parameters: { docs: { description: { story: 'Icon-only buttons always carry an aria-label.' } } },
};

export const WithIcon: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="outline">
        <Download data-icon="inline-start" aria-hidden />
        Export this page (CSV)
      </Button>
      <Button {...args}>
        <MessageCircle data-icon="inline-start" aria-hidden />
        Message on WhatsApp
      </Button>
      <Button {...args} variant="destructive">
        <Trash2 data-icon="inline-start" aria-hidden />
        Delete
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((v) => (
        <Button key={v} {...args} variant={v} disabled>
          Record sale
        </Button>
      ))}
    </div>
  ),
};

export const Pending: Story = {
  args: { disabled: true, children: 'Working…' },
  parameters: { docs: { description: { story: 'The older pattern: disabled plus a "Working…" label. It drops focus; prefer the loading prop (see Loading).' } } },
};

export const Loading: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="control" loading>Saving…</Button>
      <Button {...args} loading>Saving…</Button>
      <Button {...args} size="control" variant="destructive-solid" loading>Voiding sale…</Button>
    </div>
  ),
  parameters: { docs: { description: { story: 'loading adds the spinner and aria-busy. The "Saving…" label is the caller\'s choice; Button never swaps it.' } } },
};

export const LoadingKeepsFocus: Story = {
  render: (args) => (
    <div className="space-y-2">
      <Button {...args} size="control" loading>Saving…</Button>
      <p className="text-xs text-muted-foreground">Press Tab: a loading button stays in the tab order and keeps its ring, unlike a disabled one.</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const button = canvas.getByRole('button', { name: 'Saving…' });
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};

export const Invalid: Story = {
  args: { variant: 'outline', 'aria-invalid': true, children: 'Choose a customer' },
};

export const LongText: Story = {
  render: (args) => (
    <div className="w-64 space-y-2">
      <Button {...args}>Record sale for Mama Nkechi Provisions, Ikeja</Button>
      <p className="text-xs text-muted-foreground">Labels never wrap (whitespace-nowrap), so long text overflows a narrow parent. Keep labels short.</p>
    </div>
  ),
};

export const FocusVisible: Story = {
  render: (args) => (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Button {...args} variant="outline">Cancel</Button>
        <Button {...args}>Record sale</Button>
      </div>
      <p className="text-xs text-muted-foreground">Press Tab to move focus here. The ring only shows for keyboard focus, not mouse clicks.</p>
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Button {...args} size="lg" className="w-full">Record sale</Button>
      <Button {...args} size="lg" variant="outline" className="w-full">Cancel</Button>
    </div>
  ),
};

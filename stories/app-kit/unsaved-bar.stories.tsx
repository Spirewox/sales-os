import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { UnsavedBar } from '@/components/app';

const meta: Meta<typeof UnsavedBar> = {
  title: 'App kit/UnsavedBar',
  component: UnsavedBar,
  tags: ['autodocs'],
  args: { onDiscard: fn(), onSave: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Price list for Ikeja hub with edited markups.</div>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof UnsavedBar>;

export const Default: Story = {};

export const Saving: Story = { args: { saving: true } };

export const CustomMessage: Story = {
  args: { message: '3 prices changed, markup now 18%', saveLabel: 'Save prices' },
};

export const LongText: Story = {
  args: { message: 'You changed the markup on 24 products across Ikeja, Lekki and Abuja Central hubs. Save before leaving this page or your edits are lost.' },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
};

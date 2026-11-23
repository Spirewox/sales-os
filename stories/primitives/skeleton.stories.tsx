import type { Meta, StoryObj } from '@storybook/nextjs';
import { Skeleton } from '@/components/ui/skeleton';

const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: { className: 'h-4 w-48' },
  parameters: {
    docs: {
      description: {
        component:
          'A muted pulsing block. Size it with height and width utilities to match the content it stands in for, so nothing shifts when data arrives. It carries no role: wrap groups in an element with role="status" and an aria-label, as the loading skeletons do.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-9 w-20 rounded-lg" />
    </div>
  ),
};

export const TableRow: Story = {
  render: () => (
    <div role="status" aria-label="Loading audit log" className="w-full max-w-2xl space-y-3 rounded-xl border bg-card p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  ),
};

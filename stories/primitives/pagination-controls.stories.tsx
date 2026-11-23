import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { PaginationControls } from '@/components/ui/pagination-controls';

function Interactive({ initial = 1, totalPages = 12 }: Readonly<{ initial?: number; totalPages?: number }>) {
  const [page, setPage] = useState(initial);
  return (
    <div className="space-y-2">
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      <p className="text-xs text-muted-foreground tabular-nums">Page {page} of {totalPages}</p>
    </div>
  );
}

const meta = {
  title: 'Primitives/PaginationControls',
  component: PaginationControls,
  tags: ['autodocs'],
  args: { page: 1, totalPages: 12, onPageChange: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Previous, numbered pages with ellipses (one sibling and one boundary page), Next. Used by the kit DataTable, which only renders it when there is more than one page. Focus-visible uses the browser default outline: the buttons set no focus ring of their own.',
      },
    },
  },
} satisfies Meta<typeof PaginationControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = { args: { page: 1 } };
export const MiddlePage: Story = { args: { page: 6 } };
export const LastPage: Story = { args: { page: 12 } };
export const SinglePage: Story = {
  args: { page: 1, totalPages: 1 },
  parameters: { docs: { description: { story: 'DataTable hides the control at one page; shown here on its own, both arrows are disabled.' } } },
};
export const FewPages: Story = { args: { page: 2, totalPages: 3 } };
export const Disabled: Story = { args: { page: 4, disabled: true } };
export const ManyPages: Story = { args: { page: 148, totalPages: 412 } };

export const Clickable: Story = { render: () => <Interactive initial={1} /> };

export const FocusVisible: Story = {
  render: () => (
    <div className="space-y-2">
      <Interactive initial={6} />
      <p className="text-xs text-muted-foreground">Tab through the controls. There is no custom focus ring, so the browser outline shows.</p>
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Interactive initial={6} totalPages={40} />,
};

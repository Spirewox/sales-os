import type { Meta, StoryObj } from '@storybook/nextjs';
import {
  AnalyticsPageSkeleton, CardSkeleton, ChartSkeleton, CreditSheetSkeleton, PanelSkeleton, TableSkeleton,
} from '@/components/ui/loading-skeletons';

const meta = {
  title: 'Primitives/Loading skeletons',
  component: TableSkeleton,
  tags: ['autodocs'],
  args: { rows: 6, cols: 5 },
  parameters: {
    docs: {
      description: {
        component:
          'Page and panel placeholders built from Skeleton. Each sets aria-busy, and all but CardSkeleton and PanelSkeleton also set role="status" with an aria-label. PanelSkeleton shows its label as visible text (used by the import modals and kitchen panels).',
      },
    },
  },
} satisfies Meta<typeof TableSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = {};
export const TableFewColumns: Story = { args: { rows: 3, cols: 3 } };
export const TableManyRows: Story = { args: { rows: 12, cols: 7 } };

export const Card: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4 xl:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ),
};

export const Chart: Story = { render: () => <div className="max-w-2xl"><ChartSkeleton /></div> };
export const ChartShort: Story = { render: () => <div className="max-w-2xl"><ChartSkeleton height={180} /></div> };

export const Panel: Story = { render: () => <PanelSkeleton label="Loading job…" /> };
export const PanelDefaultLabel: Story = { render: () => <PanelSkeleton /> };
export const PanelLongText: Story = {
  render: () => <div className="max-w-sm rounded-xl border bg-card"><PanelSkeleton label="Uploading and validating workbook for Ikeja, Lekki and Abuja branches..." /></div>,
};

export const AnalyticsPage: Story = { render: () => <AnalyticsPageSkeleton /> };

export const CreditSheet: Story = { render: () => <div className="max-w-md"><CreditSheetSkeleton /></div> };

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <AnalyticsPageSkeleton />,
};

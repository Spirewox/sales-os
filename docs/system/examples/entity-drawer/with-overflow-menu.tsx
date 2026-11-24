// Caption: Product drawer with primary actions up top and Edit and Deactivate moved into the overflow menu.
import { PackagePlus } from 'lucide-react';
import { EntityDrawer } from '@/components/app';
import { RowAction } from '@/components/app/data-table';
import { OverflowMenu } from '@/components/app/overflow-menu';
import { StatusBadge } from '@/components/app/status-badge';

export default function EntityDrawerWithOverflowMenu() {
  return (
    <EntityDrawer
      onClose={() => {}}
      title="Jollof rice, family pack"
      subtitle="SKU JR-004 · Cooked food"
      status={<StatusBadge domain="stock" status="Low" />}
      actions={<RowAction onClick={() => {}}><PackagePlus aria-hidden /> Record purchase</RowAction>}
      overflow={
        <OverflowMenu
          size="sm"
          label="More product actions"
          items={[
            { label: 'Edit product', onSelect: () => {} },
            { label: 'Deactivate', onSelect: () => {}, destructive: true },
          ]}
        />
      }
      stats={[
        { label: 'On hand', value: 12, tone: 'warning' },
        { label: 'Markup', value: '25%' },
      ]}
    >
      <p className="text-sm text-muted-foreground">Batches tab content.</p>
    </EntityDrawer>
  );
}

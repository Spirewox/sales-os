// Caption: Inventory header for a person with no inventory permissions, every overflow item hidden so no menu renders
import { PageHeader } from '@/components/app';
import { OverflowMenu } from '@/components/app/overflow-menu';

const noop = () => {};

export default function PageHeaderOverflowAllHidden() {
  return (
    <PageHeader
      title="Inventory"
      description="Stock, batches and expiry across your locations."
      overflow={
        <OverflowMenu
          items={[
            { label: 'Create SKU', onSelect: noop, hidden: true },
            { label: 'Export stock (CSV)', onSelect: noop, hidden: true },
          ]}
        />
      }
    />
  );
}

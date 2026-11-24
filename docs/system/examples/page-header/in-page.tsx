// Caption: Inventory page top, header with primary action, overflow menu and section tabs, then the page body
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app';
import { OverflowMenu } from '@/components/app/overflow-menu';
import { SectionTabs, type SectionTab } from '@/components/app/section-tabs';
import { Button } from '@/components/ui/button';

const noop = () => {};
const tabs: SectionTab<'stock' | 'batches' | 'requests'>[] = [
  { id: 'stock', label: 'Stock' },
  { id: 'batches', label: 'Batches' },
  { id: 'requests', label: 'Requests' },
];

export default function PageHeaderInPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Stock, batches and expiry across your locations."
        actions={
          <Button onClick={noop}>
            <Plus aria-hidden /> Purchase stock
          </Button>
        }
        overflow={
          <OverflowMenu
            items={[
              { label: 'Create SKU', icon: <Plus />, onSelect: noop },
              { label: 'Import movements', icon: <Upload />, onSelect: noop },
              { label: 'Download import template', icon: <FileSpreadsheet />, onSelect: noop },
              { label: 'Export stock (CSV)', icon: <Download />, onSelect: noop },
            ]}
          />
        }
        tabs={<SectionTabs label="Inventory sections" tabs={tabs} defaultTab="stock" />}
      />
      <p className="text-sm text-muted-foreground">Stock table goes here.</p>
    </div>
  );
}

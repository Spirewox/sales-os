// Caption: Customers header with one primary action and the secondary actions in the overflow menu
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app';
import { OverflowMenu } from '@/components/app/overflow-menu';
import { Button } from '@/components/ui/button';

const noop = () => {};

export default function PageHeaderWithActions() {
  return (
    <PageHeader
      title="Customers"
      description="Find a customer, then message, sell or follow up."
      actions={
        <Button onClick={noop}>
          <Plus aria-hidden /> Add customer
        </Button>
      }
      overflow={
        <OverflowMenu
          label="More customer actions"
          items={[
            { label: 'Import customers', icon: <Upload />, onSelect: noop },
            { label: 'Download template', icon: <FileSpreadsheet />, onSelect: noop },
            { label: 'Export customers', icon: <Download />, onSelect: noop },
          ]}
        />
      }
    />
  );
}

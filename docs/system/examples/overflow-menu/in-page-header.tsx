// Caption: Sales page header, one primary button and the overflow menu as the last control
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { OverflowMenu } from '@/components/app';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';

const noop = () => {};

export default function OverflowMenuInPageHeader() {
  return (
    <PageHeader
      title="Sales"
      description="Record sales and check what was sold, to whom, and what is still owed."
      actions={
        <Button onClick={noop}>
          <Plus aria-hidden /> Record sale
        </Button>
      }
      overflow={
        <OverflowMenu
          label="More sales actions"
          items={[
            { label: 'Import sales', icon: <Upload aria-hidden />, onSelect: noop },
            { label: 'Catalog sales template', icon: <FileSpreadsheet aria-hidden />, onSelect: noop },
            { label: 'Export sales', icon: <Download aria-hidden />, onSelect: noop },
          ]}
        />
      }
    />
  );
}

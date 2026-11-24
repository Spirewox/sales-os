// Caption: Customers header menu at the default 36px size with import, template and export items
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

const noop = () => {};

export default function OverflowMenuDefault() {
  return (
    <OverflowMenu
      label="More customer actions"
      items={[
        { label: 'Import customers', icon: <Upload aria-hidden />, onSelect: noop },
        { label: 'Download template', icon: <FileSpreadsheet aria-hidden />, onSelect: noop },
        { label: 'Export customers', icon: <Download aria-hidden />, onSelect: noop },
      ]}
    />
  );
}

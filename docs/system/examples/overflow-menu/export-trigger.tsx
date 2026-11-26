// Caption: The Export menu in a filter bar, a worded trigger over the Excel, CSV and PDF formats
import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

export default function OverflowMenuExportTrigger() {
  return (
    <OverflowMenu
      label="Export suppliers"
      trigger={{ text: 'Export', icon: <Download aria-hidden /> }}
      items={[
        { label: 'Excel (.xlsx)', icon: <FileSpreadsheet aria-hidden />, onSelect: () => {} },
        { label: 'CSV (.csv)', icon: <Sheet aria-hidden />, onSelect: () => {} },
        { label: 'PDF (.pdf)', icon: <FileText aria-hidden />, onSelect: () => {} },
      ]}
    />
  );
}

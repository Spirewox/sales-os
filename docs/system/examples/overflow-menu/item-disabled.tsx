// Caption: Audit trail menu whose only item is disabled because the page has no rows to export
import { Download } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

export default function OverflowMenuItemDisabled() {
  return (
    <OverflowMenu
      label="Audit trail actions"
      items={[{ label: 'Export this page (CSV)', icon: <Download aria-hidden />, disabled: true, onSelect: () => {} }]}
    />
  );
}

// Caption: Job menu whose Open client quote item is a link that opens in a new tab
import { Copy, FileText } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

export default function OverflowMenuItemLink() {
  return (
    <OverflowMenu
      label="More actions for KJ-0142"
      items={[
        { label: 'Open client quote', icon: <FileText aria-hidden />, href: '/kitchen-quote/KJ-0142', external: true },
        { label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: () => {} },
      ]}
    />
  );
}

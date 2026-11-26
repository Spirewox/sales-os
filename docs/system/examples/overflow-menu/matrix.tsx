// Caption: The icon trigger at both sizes beside the worded trigger at both sizes, for side-by-side review
import { Download } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

const items = [{ label: 'CSV (.csv)', onSelect: () => {} }];

export default function OverflowMenuMatrix() {
  return (
    <div className="flex items-center gap-3">
      <OverflowMenu label="More actions" items={items} />
      <OverflowMenu label="More actions" size="sm" items={items} />
      <OverflowMenu label="Export users" items={items} trigger={{ text: 'Export', icon: <Download aria-hidden /> }} />
      <OverflowMenu label="Export users" size="sm" items={items} trigger={{ text: 'Export', icon: <Download aria-hidden /> }} />
    </div>
  );
}

// Caption: Row menu at 32px for one supplier, named after the record, with Edit and a destructive Deactivate
import { Ban, Pencil } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

const noop = () => {};

export default function OverflowMenuSizeSm() {
  return (
    <OverflowMenu
      size="sm"
      label="Actions for Green Valley Farms"
      items={[
        { label: 'Edit supplier', icon: <Pencil aria-hidden />, onSelect: noop },
        { label: 'Deactivate', icon: <Ban aria-hidden />, onSelect: noop, destructive: true },
      ]}
    />
  );
}

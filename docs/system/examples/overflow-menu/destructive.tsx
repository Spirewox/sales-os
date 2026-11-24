// Caption: Job menu with Send quote and Duplicate, then Archive and Cancel job after the separator in destructive text
import { Archive, Ban, Copy, Send } from 'lucide-react';
import { OverflowMenu } from '@/components/app';

const noop = () => {};

export default function OverflowMenuDestructive() {
  return (
    <OverflowMenu
      label="More actions for KJ-0142"
      items={[
        { label: 'Archive', icon: <Archive aria-hidden />, destructive: true, onSelect: noop },
        { label: 'Send quote', icon: <Send aria-hidden />, onSelect: noop },
        { label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: noop },
        { label: 'Cancel job', icon: <Ban aria-hidden />, destructive: true, onSelect: noop },
      ]}
    />
  );
}

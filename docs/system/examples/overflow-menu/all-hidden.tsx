// Caption: Request row for someone who did not raise the request, the only item hidden so nothing renders
import { OverflowMenu } from '@/components/app';

export default function OverflowMenuAllHidden() {
  return (
    <OverflowMenu
      size="sm"
      label="More request actions"
      items={[{ label: 'Cancel request', destructive: true, hidden: true, onSelect: () => {} }]}
    />
  );
}

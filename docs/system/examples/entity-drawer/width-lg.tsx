// Caption: Sale drawer at the lg width, used where a tab holds a line-item table.
import { EntityDrawer } from '@/components/app';
import { StatusBadge } from '@/components/app/status-badge';

export default function EntityDrawerWidthLg() {
  return (
    <EntityDrawer
      onClose={() => {}}
      width="lg"
      title="₦86,500"
      subtitle="Sale S-10482 · 21 Nov 26 · Ikeja hub"
      status={<StatusBadge domain="payment" status="Partial" />}
      stats={[
        { label: 'Paid', value: '₦50,000' },
        { label: 'Balance', value: '₦36,500', tone: 'warning' },
        { label: 'Items', value: 6 },
        { label: 'Markup', value: '18%' },
      ]}
    >
      <p className="text-sm text-muted-foreground">Line items table goes here.</p>
    </EntityDrawer>
  );
}

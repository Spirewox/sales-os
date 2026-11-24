// Caption: Customer drawer at the default md width, with a WhatsApp action, three stats and three tabs.
'use client';

import { useState } from 'react';
import { MessageCircle, ShoppingCart } from 'lucide-react';
import { EntityDrawer } from '@/components/app';
import { RowAction } from '@/components/app/data-table';
import { StatusBadge } from '@/components/app/status-badge';

type Tab = 'overview' | 'purchases' | 'credit';

export default function EntityDrawerDefault() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <EntityDrawer
      onClose={() => {}}
      title="Mama Put Kitchen"
      subtitle="0803 123 4567 · Restaurant · Ikeja"
      status={<StatusBadge tone="good">Active</StatusBadge>}
      actions={
        <>
          <RowAction href="https://wa.me/2348031234567" external><MessageCircle aria-hidden /> WhatsApp</RowAction>
          <RowAction href="/sales/new"><ShoppingCart aria-hidden /> Record sale</RowAction>
        </>
      }
      stats={[
        { label: 'Lifetime spend', value: '₦1,240,000' },
        { label: 'Outstanding', value: '₦45,000', tone: 'warning' },
        { label: 'Last purchase', value: '18 Nov 26' },
      ]}
      tabs={{
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'purchases', label: 'Purchases', count: 24 },
          { id: 'credit', label: 'Credit' },
        ],
        value: tab,
        onChange: setTab,
      }}
    >
      <p className="text-sm text-muted-foreground">Overview of this customer.</p>
    </EntityDrawer>
  );
}

// Caption: Inventory tab body whose boundary clears when the active tab changes, so a failed tab does not stick
'use client';

import { useState } from 'react';
import { SectionErrorBoundary } from '@/components/app';
import { Segmented } from '@/components/app/segmented';

type Tab = 'stock' | 'batches';

function TabBody({ tab }: Readonly<{ tab: Tab }>) {
  if (tab === 'batches') throw new Error('Batches response was malformed');
  return <p className="text-sm">12 products below their minimum.</p>;
}

export default function SectionErrorBoundaryResetByKey() {
  const [tab, setTab] = useState<Tab>('stock');
  return (
    <div className="space-y-4">
      <Segmented
        label="Inventory sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'stock', label: 'Stock' },
          { id: 'batches', label: 'Batches' },
        ]}
      />
      <SectionErrorBoundary label="Inventory" resetKey={tab}>
        <TabBody tab={tab} />
      </SectionErrorBoundary>
    </div>
  );
}

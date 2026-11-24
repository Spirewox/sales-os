// Caption: Needs attention tabs whose counts carry danger, warning and neutral tones
'use client';

import { useState } from 'react';
import { SectionTabs } from '@/components/app';

export default function SectionTabsWithCounts() {
  const [tab, setTab] = useState<'overdue' | 'stock' | 'tickets'>('overdue');
  return (
    <SectionTabs
      label="Needs attention"
      tabs={[
        { id: 'overdue', label: 'Overdue credit', count: 3, countTone: 'danger' },
        { id: 'stock', label: 'Low stock', count: 7, countTone: 'warning' },
        { id: 'tickets', label: 'Open tickets', count: 2, countTone: 'neutral' },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
}

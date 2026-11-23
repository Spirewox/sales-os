// Caption: A tab the person may not see is passed with hidden, so it is left out of the bar
'use client';

import { useState } from 'react';
import { SectionTabs } from '@/components/app';

export default function SectionTabsHiddenTab() {
  const [tab, setTab] = useState<'overview' | 'interactions'>('overview');
  const canSeeInteractions = false;
  return (
    <SectionTabs
      label="Engagement sections"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'interactions', label: 'Interactions', hidden: !canSeeInteractions },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
}

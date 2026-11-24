// Caption: Two short tabs that stay a tab bar on phones instead of becoming a select
'use client';

import { useState } from 'react';
import { SectionTabs } from '@/components/app';

export default function SectionTabsInlineOnMobile() {
  const [tab, setTab] = useState<'overview' | 'interactions'>('overview');
  return (
    <SectionTabs
      label="Engagement sections"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'interactions', label: 'Interactions', count: 4, countTone: 'warning' },
      ]}
      value={tab}
      onChange={setTab}
      inlineOnMobile
    />
  );
}

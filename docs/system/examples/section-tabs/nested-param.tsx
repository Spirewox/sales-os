// Caption: A second bar inside a section writes ?view= so it does not fight the page's ?tab=
'use client';

import { SectionTabs } from '@/components/app';

export default function SectionTabsNestedParam() {
  return (
    <SectionTabs
      label="Interaction types"
      tabs={[
        { id: 'feedback', label: 'Feedback', count: 5, countTone: 'warning' },
        { id: 'enquiries', label: 'Enquiries' },
      ]}
      param="view"
      defaultTab="feedback"
    />
  );
}

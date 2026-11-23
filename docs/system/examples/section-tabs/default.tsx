// Caption: Kitchen sections synced to ?tab=, with the board as the default tab
'use client';

import { SectionTabs, useSectionTab, type SectionTab } from '@/components/app';

const SECTIONS: SectionTab<'board' | 'jobs' | 'recipes'>[] = [
  { id: 'board', label: 'Board' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'recipes', label: 'Recipes' },
];

export default function SectionTabsDefault() {
  const section = useSectionTab(SECTIONS, 'board');
  return (
    <div>
      <SectionTabs label="Kitchen sections" tabs={SECTIONS} defaultTab="board" />
      <p className="pt-4 text-sm text-muted-foreground">Showing {section}</p>
    </div>
  );
}

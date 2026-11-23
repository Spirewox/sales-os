// Caption: The Inventory page header with its section tabs in the tabs slot
'use client';

import { SectionTabs, type SectionTab } from '@/components/app';
import { PageHeader } from '@/components/app/page-header';

const TABS: SectionTab<'stock' | 'movements' | 'requests'>[] = [
  { id: 'stock', label: 'Stock' },
  { id: 'movements', label: 'Movements' },
  { id: 'requests', label: 'Requests', count: 2, countTone: 'warning' },
];

export default function SectionTabsInPageHeader() {
  return <PageHeader title="Inventory" tabs={<SectionTabs label="Inventory sections" tabs={TABS} defaultTab="stock" />} />;
}

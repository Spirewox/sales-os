// Caption: Analytics header with its section tabs under the title row
import { PageHeader } from '@/components/app';
import { SectionTabs, type SectionTab } from '@/components/app/section-tabs';

const tabs: SectionTab<'sales' | 'products' | 'customers'>[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
];

export default function PageHeaderWithTabs() {
  return (
    <PageHeader
      title="Analytics"
      description="Trends in sales, products, customers, credit, stock and suppliers for the selected location and period."
      tabs={<SectionTabs tabs={tabs} defaultTab="sales" label="Analytics sections" />}
    />
  );
}

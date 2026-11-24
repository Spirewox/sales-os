import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { PageHeader, SectionTabs } from '@/components/app';
import { ReconciliationFilters, ReconciliationReport, type Reconciliation } from '@/app/(app)/pos/reconciliation';
import { lagosDay } from '@/lib/period';

const balanced: Reconciliation = {
  shifts: [
    { id: 'shift-1', till: 'Till 01', cashier: 'Amaka Okafor', openedAt: `${lagosDay()}T08:00:00+01:00`, closed: true, cashDropsKobo: 500000, expectedKobo: 10750000, countedKobo: 10750000, varianceKobo: 0 },
    { id: 'shift-2', till: 'Till 02', cashier: 'Bola Ajayi', openedAt: `${lagosDay()}T09:00:00+01:00`, closed: true, cashDropsKobo: 0, expectedKobo: 9425000, countedKobo: 9425000, varianceKobo: 0 },
  ],
  stock: { state: 'matched', submissions: 1 },
  earlierOpenShifts: 0,
};

function Workspace({ report }: Readonly<{ report: Reconciliation }>) {
  const [location, setLocation] = useState('Ikeja');
  const [day, setDay] = useState(lagosDay);
  return <div className="space-y-5">
    <PageHeader title="POS" description="Till operations and recorded sales across your locations."
      tabs={<SectionTabs label="POS sections" tabs={[
        { id: 'overview', label: 'Overview' }, { id: 'transactions', label: 'Transactions' },
        { id: 'tills', label: 'Tills' }, { id: 'shifts', label: 'Shifts' },
        { id: 'reviews', label: 'Payment review' }, { id: 'reconciliation', label: 'Reconciliation' },
      ]} value="reconciliation" onChange={() => {}} />}
    />
    <ReconciliationFilters day={day} onDayChange={setDay} scope={{
      canSwitchHubs: true, filterHub: location, hubName: '', setFilterHub: setLocation,
      hubOptionsDetailed: [{ id: 'ikeja', name: 'Ikeja', locationType: 'hub' }, { id: 'lekki', name: 'Lekki', locationType: 'hub' }],
    }} />
    {location === 'All'
      ? <p className="text-sm text-muted-foreground">Choose one location to review its trading day.</p>
      : <ReconciliationReport report={report} day={day} canViewInventory />}
  </div>;
}

const meta = { title: 'POS/Reconciliation', component: Workspace } satisfies Meta<typeof Workspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RecordedChecksComplete: Story = { args: { report: balanced } };

export const DrawerVariance: Story = {
  args: { report: {
    ...balanced,
    shifts: [
      { ...balanced.shifts[0], countedKobo: 10650000, varianceKobo: -100000 },
      { ...balanced.shifts[1], countedKobo: 9525000, varianceKobo: 100000 },
    ],
    stock: { state: 'variance', submissions: 1 },
  } },
};

export const IncompleteData: Story = {
  args: { report: {
    ...balanced,
    shifts: [{ ...balanced.shifts[0], closed: false, expectedKobo: null, countedKobo: null, varianceKobo: null }],
    stock: { state: 'missing', submissions: 0 },
  } },
};

export const Phone: Story = { ...DrawerVariance, globals: { viewport: { value: 'phone', isRotated: false } } };

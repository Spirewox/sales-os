import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Download } from 'lucide-react';
import { fn, userEvent, within } from 'storybook/test';
import { FilterBar, LocationSelect, MoreFilterField, PeriodSelect, Segmented, type FilterChip } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import type { Period } from '@/lib/period';

const HUBS = [
  { id: 'h1', name: 'Ikeja', locationType: 'hub' },
  { id: 'h2', name: 'Lekki', locationType: 'hub' },
  { id: 'r1', name: 'Ogba', locationType: 'rsp' },
] as ComponentProps<typeof LocationSelect>['scope']['hubOptionsDetailed'];

const AGENTS = [
  { value: '', label: 'All agents' },
  { value: 'a1', label: 'Adaeze Okafor' },
  { value: 'a2', label: 'Tunde Bakare' },
  { value: 'a3', label: 'Halima Yusuf' },
];
const CHANNELS = [
  { value: '', label: 'All channels' },
  { value: 'walk_in', label: 'Walk in' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'whatsapp', label: 'WhatsApp order' },
];
const PAYMENTS = [
  { value: '', label: 'All payments' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partial', label: 'Partial' },
  { value: 'Credit', label: 'Credit' },
];
const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'poultry', label: 'Frozen poultry' },
  { value: 'fish', label: 'Fish and seafood' },
  { value: 'grains', label: 'Rice and grains' },
];

/** The Sales page filter bar, with real state so chips and Clear all work. */
function SalesFilters({ withMore = true, trailing, moreFieldCount = 4 }: Readonly<{ withMore?: boolean; trailing?: boolean; moreFieldCount?: number }>) {
  const [q, setQ] = useState('');
  const [hub, setHub] = useState('All');
  const [period, setPeriod] = useState<Period>({ preset: '30d' });
  const [agent, setAgent] = useState('');
  const [channel, setChannel] = useState('');
  const [payment, setPayment] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState('table');

  const label = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? v;
  const chips: FilterChip[] = [
    hub !== 'All' && { key: 'hub', label: hub, onRemove: () => setHub('All') },
    agent && { key: 'agent', label: label(AGENTS, agent), onRemove: () => setAgent('') },
    channel && { key: 'channel', label: label(CHANNELS, channel), onRemove: () => setChannel('') },
    payment && { key: 'payment', label: label(PAYMENTS, payment), onRemove: () => setPayment('') },
    category && { key: 'category', label: label(CATEGORIES, category), onRemove: () => setCategory('') },
  ].filter(Boolean) as FilterChip[];

  const fields = [
    <MoreFilterField key="agent" label="Agent"><FilterSelect ariaLabel="Agent" value={agent} onChange={setAgent} options={AGENTS} /></MoreFilterField>,
    <MoreFilterField key="channel" label="Channel"><FilterSelect ariaLabel="Channel" value={channel} onChange={setChannel} options={CHANNELS} /></MoreFilterField>,
    <MoreFilterField key="payment" label="Payment"><FilterSelect ariaLabel="Payment" value={payment} onChange={setPayment} options={PAYMENTS} /></MoreFilterField>,
    <MoreFilterField key="category" label="Category"><FilterSelect ariaLabel="Category" value={category} onChange={setCategory} options={CATEGORIES} /></MoreFilterField>,
  ].slice(0, moreFieldCount);

  return (
    <div className="min-h-[420px]">
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search customer, phone or sale #' }}
        filters={
          <>
            <LocationSelect scope={{ canSwitchHubs: true, hubName: '', filterHub: hub, setFilterHub: setHub, hubOptionsDetailed: HUBS }} />
            <PeriodSelect value={period} onChange={setPeriod} />
          </>
        }
        more={withMore ? <>{fields}</> : undefined}
        moreActiveCount={[agent, channel, payment, category].filter(Boolean).length}
        chips={chips}
        onClearAll={() => { setHub('All'); setAgent(''); setChannel(''); setPayment(''); setCategory(''); }}
        resultLabel="1 to 25 of 1,284 sales"
        trailing={
          trailing ? (
            <>
              <Segmented label="View" value={view} onChange={setView} options={[{ id: 'table', label: 'Table' }, { id: 'cards', label: 'Cards' }]} />
              <button type="button" onClick={fn()} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
                <Download size={14} aria-hidden /> Export
              </button>
            </>
          ) : undefined
        }
      />
    </div>
  );
}

const meta: Meta<typeof FilterBar> = {
  title: 'App kit/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'One row: search that grows, a few inline filters, More filters, then chips and a result count. MoreFilterField labels each field inside the popover.' } },
  },
};
export default meta;
type Story = StoryObj<typeof FilterBar>;

const openMore: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: /More filters/ }));
};

export const Default: Story = { render: () => <SalesFilters /> };

/** More filters popover open, in two columns (3 or more fields). */
export const MoreFiltersOpen: Story = { play: openMore, render: () => <SalesFilters /> };

/** Two fields keep the popover in one column. */
export const MoreFiltersOneColumn: Story = { play: openMore, render: () => <SalesFilters moreFieldCount={2} /> };

export const WithTrailing: Story = { render: () => <SalesFilters trailing /> };

/** Static chips and count, no search. */
export const ActiveChips: Story = {
  args: {
    chips: [
      { key: 'hub', label: 'Ikeja', onRemove: fn() },
      { key: 'agent', label: 'Adaeze Okafor', onRemove: fn() },
      { key: 'payment', label: 'Credit', onRemove: fn() },
    ],
    onClearAll: fn(),
    resultLabel: '37 sales',
  },
};

export const SearchOnly: Story = {
  args: { search: { value: '', onChange: fn(), placeholder: 'Search products' }, resultLabel: '64 products' },
};

export const LongText: Story = {
  args: {
    search: { value: 'Mama Put Kitchen and Catering Services Ikeja', onChange: fn(), placeholder: 'Search customer, phone or sale #' },
    chips: [
      { key: 'hub', label: 'Victoria Island and Ikoyi distribution centre', onRemove: fn() },
      { key: 'agent', label: 'Chukwuemeka Okonkwo-Adeyemi', onRemove: fn() },
      { key: 'category', label: 'Frozen poultry and processed meat', onRemove: fn() },
      { key: 'channel', label: 'WhatsApp order', onRemove: fn() },
      { key: 'payment', label: 'Partial', onRemove: fn() },
      { key: 'sku', label: 'Whole chicken 1.2kg, carton of 10', onRemove: fn() },
    ],
    onClearAll: fn(),
    resultLabel: 'No sales match these filters',
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <SalesFilters trailing />,
};

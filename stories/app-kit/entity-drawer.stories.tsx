import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Ban, CreditCard, MessageCircle, MessageSquare, Pencil, ShoppingCart } from 'lucide-react';
import { fn } from 'storybook/test';
import { EntityDrawer, OverflowMenu, RowAction, StatusBadge, type DrawerStat, type SectionTab } from '@/components/app';
import { formatMoney } from '@/lib/format';

type Tab = 'overview' | 'sales' | 'credits' | 'feedback';
const TABS: SectionTab<Tab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales', count: 48 },
  { id: 'credits', label: 'Credits', count: 3, countTone: 'warning' },
  { id: 'feedback', label: 'Feedback' },
];

const STATS: DrawerStat[] = [
  { label: 'Lifetime spend', value: formatMoney(4_820_500) },
  { label: 'Orders', value: 48 },
  { label: 'Outstanding', value: formatMoney(145_000), tone: 'warning' },
  { label: 'Last order', value: '3 days ago' },
];

const actions = (
  <>
    <RowAction href="https://wa.me/2348031555100" external ariaLabel="WhatsApp Mama Put Kitchen"><MessageCircle aria-hidden /> WhatsApp</RowAction>
    <RowAction href="/sales?new=1"><ShoppingCart aria-hidden /> Record sale</RowAction>
    <RowAction tone="primary" href="/credits?customer=c1"><CreditCard aria-hidden /> Record payment</RowAction>
    <RowAction href="/feedback?new=1"><MessageSquare aria-hidden /> Log interaction</RowAction>
  </>
);
const overflow = (
  <OverflowMenu
    size="sm"
    label="More customer actions"
    items={[
      { label: 'Edit customer', icon: <Pencil aria-hidden />, onSelect: fn() },
      { label: 'Deactivate', icon: <Ban aria-hidden />, onSelect: fn(), destructive: true },
    ]}
  />
);

function Body({ tab }: Readonly<{ tab: Tab }>) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">{TABS.find((t) => t.id === tab)?.label}</p>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
          <span>Sale #A3F{92 + i}, whole chicken 1.2kg x 10</span>
          <span className="tabular-nums">{formatMoney(45_000 - i * 2_500)}</span>
        </div>
      ))}
    </div>
  );
}

type DemoProps = {
  startOpen?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  withStatus?: boolean;
  withActions?: boolean;
  withStats?: DrawerStat[] | null;
  withTabs?: SectionTab<Tab>[] | null;
  loading?: boolean;
  dismissible?: boolean;
  width?: 'md' | 'lg';
  onClose?: () => void;
};

/** Trigger button plus the drawer, so open and close both work. */
function Demo({ startOpen = true, title = 'Mama Put Kitchen', subtitle = 'Adaeze Nwosu · +234 803 155 5100 · Restaurant · Ikeja', withStatus = true, withActions = true, withStats = STATS, withTabs = TABS, loading, dismissible, width, onClose }: Readonly<DemoProps>) {
  const [open, setOpen] = useState(startOpen);
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
        Open customer
      </button>
      {open && (
        <EntityDrawer
          onClose={() => { onClose?.(); setOpen(false); }}
          title={title}
          subtitle={subtitle}
          status={withStatus ? <StatusBadge domain="payment" status="Credit" /> : undefined}
          actions={withActions ? actions : undefined}
          overflow={withActions ? overflow : undefined}
          stats={withStats ?? undefined}
          tabs={withTabs ? { items: withTabs, value: tab, onChange: setTab } : undefined}
          loading={loading}
          dismissible={dismissible}
          width={width}
        >
          <Body tab={tab} />
        </EntityDrawer>
      )}
    </>
  );
}

const meta: Meta<typeof EntityDrawer> = {
  title: 'App kit/EntityDrawer',
  component: EntityDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: 640 }, description: { component: 'Side sheet for one record: sticky header with identity, status and actions; a compact stat row; then tabs. Customers are contacted by WhatsApp only.' } },
  },
  decorators: [(Story) => <div className="min-h-[640px] p-4"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof EntityDrawer>;

/** Closed: the trigger opens it. */
export const Default: Story = { render: () => <Demo startOpen={false} onClose={fn()} /> };

export const Open: Story = { render: () => <Demo onClose={fn()} /> };

export const Loading: Story = { render: () => <Demo loading /> };

/** Holding unsaved edits: Escape and backdrop clicks do nothing. */
export const NotDismissible: Story = { render: () => <Demo dismissible={false} /> };

export const Wide: Story = { render: () => <Demo width="lg" /> };

/** Title and body only. */
export const Minimal: Story = {
  render: () => <Demo subtitle={undefined} withStatus={false} withActions={false} withStats={null} withTabs={null} />,
};

/** Three stats: the first spans the phone row. */
export const ThreeStats: Story = { render: () => <Demo withStats={STATS.slice(0, 3)} /> };

/** More than three tabs become a select on phones; three stay inline. */
export const ThreeTabs: Story = { render: () => <Demo withTabs={TABS.slice(0, 3)} /> };

export const LongText: Story = {
  render: () => (
    <Demo
      title="Mama Put Kitchen and Catering Services, Allen Avenue branch"
      subtitle="Chukwuemeka Okonkwo-Adeyemi · +234 803 155 5100 · Restaurant · Victoria Island and Ikoyi distribution centre"
      withStats={[
        { label: 'Lifetime spend across every location', value: formatMoney(128_450_000) },
        { label: 'Orders', value: 1_284 },
        { label: 'Outstanding past 30 days', value: formatMoney(1_284_500), tone: 'danger' },
        { label: 'Last order', value: '3 days ago' },
      ]}
    />
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Demo />,
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from 'storybook/test';
import { SectionTabs, useSectionTab, type SectionTab } from '@/components/app';

type CustomerTab = 'overview' | 'sales' | 'credits' | 'feedback' | 'tasks';
const TABS: SectionTab<CustomerTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales', count: 48 },
  { id: 'credits', label: 'Credits', count: 3, countTone: 'warning' },
  { id: 'feedback', label: 'Feedback', count: 2, countTone: 'danger' },
  { id: 'tasks', label: 'Tasks' },
];

function Controlled({ tabs = TABS, inlineOnMobile }: Readonly<{ tabs?: SectionTab<CustomerTab>[]; inlineOnMobile?: boolean }>) {
  const [tab, setTab] = useState<CustomerTab>('overview');
  return (
    <div className="space-y-3">
      <SectionTabs label="Customer sections" tabs={tabs} value={tab} onChange={setTab} inlineOnMobile={inlineOnMobile} />
      <p className="text-sm text-muted-foreground">Showing {tabs.find((t) => t.id === tab)?.label}</p>
    </div>
  );
}

/** URL mode: the active tab comes from ?tab= through useSectionTab. */
function UrlTabs() {
  const tab = useSectionTab(TABS, 'overview');
  return (
    <div className="space-y-3">
      <SectionTabs label="Customer sections" tabs={TABS} defaultTab="overview" />
      <p className="text-sm text-muted-foreground">useSectionTab returns: {tab}</p>
    </div>
  );
}

const meta: Meta<typeof SectionTabs> = {
  title: 'App kit/SectionTabs',
  component: SectionTabs,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Underline tab bar under the page title. Synced to ?tab= by default; pass value and onChange for local tabs. Becomes a select on phones unless inlineOnMobile.' } },
  },
};
export default meta;
type Story = StoryObj<typeof SectionTabs>;

export const Default: Story = { render: () => <Controlled /> };

/** Counts in neutral, warning and danger tones. Zero counts hide. */
export const Counts: Story = {
  render: () => (
    <Controlled
      tabs={[
        { id: 'overview', label: 'Overview', count: 0 },
        { id: 'sales', label: 'Sales', count: 1280 },
        { id: 'credits', label: 'Credits', count: 7, countTone: 'warning' },
        { id: 'feedback', label: 'Feedback', count: 4, countTone: 'danger' },
      ]}
    />
  ),
};

export const HiddenTab: Story = {
  render: () => <Controlled tabs={TABS.map((t) => (t.id === 'tasks' ? { ...t, hidden: true } : t))} />,
};

/** Reads ?tab=credits from the mocked router. Clicks call router.replace, which the Storybook mock does not apply. */
export const UrlSynced: Story = {
  parameters: { nextjs: { navigation: { pathname: '/customers', query: { tab: 'credits' } } } },
  render: () => <UrlTabs />,
};

/** Unknown ?tab= values fall back to defaultTab. */
export const UrlUnknownTab: Story = {
  parameters: { nextjs: { navigation: { pathname: '/customers', query: { tab: 'archive' } } } },
  render: () => <UrlTabs />,
};

export const ManyTabs: Story = {
  render: () => (
    <div className="max-w-xl">
      <SectionTabs
        label="Analytics sections"
        value="revenue"
        onChange={fn()}
        tabs={[
          { id: 'revenue', label: 'Revenue' },
          { id: 'products', label: 'Products' },
          { id: 'customers', label: 'Customers' },
          { id: 'agents', label: 'Agents' },
          { id: 'locations', label: 'Locations' },
          { id: 'deliveries', label: 'Deliveries' },
          { id: 'credits', label: 'Credits and collections', count: 14, countTone: 'warning' },
          { id: 'churn', label: 'Churn risk', count: 31, countTone: 'danger' },
        ]}
      />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Controlled />,
};

/** Two or three short tabs can stay inline on phones. */
export const PhoneInline: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Controlled tabs={TABS.slice(0, 3)} inlineOnMobile />,
};

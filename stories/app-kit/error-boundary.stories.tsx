import { useState, type ComponentType, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { SectionErrorBoundary } from '@/components/app';

function Thrower(): never {
  throw new Error('Story: alerts response was malformed');
}

function HealthySection() {
  return (
    <div className="rounded-xl border bg-card p-5 text-sm">
      <p className="font-semibold">Alerts</p>
      <p className="mt-1 text-muted-foreground">3 products low at Ikeja hub.</p>
    </div>
  );
}

/** Try again re-renders the child; flip the switch first to let it succeed. */
function Recoverable() {
  const [broken, setBroken] = useState(true);
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={broken} onChange={(e) => setBroken(e.target.checked)} className="size-4 accent-[var(--primary)]" />
        Child throws
      </label>
      <SectionErrorBoundary label="Alerts">{broken ? <Thrower /> : <HealthySection />}</SectionErrorBoundary>
    </div>
  );
}

/** resetKey (the active tab) clears the error when it changes. */
function ResetByKey() {
  const [tab, setTab] = useState<'alerts' | 'stock'>('alerts');
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['alerts', 'stock'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className="h-8 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted aria-pressed:bg-muted">
            {t === 'alerts' ? 'Alerts' : 'Stock'}
          </button>
        ))}
      </div>
      <SectionErrorBoundary label={tab === 'alerts' ? 'Alerts' : 'Stock'} resetKey={tab}>
        {tab === 'alerts' ? <Thrower /> : <HealthySection />}
      </SectionErrorBoundary>
    </div>
  );
}

const meta: Meta = {
  title: 'App kit/SectionErrorBoundary',
  // Cast: the class's getDerivedStateFromProps(props: Props) requires children, which Storybook's ComponentClass<any> check rejects.
  component: SectionErrorBoundary as unknown as ComponentType<{ children: ReactNode; label?: string; resetKey?: unknown }>,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Wrap each tab or page section so one bad response shows a contained message instead of blanking the page. The thrown error is logged to the console on purpose in these stories.' } },
  },
};
export default meta;
type Story = StoryObj;

/** No error: children render unchanged. */
export const Default: Story = {
  render: () => <SectionErrorBoundary label="Alerts"><HealthySection /></SectionErrorBoundary>,
};

export const ErrorState: Story = {
  name: 'Error',
  render: () => <SectionErrorBoundary label="Alerts"><Thrower /></SectionErrorBoundary>,
};

/** Without a label the message names "This section". */
export const ErrorWithoutLabel: Story = {
  render: () => <SectionErrorBoundary><Thrower /></SectionErrorBoundary>,
};

export const TryAgain: Story = { render: () => <Recoverable /> };

export const ResetKey: Story = { render: () => <ResetByKey /> };

export const LongText: Story = {
  render: () => <SectionErrorBoundary label="Customer engagement, churn risk and WhatsApp follow ups by agent"><Thrower /></SectionErrorBoundary>,
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <SectionErrorBoundary label="Sales"><Thrower /></SectionErrorBoundary>,
};

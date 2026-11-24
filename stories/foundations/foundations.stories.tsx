import type { Meta, StoryObj } from '@storybook/nextjs';
import { BRAND, CHART_RAMP, SERIES, SIDEBAR, STATUS, SURFACES, VISUAL_RULES } from './token-data';
import { Section, SwatchTable } from './Swatches';

const meta: Meta = {
  title: 'Foundations',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Overview: Story = {
  render: () => (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Sales OS visual rules</h1>
      <p className="text-sm text-muted-foreground">
        From the header comment of app/globals.css, the one token source (Tailwind v4 @theme inline plus :root and .dark variables). Every page follows them.
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        {VISUAL_RULES.map((r, i) => (
          <div key={i} className="flex gap-4 border-t px-4 py-3 text-sm first:border-t-0">
            <span className="w-16 shrink-0 font-medium">{r.area}</span>
            <span className="text-muted-foreground">{r.rule}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Colour: Story = {
  render: () => (
    <>
      <Section title="Surfaces and text" note="Surface and foreground pairs. Use the utility (bg-card, text-muted-foreground), never a raw value.">
        <SwatchTable rows={SURFACES} />
      </Section>
      <Section title="Sidebar" note="The app shell's navigation surface.">
        <SwatchTable rows={SIDEBAR} />
      </Section>
      <Section title="Brand secondaries" note="Fudfarmer palette 3.2. Illustration, empty states and identity marks only.">
        <SwatchTable rows={BRAND} />
      </Section>
    </>
  ),
};

export const Status: Story = {
  render: () => (
    <>
      <Section title="Status colours" note="Only for real state: destructive = overdue, out, failed. warning = pending, low. primary = good. Always paired with a word.">
        <SwatchTable rows={STATUS} />
      </Section>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Paid</span>
        <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">Pending</span>
        <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">Overdue</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Draft</span>
      </div>
    </>
  ),
};

export const Charts: Story = {
  render: () => (
    <>
      <Section title="Chart ramp" note="One series, or a magnitude scale. chart-1 for a single series.">
        <div className="flex gap-1">{CHART_RAMP.map((t) => <div key={t.name} className="h-10 flex-1 rounded-md" style={{ background: `var(--${t.name})` }} title={t.name} />)}</div>
        <SwatchTable rows={CHART_RAMP} />
      </Section>
      <Section title="Series palette" note="Two to four series that need telling apart, in this fixed order. A fifth series folds into series-other. Always with a legend.">
        <div className="flex gap-1">{SERIES.map((t) => <div key={t.name} className="h-10 flex-1 rounded-md" style={{ background: `var(--${t.name})` }} title={t.name} />)}</div>
        <SwatchTable rows={SERIES} />
      </Section>
    </>
  ),
};

const TYPE = [
  { cls: 'text-xl font-semibold', name: 'text-xl semibold', use: 'Page title (PageHeader)' },
  { cls: 'text-base font-semibold', name: 'text-base semibold', use: 'Section and drawer titles' },
  { cls: 'text-sm', name: 'text-sm', use: 'Body, table cells, controls' },
  { cls: 'text-sm text-muted-foreground', name: 'text-sm muted', use: 'Descriptions, secondary cells' },
  { cls: 'text-xs text-muted-foreground', name: 'text-xs muted', use: 'Captions, KPI labels. The smallest size' },
  { cls: 'text-2xl font-semibold tabular-nums', name: 'text-2xl semibold tabular-nums', use: 'KPI figures' },
  { cls: 'font-mono text-xs', name: 'font-mono text-xs', use: 'Codes and IDs only' },
];

export const Type: Story = {
  render: () => (
    <Section title="Type scale" note="Geist for UI, Geist Mono only for codes and IDs. Sentence case labels, tabular figures.">
      <div className="overflow-hidden rounded-xl border bg-card">
        {TYPE.map((t) => (
          <div key={t.name} className="grid grid-cols-1 gap-1 border-t px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_200px_220px] sm:items-baseline sm:gap-4">
            <span className={t.cls}>Sales this week 1,204,500</span>
            <span className="font-mono text-xs text-muted-foreground">{t.name}</span>
            <span className="text-xs text-muted-foreground">{t.use}</span>
          </div>
        ))}
      </div>
    </Section>
  ),
};

const RADII = [
  { cls: 'rounded-md', name: 'rounded-md', value: 'calc(var(--radius) * 0.8) = 6.4px', use: 'Controls, inputs, buttons' },
  { cls: 'rounded-lg', name: 'rounded-lg', value: 'var(--radius) = 8px', use: 'Menus, small panels' },
  { cls: 'rounded-xl', name: 'rounded-xl', value: 'calc(var(--radius) * 1.4) = 11.2px', use: 'Cards, tables, KPI strip' },
  { cls: 'rounded-full', name: 'rounded-full', value: '9999px', use: 'Badges and avatars' },
];

export const Radius: Story = {
  render: () => (
    <Section title="Radius" note="--radius is 0.5rem. Cards rounded-xl, controls rounded-md, badges and avatars rounded-full.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {RADII.map((r) => (
          <div key={r.name} className="space-y-2">
            <div className={`h-20 border-2 border-primary bg-muted ${r.cls}`} />
            <div className="font-mono text-xs">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.value}</div>
            <div className="text-xs text-muted-foreground">{r.use}</div>
          </div>
        ))}
      </div>
    </Section>
  ),
};

const SPACE = [1, 1.5, 2, 3, 4, 5, 6, 8];

export const Spacing: Story = {
  render: () => (
    <Section title="Spacing" note="Tailwind's 4px step (--spacing: 0.25rem). Common gaps: gap-2 inside controls, gap-3 between fields, gap-4 between sections, p-4 or p-5 inside cards.">
      <div className="space-y-2">
        {SPACE.map((s) => (
          <div key={s} className="flex items-center gap-4">
            <span className="w-20 font-mono text-xs">{`${s} = ${s * 4}px`}</span>
            <span className="h-3 rounded-sm bg-primary" style={{ width: `calc(var(--spacing) * ${s})` }} />
          </div>
        ))}
      </div>
    </Section>
  ),
};

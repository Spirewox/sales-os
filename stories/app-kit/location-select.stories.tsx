import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { LocationSelect } from '@/components/app';

type Scope = ComponentProps<typeof LocationSelect>['scope'];
type HubOption = Scope['hubOptionsDetailed'][number];

const HUBS: HubOption[] = [
  { id: 'h1', name: 'Ikeja', locationType: 'hub' },
  { id: 'h2', name: 'Lekki', locationType: 'hub' },
  { id: 'h3', name: 'Abuja Central', locationType: 'hub' },
  { id: 'r1', name: 'Ogba', locationType: 'rsp' },
  { id: 'r2', name: 'Ajah', locationType: 'rsp' },
] as HubOption[];

/** A switchable scope with local state, the shape useHubScopeFilter returns. */
function Switchable({ hubs = HUBS, start = 'All', allLabel }: Readonly<{ hubs?: HubOption[]; start?: string; allLabel?: string }>) {
  const [filterHub, setFilterHub] = useState(start);
  return (
    <div className="space-y-3">
      <LocationSelect scope={{ canSwitchHubs: true, hubName: '', filterHub, setFilterHub, hubOptionsDetailed: hubs, allLabel }} />
      <p className="text-xs text-muted-foreground">Filtering by: {filterHub}</p>
    </div>
  );
}

const meta: Meta<typeof LocationSelect> = {
  title: 'App kit/LocationSelect',
  component: LocationSelect,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'The one location control. Takes the scope from useHubScopeFilter; stories pass a plain object so nothing hits the network.' } },
  },
};
export default meta;
type Story = StoryObj<typeof LocationSelect>;

export const Default: Story = { render: () => <Switchable /> };

export const OneSelected: Story = { render: () => <Switchable start="Lekki" /> };

/** A manager of several locations: their locations only, and "All my locations" for them together. */
export const AllMyLocations: Story = { render: () => <Switchable hubs={HUBS.slice(0, 3)} allLabel="All my locations" /> };

/** Users limited to one location see it as a read-only label. */
export const Locked: Story = {
  render: () => <LocationSelect scope={{ canSwitchHubs: false, hubName: 'Ikeja', filterHub: 'Ikeja', setFilterHub: () => {}, hubOptionsDetailed: [] }} />,
};

/** Locked with no hub name: renders nothing. */
export const LockedNoHub: Story = {
  render: () => (
    <div className="space-y-2">
      <LocationSelect scope={{ canSwitchHubs: false, hubName: '', filterHub: 'All', setFilterHub: () => {}, hubOptionsDetailed: [] }} />
      <p className="text-xs text-muted-foreground">Nothing renders above this line.</p>
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <Switchable
      start="Victoria Island and Ikoyi distribution centre"
      hubs={[
        ...HUBS,
        { id: 'h9', name: 'Victoria Island and Ikoyi distribution centre', locationType: 'hub' },
        { id: 'r9', name: 'Ibeju-Lekki Free Trade Zone pickup point', locationType: 'rsp' },
      ] as HubOption[]}
    />
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Switchable />,
};

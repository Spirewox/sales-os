import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { LocationsPicker } from '@/app/(app)/settings/locations-picker';
import type { Hub } from '@/types';

const hub = (id: string, name: string, parent: string | null = null, isActive = true) =>
  ({ id, name, isActive, parentHubId: parent, locationType: parent ? 'rsp' : 'hub', createdDate: '2026-01-01' }) as unknown as Hub;
const HUBS = [
  hub('lagos', 'Lagos Hub'), hub('lekki', 'Lekki RSP', 'lagos'), hub('yaba', 'Yaba RSP', 'lagos'),
  hub('ife', 'Ife Hub'), hub('modakeke', 'Modakeke RSP', 'ife'), hub('nasarawa', 'Nasarawa Hub'), hub('old', 'Old Hub', null, false),
];
const ALL = new Set(HUBS.filter((h) => h.isActive).map((h) => h.id));

function Editable({ start, editable = ALL }: Readonly<{ start: string[]; editable?: Set<string> }>) {
  const [value, setValue] = useState(start);
  return (
    <div className="max-w-md space-y-2">
      <LocationsPicker hubs={HUBS} editableIds={editable} value={value} onChange={setValue} idPrefix="story" />
      <p className="text-xs text-muted-foreground">Chosen: {value.join(', ') || 'none'}</p>
    </div>
  );
}

const meta: Meta<typeof Editable> = { title: 'Screens/User locations picker', component: Editable };
export default meta;
type Story = StoryObj<typeof Editable>;

export const OneChosen: Story = { args: { start: ['lagos'] } };
export const SeveralChosen: Story = { args: { start: ['ife', 'modakeke', 'nasarawa'] } };
/** A manager of Ife and Nasarawa editing a colleague who also works in Lagos: Lagos stays, locked. */
export const OutsideYourLocations: Story = { args: { start: ['lagos', 'ife'], editable: new Set(['ife', 'modakeke', 'nasarawa']) } };
export const InactiveAssigned: Story = { args: { start: ['old', 'ife'] } };

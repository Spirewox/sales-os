'use client';

import { Bell, KeyRound, MapPin, Palette, Shield, User, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { FilterSelect } from '@/components/filter-select';
import { cn } from '@/lib/utils';

export type SettingsSectionId = 'profile' | 'password' | 'appearance' | 'alerts' | 'users' | 'locations' | 'roles';

export type SettingsSection = { id: SettingsSectionId; label: string; icon: ReactNode };
export type SettingsGroup = { label: string; sections: SettingsSection[] };

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: 'Your account',
    sections: [
      { id: 'profile', label: 'Profile', icon: <User aria-hidden /> },
      { id: 'password', label: 'Password', icon: <KeyRound aria-hidden /> },
      { id: 'appearance', label: 'Appearance', icon: <Palette aria-hidden /> },
      { id: 'alerts', label: 'Alerts', icon: <Bell aria-hidden /> },
    ],
  },
  {
    label: 'Organisation',
    sections: [
      { id: 'users', label: 'Users', icon: <Users aria-hidden /> },
      { id: 'locations', label: 'Locations', icon: <MapPin aria-hidden /> },
      { id: 'roles', label: 'Roles and access', icon: <Shield aria-hidden /> },
    ],
  },
];

export const SETTINGS_SECTION_IDS = SETTINGS_GROUPS.flatMap((g) => g.sections.map((s) => s.id));

/** Left sub-menu of links on desktop; a select on phones. Each section is `/settings?tab=<id>`. */
export function SettingsNav({ value, onChange }: Readonly<{ value: SettingsSectionId; onChange: (id: SettingsSectionId) => void }>) {
  return (
    <>
      <div className="md:hidden">
        <FilterSelect
          ariaLabel="Settings section"
          value={value}
          onChange={(v) => onChange(v as SettingsSectionId)}
          options={SETTINGS_GROUPS.flatMap((g) => g.sections.map((s) => ({ value: s.id, label: `${g.label}: ${s.label}` })))}
        />
      </div>
      <nav aria-label="Settings sections" className="hidden space-y-5 md:block">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
            <ul className="space-y-0.5">
              {group.sections.map((s) => {
                const active = s.id === value;
                return (
                  <li key={s.id}>
                    <Link
                      href={s.id === 'profile' ? '/settings' : `/settings?tab=${s.id}`}
                      scroll={false}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4 [&_svg]:shrink-0',
                        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {s.icon}
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

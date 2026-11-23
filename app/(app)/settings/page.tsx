'use client';

import { Suspense, type ReactNode } from 'react';
import { AlertSettings } from '@/components/alert-settings';
import { PageHeader, SectionErrorBoundary } from '@/components/app';
import { useUrlState } from '@/hooks/use-url-state';
import { SETTINGS_GROUPS, SETTINGS_SECTION_IDS, SettingsNav, type SettingsSectionId } from './settings-nav';
import { SectionHeading } from './settings-ui';
import { ProfileSection } from './profile-section';
import { PasswordSection } from './password-section';
import { AppearanceSection } from './appearance-section';
import { UsersSection } from './users-section';
import { LocationsSection } from './locations-section';
import { RolesSection } from './roles-section';

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function AlertsSection() {
  return (
    <section aria-labelledby="settings-alerts" className="space-y-5">
      <SectionHeading id="settings-alerts" title="Alerts" description="How and when you hear about things that need you." />
      <AlertSettings />
    </section>
  );
}

const SECTIONS: Record<SettingsSectionId, () => ReactNode> = {
  profile: () => <ProfileSection />,
  password: () => <PasswordSection />,
  appearance: () => <AppearanceSection />,
  alerts: () => <AlertsSection />,
  users: () => <UsersSection />,
  locations: () => <LocationsSection />,
  roles: () => <RolesSection />,
};

/** Your account and Organisation sections, each at /settings?tab=<id> (default: profile). */
function SettingsContent() {
  const { get, set } = useUrlState();
  const requested = get('tab') as SettingsSectionId | null;
  const active: SettingsSectionId = requested && SETTINGS_SECTION_IDS.includes(requested) ? requested : 'profile';
  const label = SETTINGS_GROUPS.flatMap((g) => g.sections).find((s) => s.id === active)?.label ?? 'Settings';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Settings" description="Your own account, and how your organisation is set up." />
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="md:sticky md:top-6 md:self-start">
          <SettingsNav value={active} onChange={(id) => set({ tab: id === 'profile' ? null : id })} />
        </aside>
        <div className="min-w-0">
          {/* Each section gets its own boundary so one bad response can't blank the page. */}
          <SectionErrorBoundary key={active} label={label} resetKey={active}>
            {SECTIONS[active]()}
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
}

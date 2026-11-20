'use client';

import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Segmented } from '@/components/app';
import { SectionHeading } from './settings-ui';

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;
type ThemeId = (typeof THEMES)[number]['id'];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const value: ThemeId = theme === 'light' || theme === 'dark' ? theme : 'system';
  return (
    <section aria-labelledby="settings-appearance" className="space-y-5">
      <SectionHeading id="settings-appearance" title="Appearance" description="Saved on this device." />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p id="appearance-theme-label" className="text-sm font-medium">Theme</p>
          <p className="text-xs text-muted-foreground">System follows your device setting.</p>
        </div>
        <Segmented
          label="Theme"
          value={value}
          options={THEMES}
          onChange={(next) => {
            setTheme(next);
            toast.success(`Theme set to ${next}.`, { id: 'theme' });
          }}
        />
      </div>
    </section>
  );
}

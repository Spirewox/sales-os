'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Lock, Mail, MonitorSmartphone } from 'lucide-react';
import { axiosGet, axiosPatch } from '@/lib/api';
import { disablePush, enablePush, pushStatus, type PushStatus } from '@/lib/push';
import { PUSH_TEXT } from '@/contexts/crm-notifications-context';
import { Switch } from '@/components/ui/switch';

type Prefs = { email: 'off' | 'critical' | 'all'; push: boolean; muted: string[]; mutable_types: string[] };

export const PREFS_KEY = ['crm-notification-prefs'];

const EMAIL_MODES: Prefs['email'][] = ['off', 'critical', 'all'];

/** Fill in any field a malformed or partial response leaves out, so the page never reads `.map` of undefined. */
function normalizePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Prefs, unknown>>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    email: EMAIL_MODES.includes(r.email as Prefs['email']) ? (r.email as Prefs['email']) : 'off',
    push: r.push === true,
    muted: strings(r.muted),
    mutable_types: strings(r.mutable_types),
  };
}

const TYPES: Record<string, { label: string; hint: string }> = {
  job_confirmed: { label: 'New kitchen jobs', hint: 'A quote is confirmed or a new order is added.' },
  not_accepted: { label: 'Jobs not accepted yet', hint: 'A new job is still waiting for the kitchen.' },
  due_soon: { label: 'Jobs due soon', hint: 'A job is close to its pickup or delivery time.' },
  quote_confirmed: { label: 'My quotes confirmed', hint: 'A quote you created was turned into an order.' },
  completed_with_balance: { label: 'Completed with money owed', hint: 'A job finished with part of the bill unpaid.' },
  bulk_job: { label: 'Imports and exports finished', hint: 'A file you uploaded or requested is ready.' },
};

function Row({ id, icon, label, hint, children }: { id: string; icon?: React.ReactNode; label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <div className="min-w-0">
          <p id={`${id}-label`} className="text-sm font-medium">{label}</p>
          {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** The signed-in person's own alert settings: channels, this browser, and which alert types they get. */
export function AlertSettings() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: PREFS_KEY, queryFn: async () => normalizePrefs(((await axiosGet('notifications/preferences', true)) as { data?: unknown } | undefined)?.data) });
  const [device, setDevice] = useState<PushStatus | null>(null);
  const [deviceBusy, setDeviceBusy] = useState(false);

  useEffect(() => {
    void pushStatus().then(setDevice).catch(() => setDevice('unsupported'));
  }, []);

  const save = async (patch: Partial<Prefs>) => {
    const prev = prefs.data;
    if (prev) qc.setQueryData(PREFS_KEY, { ...prev, ...patch });
    try {
      const res = (await axiosPatch('notifications/preferences', patch, true)) as { data?: unknown } | undefined;
      qc.setQueryData(PREFS_KEY, normalizePrefs({ ...prev, ...patch, ...(res?.data && typeof res.data === 'object' ? res.data : {}) }));
      toast.success('Alert settings saved', { id: 'alert-prefs' });
    } catch (e) {
      if (prev) qc.setQueryData(PREFS_KEY, prev);
      toast.error(e instanceof Error ? e.message : 'Could not save alert settings');
    }
  };

  const toggleDevice = async (on: boolean) => {
    setDeviceBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setDevice(next);
      if (next === 'on' || next === 'off') toast.success(next === 'on' ? 'Pop-ups turned on for this device' : 'Pop-ups turned off for this device', { id: 'alert-device' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change notifications on this device');
    } finally {
      setDeviceBusy(false);
    }
  };

  if (prefs.isPending) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading alert settings…</div>;
  if (prefs.isError || !prefs.data) return <div className="rounded-xl border bg-card p-6 text-sm text-destructive">Could not load alert settings. Refresh the page to try again.</div>;
  const p = prefs.data;
  const emailOn = p.email !== 'off';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card" aria-labelledby="alerts-how">
        <div className="border-b p-6 pb-4">
          <h3 id="alerts-how" className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} aria-hidden className="text-muted-foreground" /> How you get alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground">These settings are only for you. Every alert also appears in the Notifications bell.</p>
        </div>
        <div className="divide-y">
          <Row id="al-push" icon={<MonitorSmartphone size={16} aria-hidden />} label="Phone and laptop pop-ups" hint="Show alerts as notifications on the devices you have turned on below.">
            <Switch checked={p.push} onCheckedChange={(v) => void save({ push: v })} aria-labelledby="al-push-label" aria-describedby="al-push-hint" />
          </Row>
          <Row id="al-device" label="This device" hint={device ? PUSH_TEXT[device] : 'Checking this device…'}>
            <Switch
              checked={device === 'on'}
              disabled={deviceBusy || !p.push || (device !== 'on' && device !== 'off')}
              onCheckedChange={(v) => void toggleDevice(v)}
              aria-labelledby="al-device-label"
              aria-describedby="al-device-hint"
            />
          </Row>
          <Row id="al-email" icon={<Mail size={16} aria-hidden />} label="Email" hint="Send alerts to the email address on your profile.">
            <Switch checked={emailOn} onCheckedChange={(v) => void save({ email: v ? 'critical' : 'off' })} aria-labelledby="al-email-label" aria-describedby="al-email-hint" />
          </Row>
          {emailOn && (
            <Row id="al-email-urgent" label="Only urgent alerts by email" hint="Turn off to get every alert by email, not just overdue and escalated jobs.">
              <Switch checked={p.email === 'critical'} onCheckedChange={(v) => void save({ email: v ? 'critical' : 'all' })} aria-labelledby="al-email-urgent-label" aria-describedby="al-email-urgent-hint" />
            </Row>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card" aria-labelledby="alerts-which">
        <div className="border-b p-6 pb-4">
          <h3 id="alerts-which" className="text-sm font-semibold">Which alerts you get</h3>
          <p className="mt-1 text-sm text-muted-foreground">Turned-off alerts still show in the bell, but without a pop-up or email.</p>
        </div>
        <div className="divide-y">
          {p.mutable_types.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No alert types can be turned off for your role.</p>
          )}
          {p.mutable_types.map((t) => {
            const meta = TYPES[t] ?? { label: t, hint: '' };
            const id = `al-type-${t}`;
            return (
              <Row key={t} id={id} label={meta.label} hint={meta.hint}>
                <Switch
                  checked={!p.muted.includes(t)}
                  onCheckedChange={(on) => void save({ muted: on ? p.muted.filter((m) => m !== t) : [...p.muted, t] })}
                  aria-labelledby={`${id}-label`}
                  aria-describedby={meta.hint ? `${id}-hint` : undefined}
                />
              </Row>
            );
          })}
          <Row id="al-urgent" icon={<Lock size={16} aria-hidden />} label="Urgent alerts" hint="Overdue and escalated jobs always come through so nothing is missed.">
            <Switch checked disabled onCheckedChange={() => undefined} aria-labelledby="al-urgent-label" aria-describedby="al-urgent-hint" />
          </Row>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { usePermissions } from '@/hooks/use-permissions';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useAgents, useRoles } from '@/hooks/use-queries';
import { useKitchenImport, useKitchenSettings, useUpdateKitchenSettings, type KitchenImportSummary } from '@/hooks/use-kitchen';
import { RUNNING_COST_ITEMS, runningCostRates, type RunningCosts } from '@/lib/kitchen-costing';
import { cn } from '@/lib/utils';
import { naira, type KitchenAlertRecipient, type KitchenAlertRule, type KitchenAlertType, type KitchenDefaults } from '@/lib/kitchen-types';
import { btnGhost, btnSecondary, ErrorPanel, Field, inputClass, MoneyInput, NumberInput } from './kitchen-ui';

const ALERT_LABELS: Record<KitchenAlertType, { label: string; when: string }> = {
  job_confirmed: { label: 'New job confirmed', when: 'Instantly' },
  not_accepted: { label: 'Not accepted yet', when: 'Every “accept within” minutes until accepted' },
  due_soon: { label: 'Due soon, not ready', when: 'When the “due soon” window starts' },
  overdue: { label: 'Overdue', when: 'At the due time' },
  quote_confirmed: { label: 'Quote confirmed', when: 'When a quote becomes an order' },
  completed_with_balance: { label: 'Completed with balance owing', when: 'When the job is completed' },
};
const RECIPIENT_LABELS: Record<KitchenAlertRecipient['kind'], string> = {
  kitchen_staff: 'Kitchen staff at the outlet',
  kitchen_managers: 'Kitchen managers at the outlet',
  outlet_admins: 'Kitchen admins',
  outlet_role: 'A role at the outlet',
  company_role: 'A role company-wide',
  user: 'A named person',
  creator: 'Whoever took the job',
  quote_author: 'Whoever wrote the quote',
};

function Card({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t px-5 py-3">{footer}</div>}
    </section>
  );
}

function ReadValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function KitchenSettingsSection({ hubScope }: { hubScope: HubScopeFilter }) {
  const { can } = usePermissions();
  // Outlet-bound users (e.g. a Kitchen manager) start on their own outlet's running costs.
  // Hubs load after the first render, so derive the default until the user picks an outlet.
  const [pickedHub, setCostHub] = useState<string | null>(null);
  const costHub = pickedHub ?? (hubScope.canSwitchHubs ? '' : hubScope.defaultHubId ?? '');
  const settings = useKitchenSettings(costHub || undefined);

  if (settings.isPending) return <PanelSkeleton label="Loading kitchen settings…" />;
  if (settings.isError) return <ErrorPanel message={settings.error.message} onRetry={() => void settings.refetch()} />;
  const s = settings.data;
  const canEdit = s.can_edit && can('kitchen.manage_pricing');

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <DefaultsCard key={`d-${JSON.stringify(s.defaults)}`} defaults={s.defaults} canEdit={canEdit} />
      <TimingCard key={`t-${JSON.stringify(s.defaults)}`} defaults={s.defaults} canEdit={canEdit} />
      <RunningCostsCard
        key={`r-${costHub}-${JSON.stringify(s.running_costs)}`}
        running={s.running_costs}
        source={s.running_costs_source}
        hubId={costHub}
        setHubId={setCostHub}
        hubScope={hubScope}
        hasOverride={!!costHub && s.hubs_with_override.includes(costHub)}
        canEdit={canEdit}
      />
      <AlertRulesCard key={`a-${JSON.stringify(s.alert_rules)}`} rules={s.alert_rules} canEdit={canEdit} canListUsers={can('settings.manage_users')} />
      {canEdit && <ImportCard hubScope={hubScope} />}
    </div>
  );
}

function useSave() {
  const update = useUpdateKitchenSettings();
  const save = (body: object, done: string) => update.mutate(body, { onSuccess: () => toast.success(done), onError: (e) => toast.error(e.message) });
  return { save, saving: update.isPending };
}

function DefaultsCard({ defaults, canEdit }: { defaults: KitchenDefaults; canEdit: boolean }) {
  const [d, setD] = useState(defaults);
  const { save, saving } = useSave();
  const fields: [keyof KitchenDefaults, string, string][] = [
    ['markup_packs', 'Markup: food packs', '%'],
    ['markup_buffet', 'Markup: buffet', '%'],
    ['markup_trays', 'Markup: trays & bowls', '%'],
    ['food_cost_pct', 'Target food cost', '%'],
    ['buffer_pct', 'Cooking buffer on ingredients', '%'],
    ['service_charge_pct', 'Private chef service charge', '%'],
    ['round_to', 'Round prices up to', '₦'],
  ];
  return (
    <Card
      title="Pricing defaults"
      description="Used for every new quote. A job can override its markup."
      footer={canEdit && <SubmitButton type="button" loading={saving} className="h-9 px-4 text-sm" onClick={() => save({ defaults: d }, 'Pricing defaults saved')}>Save</SubmitButton>}
    >
      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, label, suffix]) => (
            <Field key={k} label={label} htmlFor={`d-${k}`}>
              <NumberInput id={`d-${k}`} value={d[k] as number} onChange={(v) => setD({ ...d, [k]: v })} suffix={suffix} />
            </Field>
          ))}
          <Field label="Minimum profit per job (warning)" htmlFor="d-min"><MoneyInput id="d-min" value={d.min_profit_job} onChange={(v) => setD({ ...d, min_profit_job: v })} /></Field>
          <Field label="Cost proteins from our stock at" htmlFor="d-protein">
            <select id="d-protein" className={inputClass} value={d.protein_basis} onChange={(e) => setD({ ...d, protein_basis: e.target.value as 'cost' | 'retail' })}>
              <option value="cost">Purchase cost</option>
              <option value="retail">Fudfarmer retail price</option>
            </select>
          </Field>
        </div>
      ) : (
        <dl className="divide-y">
          {fields.map(([k, label, suffix]) => <ReadValue key={k} label={label} value={suffix === '₦' ? naira(defaults[k] as number) : `${defaults[k]}%`} />)}
          <ReadValue label="Minimum profit per job" value={defaults.min_profit_job ? naira(defaults.min_profit_job) : 'Off'} />
          <ReadValue label="Proteins from our stock" value={defaults.protein_basis === 'retail' ? 'Retail price' : 'Purchase cost'} />
        </dl>
      )}
    </Card>
  );
}

function TimingCard({ defaults, canEdit }: { defaults: KitchenDefaults; canEdit: boolean }) {
  const [d, setD] = useState(defaults);
  const { save, saving } = useSave();
  const fields: [keyof KitchenDefaults, string, string][] = [
    ['ack_minutes', 'Remind if not accepted within', 'min'],
    ['escalate_after_reminders', 'Add kitchen admins after', 'reminders'],
    ['due_soon_minutes', '“Due soon” window', 'min'],
    ['quote_expiry_days', 'Quotes expire after', 'days'],
  ];
  return (
    <Card
      title="Alerts & reminders"
      description="Reminders repeat until someone acts. Quote expiry runs once a day."
      footer={canEdit && <SubmitButton type="button" loading={saving} className="h-9 px-4 text-sm" onClick={() => save({ defaults: d }, 'Reminder settings saved')}>Save</SubmitButton>}
    >
      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, label, suffix]) => (
            <Field key={k} label={label} htmlFor={`t-${k}`}><NumberInput id={`t-${k}`} value={d[k] as number} min={1} onChange={(v) => setD({ ...d, [k]: v })} suffix={suffix.slice(0, 4)} /></Field>
          ))}
        </div>
      ) : (
        <dl className="divide-y">{fields.map(([k, label, suffix]) => <ReadValue key={k} label={label} value={`${defaults[k]} ${suffix}`} />)}</dl>
      )}
    </Card>
  );
}

function RunningCostsCard({ running, source, hubId, setHubId, hubScope, hasOverride, canEdit }: {
  running: RunningCosts | null; source: 'hub' | 'company'; hubId: string; setHubId: (id: string) => void; hubScope: HubScopeFilter; hasOverride: boolean; canEdit: boolean;
}) {
  const [r, setR] = useState<RunningCosts | null>(running);
  const { save, saving } = useSave();
  const rates = useMemo(() => (r ? runningCostRates(r) : null), [r]);
  const hubName = hubScope.activeHubs.find((h) => h.id === hubId)?.name;
  const scopeLabel = hubId ? (hasOverride ? `${hubName}'s own running costs` : `${hubName} uses the company defaults`) : 'Company defaults';

  return (
    <Card
      title="Running costs"
      description="Monthly costs shared across every job, per outlet. An outlet without its own figures uses the company defaults."
      footer={
        canEdit && r && (
          <>
            {hubId && hasOverride && (
              <button type="button" className={btnGhost} disabled={saving} onClick={() => save({ hub_id: hubId, clear_hub_override: true }, `${hubName} now uses the company defaults`)}>Use company defaults</button>
            )}
            <SubmitButton type="button" loading={saving} className="h-9 px-4 text-sm" onClick={() => save({ running_costs: r, ...(hubId ? { hub_id: hubId } : {}) }, hubId ? `Running costs saved for ${hubName}` : 'Company running costs saved')}>
              {hubId && !hasOverride ? `Save for ${hubName}` : 'Save'}
            </SubmitButton>
          </>
        )
      }
    >
      <Field label="Outlet" htmlFor="rc-hub">
        <select id="rc-hub" className={inputClass} value={hubId} onChange={(e) => setHubId(e.target.value)}>
          <option value="">Company defaults</option>
          {hubScope.activeHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </Field>
      <p className="text-xs text-muted-foreground">{scopeLabel}{source === 'company' && hubId && canEdit ? '. Saving creates its own figures.' : '.'}</p>
      {!r ? (
        <p className="text-sm italic text-muted-foreground">Running costs are only shown to people who can see costs.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {RUNNING_COST_ITEMS.map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`rc-${k}`}>
                {canEdit ? <MoneyInput id={`rc-${k}`} value={r[k] as number} onChange={(v) => setR({ ...r, [k]: v })} /> : <p className="text-sm font-medium tabular-nums">{naira(r[k] as number)}</p>}
              </Field>
            ))}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Salaried kitchen staff</h3>
            <div className="space-y-2">
              {r.staff.map((st, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_9rem_auto] items-end gap-2">
                  {canEdit ? (
                    <>
                      <input aria-label="Role" className={inputClass} value={st.role} onChange={(e) => setR({ ...r, staff: r.staff.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} />
                      <NumberInput ariaLabel="People" value={st.people} onChange={(v) => setR({ ...r, staff: r.staff.map((x, j) => (j === i ? { ...x, people: v } : x)) })} />
                      <MoneyInput ariaLabel="Monthly salary each" value={st.monthly} onChange={(v) => setR({ ...r, staff: r.staff.map((x, j) => (j === i ? { ...x, monthly: v } : x)) })} />
                      <button type="button" className={btnGhost} aria-label={`Remove ${st.role}`} onClick={() => setR({ ...r, staff: r.staff.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
                    </>
                  ) : (
                    <p className="col-span-4 flex justify-between text-sm"><span>{st.people} × {st.role}</span><span className="tabular-nums">{naira(st.monthly)} each</span></p>
                  )}
                </div>
              ))}
              {canEdit && <button type="button" className={btnSecondary} onClick={() => setR({ ...r, staff: [...r.staff, { role: '', people: 1, monthly: 0 }] })}><Plus size={14} /> Add role</button>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Share costs" htmlFor="rc-basis">
              {canEdit ? (
                <select id="rc-basis" className={inputClass} value={r.basis} onChange={(e) => setR({ ...r, basis: e.target.value as 'portion' | 'day' })}>
                  <option value="portion">Per portion</option>
                  <option value="day">Per kitchen day</option>
                </select>
              ) : <p className="text-sm font-medium">{r.basis === 'day' ? 'Per kitchen day' : 'Per portion'}</p>}
            </Field>
            <Field label="Portions sold a month" htmlFor="rc-portions">
              {canEdit ? <NumberInput id="rc-portions" value={r.monthly_portions} onChange={(v) => setR({ ...r, monthly_portions: v })} /> : <p className="text-sm font-medium tabular-nums">{r.monthly_portions}</p>}
            </Field>
            <Field label="Kitchen days a month" htmlFor="rc-days">
              {canEdit ? <NumberInput id="rc-days" value={r.kitchen_days} onChange={(v) => setR({ ...r, kitchen_days: v })} /> : <p className="text-sm font-medium tabular-nums">{r.kitchen_days}</p>}
            </Field>
          </div>
          {rates && (
            <div className="rounded-md bg-primary/5 p-4" aria-live="polite">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Each {rates.basis === 'day' ? 'kitchen day' : 'portion'} carries</p>
              <p className="text-2xl font-bold tabular-nums">{rates.divisor > 0 ? naira(rates.per_utilities + rates.per_staff) : '—'}</p>
              <p className="text-sm text-muted-foreground">{naira(rates.total)} a month ({naira(rates.utilities_total)} running costs + {naira(rates.staff_total)} salaries) ÷ {rates.divisor || '—'} {rates.basis === 'day' ? 'days' : 'portions'}</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AlertRulesCard({ rules, canEdit, canListUsers }: { rules: KitchenAlertRule[]; canEdit: boolean; canListUsers: boolean }) {
  const [list, setList] = useState(rules);
  const { save, saving } = useSave();
  const roles = useRoles();
  const agents = useAgents(undefined, { enabled: canEdit && canListUsers });
  const roleOptions = (roles.data ?? []).map((r) => ({ name: r.name, label: r.label || r.name }));
  // Without access to the roles list, show the role name tidied up (finance → Finance).
  const roleLabel = (name?: string) =>
    roleOptions.find((r) => r.name === name)?.label ?? (name ?? '').split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  const userName = (id?: string) => agents.data?.find((a) => a.id === id)?.name ?? 'Named person';
  const recipientText = (r: KitchenAlertRecipient) =>
    r.kind === 'outlet_role' ? `${roleLabel(r.role)} at the outlet` : r.kind === 'company_role' ? `${roleLabel(r.role)} (company-wide)` : r.kind === 'user' ? userName(r.user) : RECIPIENT_LABELS[r.kind];
  const updateRule = (type: KitchenAlertType, patch: Partial<KitchenAlertRule>) => setList((l) => l.map((x) => (x.type === type ? { ...x, ...patch } : x)));

  return (
    <Card
      title="Who gets each alert"
      description="Alerts go to the app, the bell and browser notifications. Recipients can be anyone, not only kitchen staff."
      footer={canEdit && <SubmitButton type="button" loading={saving} className="h-9 px-4 text-sm" onClick={() => save({ alert_rules: list }, 'Alert recipients saved')}>Save</SubmitButton>}
    >
      <ul className="space-y-4">
        {list.map((rule) => (
          <li key={rule.type} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{ALERT_LABELS[rule.type].label}</p>
                <p className="text-xs text-muted-foreground">{ALERT_LABELS[rule.type].when}</p>
              </div>
              {canEdit ? (
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={rule.enabled} onChange={(e) => updateRule(rule.type, { enabled: e.target.checked })} /> On
                </label>
              ) : (
                <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', rule.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground')}>{rule.enabled ? 'On' : 'Off'}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rule.recipients.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                  {recipientText(r)}
                  {canEdit && (
                    <button type="button" aria-label={`Remove ${recipientText(r)}`} onClick={() => updateRule(rule.type, { recipients: rule.recipients.filter((_, j) => j !== i) })}><X size={11} /></button>
                  )}
                </span>
              ))}
              {!rule.recipients.length && <span className="text-xs italic text-muted-foreground">Nobody</span>}
            </div>
            {canEdit && (
              <AddRecipient
                roleOptions={roleOptions}
                users={canListUsers ? (agents.data ?? []).map((a) => ({ id: a.id, name: a.name })) : []}
                onAdd={(r) => updateRule(rule.type, { recipients: [...rule.recipients, r] })}
              />
            )}
            {canEdit && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={rule.exclude_actor} onChange={(e) => updateRule(rule.type, { exclude_actor: e.target.checked })} /> Don&apos;t alert the person who made the change
              </label>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AddRecipient({ roleOptions, users, onAdd }: { roleOptions: { name: string; label: string }[]; users: { id: string; name: string }[]; onAdd: (r: KitchenAlertRecipient) => void }) {
  const [kind, setKind] = useState<KitchenAlertRecipient['kind'] | ''>('');
  const [value, setValue] = useState('');
  const kinds = (Object.keys(RECIPIENT_LABELS) as KitchenAlertRecipient['kind'][]).filter((k) => k !== 'user' || users.length);
  const needsRole = kind === 'outlet_role' || kind === 'company_role';
  const needsUser = kind === 'user';
  const ready = kind && (!needsRole || value) && (!needsUser || value);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select aria-label="Add recipient" className={cn(inputClass, 'h-8 w-auto text-xs')} value={kind} onChange={(e) => { setKind(e.target.value as KitchenAlertRecipient['kind']); setValue(''); }}>
        <option value="">Add recipient…</option>
        {kinds.map((k) => <option key={k} value={k}>{RECIPIENT_LABELS[k]}</option>)}
      </select>
      {needsRole && (
        <select aria-label="Role" className={cn(inputClass, 'h-8 w-auto text-xs')} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Choose role…</option>
          {roleOptions.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
        </select>
      )}
      {needsUser && (
        <select aria-label="Person" className={cn(inputClass, 'h-8 w-auto text-xs')} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Choose person…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      {kind && (
        <button
          type="button"
          className={cn(btnSecondary, 'h-8 px-3 text-xs')}
          disabled={!ready}
          onClick={() => {
            onAdd({ kind: kind as KitchenAlertRecipient['kind'], ...(needsRole ? { role: value } : {}), ...(needsUser ? { user: value } : {}) });
            setKind('');
            setValue('');
          }}
        >
          Add
        </button>
      )}
    </div>
  );
}

function ImportCard({ hubScope }: { hubScope: HubScopeFilter }) {
  const file = useRef<HTMLInputElement>(null);
  const importer = useKitchenImport();
  const [data, setData] = useState<object | null>(null);
  const [fileName, setFileName] = useState('');
  const [hubId, setHubId] = useState('');
  const [summary, setSummary] = useState<KitchenImportSummary | null>(null);

  const run = (dry: boolean) => {
    if (!data) return;
    importer.mutate(
      { data, running_costs_hub_id: hubId || undefined, dry_run: dry },
      {
        onSuccess: (s) => {
          setSummary(s);
          if (!dry) toast.success('Prototype data imported');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Card title="Import prototype data" description="Load ingredients, recipes and settings from the Kitchen Costing prototype's JSON export. Safe to repeat: matching records are updated, not duplicated.">
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const parsed = JSON.parse(await f.text());
            setData(parsed);
            setFileName(f.name);
            setSummary(null);
            importer.mutate(
              { data: parsed, running_costs_hub_id: hubId || undefined, dry_run: true },
              { onSuccess: setSummary, onError: (err) => toast.error(err.message) },
            );
          } catch {
            toast.error('That file is not valid JSON.');
          }
        }}
      />
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className={btnSecondary} onClick={() => file.current?.click()}><Upload size={14} /> Choose file</button>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>
      <Field label="Put the prototype's running costs on" htmlFor="imp-hub">
        <select id="imp-hub" className={inputClass} value={hubId} onChange={(e) => setHubId(e.target.value)}>
          <option value="">Company defaults</option>
          {hubScope.activeHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </Field>
      {summary && (
        <div className="rounded-md border p-4 text-sm" aria-live="polite">
          <p className="font-semibold">{summary.dry_run ? 'This import will:' : 'Imported:'}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Ingredients: {summary.ingredients.created} new, {summary.ingredients.updated} updated</li>
            <li>Recipes: {summary.recipes.created} new, {summary.recipes.updated} updated</li>
            {summary.settings && <li>Pricing defaults from the prototype</li>}
            {summary.running_costs && <li>Running costs for {summary.running_costs === 'hub' ? 'the chosen outlet' : 'the company defaults'}</li>}
            {(summary.skipped.quotes > 0 || summary.skipped.orders > 0) && <li className="text-muted-foreground">Skipped {summary.skipped.orders} orders and {summary.skipped.quotes} quotes (not imported)</li>}
          </ul>
          {!!summary.warnings.length && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">{summary.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
          {summary.dry_run && (
            <SubmitButton type="button" loading={importer.isPending} className="mt-3 h-9 px-4 text-sm" onClick={() => run(false)}>Import now</SubmitButton>
          )}
        </div>
      )}
      {importer.isPending && !summary && <p className="text-sm text-muted-foreground">Checking the file…</p>}
    </Card>
  );
}

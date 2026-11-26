'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useAgents, useCreateCustomer, useCustomer, useHubs, useUpdateCustomer } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import {
  Customer, CustomerType,
  B2B_CATEGORIES, GENDERS, FAMILY_TYPES, MARITAL_STATUSES, AGE_GROUPS,
  LIFESTYLE_TAGS, EMPLOYMENT_STATUSES, RELIGIONS,
} from '@/types';
import { isB2bCustomerType, customerPhoneForApi, customerEmailForApi, optionalStringForApi, isPlaceholderPhone } from '@/lib/customer-helpers';
import { hubOptionLabel } from '@/lib/api-mappers';
import { deriveSegments } from '@/lib/segmentation';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { Input } from '@/components/ui/input';
import { SegmentChips } from './customer-segments';
import { ContactsEditor } from './contacts-editor';
import {
  contactsOf, contactsToIndividual, otherContacts, primaryContact, toApiContacts, validateContacts, validateOtherContacts, withPerson, type CustomerContact,
} from '@/lib/customer-contacts';

/** Display label for the stored B2B / B2C type. */
export const customerTypeLabel = (type?: string) => (isB2bCustomerType(type) ? 'Business' : 'Individual');

const NONE = '__none';
const selectCls = 'h-9 data-[size=default]:h-9 font-normal';

/** An in-app select whose empty choice maps to '' (profile answers are optional). */
function OptionalSelect({ id, value, onChange, options, placeholder = 'Not set' }: Readonly<{ id: string; value?: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string }>) {
  return (
    <FilterSelect
      id={id}
      value={value || NONE}
      onChange={(v) => onChange(v === NONE ? '' : v)}
      className={selectCls}
      options={[{ value: NONE, label: placeholder }, ...options.map((o) => ({ value: o, label: o }))]}
    />
  );
}

/** The optional profile questions (business category, or the consumer profile). */
export function ProfileFields({ type, data, onChange }: Readonly<{
  type: CustomerType;
  data: Partial<Customer>;
  onChange: (patch: Partial<Customer>) => void;
}>) {
  const id = useId();
  if (type === CustomerType.B2B) {
    return (
      <FormField label="Business category" htmlFor={`${id}-cat`}>
        <OptionalSelect id={`${id}-cat`} value={data.businessCategory} onChange={(v) => onChange({ businessCategory: v })} options={B2B_CATEGORIES} />
      </FormField>
    );
  }
  const selects: { key: keyof Customer; label: string; options: readonly string[] }[] = [
    { key: 'gender', label: 'Gender', options: GENDERS },
    { key: 'familyType', label: 'Family type', options: FAMILY_TYPES },
    { key: 'maritalStatus', label: 'Marital status', options: MARITAL_STATUSES },
    { key: 'ageGroup', label: 'Age group', options: AGE_GROUPS },
    { key: 'lifestyle', label: 'Lifestyle and health', options: LIFESTYLE_TAGS },
    { key: 'employmentStatus', label: 'Employment status', options: EMPLOYMENT_STATUSES },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {selects.map((s) => (
        <FormField key={s.key} label={s.label} htmlFor={`${id}-${s.key}`}>
          <OptionalSelect id={`${id}-${s.key}`} value={data[s.key] as string | undefined} onChange={(v) => onChange({ [s.key]: v })} options={s.options} />
        </FormField>
      ))}
      <FormField label="Job type or occupation" htmlFor={`${id}-job`}>
        <input id={`${id}-job`} type="text" value={data.jobType || ''} onChange={(e) => onChange({ jobType: e.target.value })} placeholder="e.g. Trader, Teacher" className={fieldClass} />
      </FormField>
      <FormField label="Religion" htmlFor={`${id}-religion`}>
        <OptionalSelect id={`${id}-religion`} value={data.religion} onChange={(v) => onChange({ religion: v })} options={RELIGIONS} />
      </FormField>
    </div>
  );
}

export function clearOppositeProfileFields(type: CustomerType): Partial<Customer> {
  if (type === CustomerType.B2B) {
    return {
      gender: undefined,
      familyType: undefined,
      maritalStatus: undefined,
      ageGroup: undefined,
      lifestyle: undefined,
      employmentStatus: undefined,
      jobType: undefined,
      religion: undefined,
    };
  }
  return { businessCategory: undefined };
}

type CustomerFormSheetProps = Readonly<{
  /** Omit to add a new customer; pass to edit it. */
  customer?: Customer;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
  /** Loaded customers, used to warn about a duplicate email when adding. */
  existingCustomers?: Customer[];
}>;

/** Add or edit a customer: the essentials first, profile questions collapsed. */
export function CustomerFormSheet({ customer, onClose, onSaved, existingCustomers = [] }: CustomerFormSheetProps) {
  const isEdit = !!customer;
  const id = useId();
  const { isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);
  const { data: agents = [] } = useAgents(undefined, { enabled: !isEdit && isAdmin });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [form, setForm] = useState<Partial<Customer>>(() =>
    customer
      ? { ...customer }
      : { name: '', email: '', phone: '', companyName: '', type: CustomerType.B2C, location: hubScope.hubName || hubScope.defaultHubName || activeHubs[0]?.name || 'Lagos', totalOrders: 0, totalSpent: 0 },
  );
  const patch = (p: Partial<Customer>) => setForm((f) => ({ ...f, ...p }));
  const isB2b = isB2bCustomerType(form.type);
  // A customer's people. A business's primary contact is saved as the customer's own name, phone and
  // email; an individual is their own primary, and the rest are their other contacts.
  const [contacts, setContacts] = useState<CustomerContact[]>(() => (customer ? contactsOf(customer) : []));
  const wasBusiness = isB2bCustomerType(customer?.type);
  // The list row may not carry contacts: load the customer itself and take its contacts, unless
  // the person has already started editing them.
  const [contactsTouched, setContactsTouched] = useState(false);
  const { data: fresh } = useCustomer(isEdit ? customer.id : null);
  const [syncedFrom, setSyncedFrom] = useState<Customer | null>(null);
  if (fresh && fresh !== syncedFrom && !contactsTouched) {
    setSyncedFrom(fresh);
    setContacts(contactsOf(fresh));
  }
  const editContacts = (next: CustomerContact[]) => { setContactsTouched(true); setContacts(next); };
  const primary = primaryContact(contacts);
  const others = otherContacts(contacts);
  const person = { name: form.name ?? '', phone: form.phone === 'N/A' ? '' : form.phone ?? '', email: form.email };
  // Older businesses saved without a phone stay editable, as older individuals do.
  const contactsProblem = isB2b ? validateContacts(contacts, { legacyMayLackPhone: isEdit }) : validateOtherContacts(others, person.phone);
  // Switching type keeps everyone: the individual becomes the business's primary contact, and back.
  const changeType = (type: CustomerType) => {
    if (type === CustomerType.B2B && !isB2b) editContacts(withPerson(contacts, person));
    if (type === CustomerType.B2C && isB2b) patch(contactsToIndividual(contacts));
    patch({ type, companyName: type === CustomerType.B2C ? '' : form.companyName, ...clearOppositeProfileFields(type) });
  };
  /** Name, phone, email and contacts as the API takes them: from the primary contact for a business. */
  const identityPayload = () => (isB2b
    ? {
      customer_name: primary?.name.trim() ?? '',
      customer_phone: customerPhoneForApi(primary?.phone),
      customer_email: customerEmailForApi(primary?.email) ?? '',
      contacts: toApiContacts(contacts),
      // Editing sends an empty address to clear it; a new customer leaves it out.
      business_address: isEdit ? (form.businessAddress?.trim() ?? '') : optionalStringForApi(form.businessAddress),
    }
    : {
      customer_name: form.name ?? '',
      customer_phone: customerPhoneForApi(form.phone),
      customer_email: customerEmailForApi(form.email) ?? '',
      // The individual first, as primary, then their other contacts. With none, an empty list clears any saved.
      ...(others.length
        ? { contacts: toApiContacts(withPerson(contacts, person)) }
        : wasBusiness || (customer?.contacts?.length ?? 0) > 0 ? { contacts: [] } : {}),
    });
  // Hubs may load after the form opens: fall back to a real option rather than a stale default.
  const hubNames = activeHubs.map((h) => h.name);
  const hubValue = [form.location, hubScope.hubName, hubScope.defaultHubName, hubNames[0]].find((n) => n && (hubNames.length === 0 || hubNames.includes(n))) ?? '';

  // Phone is required for new customers; older records imported without one stay editable.
  const disabledReason = isB2b
    ? (!form.companyName?.trim() ? 'Enter the company name' : contactsProblem)
    : !form.name?.trim()
      ? 'Enter a name'
      : !isEdit && isPlaceholderPhone(form.phone)
        ? 'Enter a phone number'
        : null;

  const profilePayload = () => ({
    business_category: isB2b ? optionalStringForApi(form.businessCategory) : undefined,
    gender: !isB2b ? optionalStringForApi(form.gender) : undefined,
    family_type: !isB2b ? optionalStringForApi(form.familyType) : undefined,
    marital_status: !isB2b ? optionalStringForApi(form.maritalStatus) : undefined,
    age_group: !isB2b ? optionalStringForApi(form.ageGroup) : undefined,
    lifestyle: !isB2b ? optionalStringForApi(form.lifestyle) : undefined,
    employment_status: !isB2b ? optionalStringForApi(form.employmentStatus) : undefined,
    job_type: !isB2b ? optionalStringForApi(form.jobType) : undefined,
    religion: !isB2b ? optionalStringForApi(form.religion) : undefined,
  });

  const handleCreate = () => {
    if (isB2b && !form.companyName?.trim()) { toast.error('Company name is required for B2B customers.'); return; }
    if (contactsProblem) { toast.error(contactsProblem); return; }
    if (!isB2b && !form.name?.trim()) { toast.error('Please enter a name.'); return; }
    const email = customerEmailForApi(isB2b ? primary?.email : form.email);
    if (email) {
      const dup = existingCustomers.find((c) => c.email && c.email.toLowerCase() === email);
      if (dup) { toast.error(`A customer with email "${email}" already exists.`); return; }
    }
    const hub = activeHubs.find((h) => h.name === hubValue);
    createCustomer.mutate({
      ...identityPayload(),
      // A new customer with no email sends none, not an empty one.
      customer_email: email,
      customer_type: form.type as CustomerType,
      customer_location: hub?.id || activeHubs[0]?.id || '',
      company_name: form.companyName,
      ...(isAdmin ? { assigned_agent: optionalStringForApi(form.addedByAgentId) } : {}),
      ...profilePayload(),
    }, {
      onSuccess: (created) => {
        toast.success('Customer added.');
        onSaved?.(created);
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleUpdate = () => {
    if (!customer) return;
    if (isB2b && !form.companyName?.trim()) { toast.error('Company name is required for B2B customers.'); return; }
    if (contactsProblem) { toast.error(contactsProblem); return; }
    if (!isB2b && !form.name?.trim()) { toast.error('Name is required.'); return; }
    const hub = activeHubs.find((h) => h.name === hubValue);
    updateCustomer.mutate({
      id: customer.id,
      ...identityPayload(),
      customer_type: form.type,
      customer_location: hub?.id,
      company_name: form.companyName,
      ...profilePayload(),
    }, {
      onSuccess: (updated) => {
        onSaved?.(updated);
        toast.success('Customer updated.');
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const segmentPreview = deriveSegments({ ...(customer ?? {}), ...form, id: customer?.id ?? 'preview', segments: [], totalOrders: form.totalOrders || 0, totalSpent: form.totalSpent || 0 } as Customer);

  return (
    <FormSheet
      title={isEdit ? 'Edit customer' : 'Add customer'}
      onClose={onClose}
      onSubmit={isEdit ? handleUpdate : handleCreate}
      submitLabel={isEdit ? 'Save changes' : 'Save customer'}
      disabledReason={disabledReason}
      submitting={createCustomer.isPending || updateCustomer.isPending}
    >
      <FormSection title="Customer">
        {!isB2b && (
          <>
            <FormField label="Full name" htmlFor={`${id}-name`} required>
              <input id={`${id}-name`} type="text" autoComplete="off" value={form.name || ''} onChange={(e) => patch({ name: e.target.value })} className={fieldClass} />
            </FormField>
            <FormField label="Phone" htmlFor={`${id}-phone`} required={!isEdit}>
              <input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="off" value={form.phone === 'N/A' ? '' : form.phone || ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="e.g. 0803 123 4567" className={fieldClass} />
            </FormField>
          </>
        )}
        <FormField label="Type" htmlFor={`${id}-type`}>
          <FilterSelect
            id={`${id}-type`}
            value={form.type || CustomerType.B2C}
            onChange={(v) => changeType(v as CustomerType)}
            className={selectCls}
            options={[{ value: CustomerType.B2C, label: 'Individual' }, { value: CustomerType.B2B, label: 'Business' }]}
          />
        </FormField>
        {isB2b && (
          <FormField label="Company" htmlFor={`${id}-company`} required>
            <input id={`${id}-company`} type="text" value={form.companyName || ''} onChange={(e) => patch({ companyName: e.target.value })} className={fieldClass} />
          </FormField>
        )}
        {isB2b && (
          <FormField label="Business address" htmlFor={`${id}-address`} hint="Optional">
            <Input id={`${id}-address`} type="text" autoComplete="off" value={form.businessAddress || ''} onChange={(e) => patch({ businessAddress: e.target.value })} />
          </FormField>
        )}
        <FormField label="Hub" htmlFor={`${id}-hub`}>
          {activeHubs.length > 0 ? (
            <FilterSelect id={`${id}-hub`} value={hubValue} onChange={(v) => patch({ location: v })} className={selectCls} options={activeHubs.map((h) => ({ value: h.name, label: hubOptionLabel(h) }))} />
          ) : (
            <input id={`${id}-hub`} type="text" value={hubValue} disabled className={fieldClass} />
          )}
        </FormField>
        {!isB2b && (
          <FormField label="Email" htmlFor={`${id}-email`} hint="Optional">
            <input id={`${id}-email`} type="email" autoComplete="off" value={form.email || ''} onChange={(e) => patch({ email: e.target.value })} className={fieldClass} />
          </FormField>
        )}
        {!isEdit && isAdmin && (
          <FormField label="Assigned agent" htmlFor={`${id}-agent`}>
            <FilterSelect
              id={`${id}-agent`}
              value={form.addedByAgentId || NONE}
              onChange={(v) => patch({ addedByAgentId: v === NONE ? '' : v })}
              className={selectCls}
              options={[{ value: NONE, label: 'Not assigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
            />
          </FormField>
        )}
      </FormSection>

      {isB2b ? (
        <FormSection title="Contacts" description="The people you deal with. The primary contact is who the business is listed under.">
          <ContactsEditor contacts={contacts} onChange={editContacts} idPrefix={id} />
        </FormSection>
      ) : (
        <FormSection title="Other contacts" description="People you can also reach about this customer, such as a spouse or a driver." optional defaultOpen={others.length > 0}>
          <ContactsEditor
            mode="others"
            contacts={others}
            onChange={(next) => editContacts([...contacts.filter((c) => c.isPrimary), ...next])}
            idPrefix={id}
          />
        </FormSection>
      )}

      <FormSection title="Profile" description={isB2b ? 'Business category, used for segments.' : 'Answers used to build segments.'} optional>
        <ProfileFields type={(form.type as CustomerType) || CustomerType.B2C} data={form} onChange={patch} />
        <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">Segments from this profile</p>
          {segmentPreview.length > 0 ? <SegmentChips segments={segmentPreview} /> : <p className="text-xs text-muted-foreground">Answer a few questions to generate segments.</p>}
        </div>
      </FormSection>
    </FormSheet>
  );
}

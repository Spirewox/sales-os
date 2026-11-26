'use client';

import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, StatusBadge } from '@/components/app';
import {
  MAX_CONTACTS, addContact, removeContact, setPrimary, type CustomerContact,
} from '@/lib/customer-contacts';

const ROLE_SUGGESTIONS = {
  business: ['Owner', 'Buyer', 'Accounts', 'Manager', 'Driver'],
  others: ['Spouse', 'Family', 'Driver', 'Assistant', 'Housekeeper'],
};

/**
 * The people at a business customer: name, role, WhatsApp number and email for each, one of them
 * primary. The primary is the customer's own name and phone everywhere else in the app.
 * In `others` mode it edits an individual's other contacts: none is primary (the individual is), and
 * the list may be empty.
 */
export function ContactsEditor({ contacts, onChange, idPrefix, mode = 'business' }: Readonly<{
  contacts: CustomerContact[];
  onChange: (next: CustomerContact[]) => void;
  idPrefix: string;
  mode?: 'business' | 'others';
}>) {
  const others = mode === 'others';
  const update = (id: string, patch: Partial<CustomerContact>) => onChange(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // Removing a contact takes its button away: move focus to Add contact so keyboard users keep their place.
  const addRef = useRef<HTMLButtonElement>(null);
  const remove = (id: string) => { onChange(removeContact(contacts, id)); requestAnimationFrame(() => addRef.current?.focus()); };
  const rolesId = `${idPrefix}-contact-roles`;

  return (
    <div className="space-y-3">
      <datalist id={rolesId}>{ROLE_SUGGESTIONS[mode].map((r) => <option key={r} value={r} />)}</datalist>
      {contacts.map((c, i) => {
        const fid = `${idPrefix}-contact-${i}`;
        return (
          <div key={c.id} role="group" aria-label={`Contact ${i + 1}${c.name.trim() ? `, ${c.name.trim()}` : ''}${c.isPrimary ? ', primary' : ''}`} className="space-y-3 rounded-md border p-3">
            <div className="flex min-h-8 items-center justify-between gap-2">
              {others ? (
                <span className="text-xs font-medium text-muted-foreground">Contact {i + 1}</span>
              ) : c.isPrimary ? (
                <StatusBadge tone="good">Primary</StatusBadge>
              ) : (
                <Button type="button" variant="ghost" size="xs" aria-label={`Make ${c.name.trim() || `contact ${i + 1}`} primary`} onClick={() => onChange(setPrimary(contacts, c.id))}>Make primary</Button>
              )}
              {(others || contacts.length > 1) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${c.name.trim() || 'this contact'}`}
                  onClick={() => remove(c.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Name" htmlFor={`${fid}-name`} required>
                <Input id={`${fid}-name`} type="text" autoComplete="off" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} />
              </FormField>
              <FormField label="Role" htmlFor={`${fid}-role`} hint="Optional">
                <Input id={`${fid}-role`} type="text" list={rolesId} maxLength={40} autoComplete="off" value={c.role ?? ''} onChange={(e) => update(c.id, { role: e.target.value })} />
              </FormField>
              <FormField label="WhatsApp number" htmlFor={`${fid}-phone`} required>
                <Input id={`${fid}-phone`} type="tel" inputMode="tel" autoComplete="off" placeholder="e.g. 0803 123 4567" value={c.phone} onChange={(e) => update(c.id, { phone: e.target.value })} />
              </FormField>
              <FormField label="Email" htmlFor={`${fid}-email`} hint="Optional">
                <Input id={`${fid}-email`} type="email" autoComplete="off" value={c.email ?? ''} onChange={(e) => update(c.id, { email: e.target.value })} />
              </FormField>
            </div>
          </div>
        );
      })}
      <Button ref={addRef} type="button" variant="ghost" size="sm" disabled={contacts.length >= MAX_CONTACTS} onClick={() => onChange(addContact(contacts, others ? { primary: false } : {}))}>
        <Plus aria-hidden /> Add contact
      </Button>
    </div>
  );
}

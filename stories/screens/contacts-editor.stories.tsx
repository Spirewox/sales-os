import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { ContactsEditor } from '@/app/(app)/customers/contacts-editor';
import { validateContacts, type CustomerContact } from '@/lib/customer-contacts';

/** Holds the list so the story can be edited like the real form; shows the form's message under it. */
function Editable({ initial }: Readonly<{ initial: CustomerContact[] }>) {
  const [contacts, setContacts] = useState(initial);
  const problem = validateContacts(contacts);
  return (
    <div className="max-w-xl space-y-3">
      <ContactsEditor contacts={contacts} onChange={setContacts} idPrefix="story" />
      <p className="text-xs text-muted-foreground">{problem ?? 'Ready to save.'}</p>
    </div>
  );
}

const meta: Meta<typeof Editable> = {
  title: 'Screens/Customer contacts editor',
  component: Editable,
};
export default meta;
type Story = StoryObj<typeof Editable>;

const owner: CustomerContact = { id: 'c1', name: 'Bisi Ade', role: 'Owner', phone: '0803 123 4567', email: 'bisi@mamaput.ng', isPrimary: true };

export const OneContact: Story = { args: { initial: [owner] } };

export const ThreeContacts: Story = {
  args: {
    initial: [
      owner,
      { id: 'c2', name: 'Femi Ojo', role: 'Accounts', phone: '0812 555 0101', isPrimary: false },
      { id: 'c3', name: 'Halima Sani', role: 'Buyer', phone: '0909 222 3344', isPrimary: false },
    ],
  },
};

/** The same number written two ways: the form says it is listed twice and will not save. */
export const DuplicatePhone: Story = {
  args: { initial: [owner, { id: 'c2', name: 'Femi Ojo', role: 'Accounts', phone: '+2348031234567', isPrimary: false }] },
};

export const Empty: Story = { args: { initial: [] } };

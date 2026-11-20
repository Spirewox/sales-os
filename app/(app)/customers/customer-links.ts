import type { Customer } from '@/types';
import { isB2bCustomerType, isPlaceholderPhone } from '@/lib/customer-helpers';

/** Business customers lead with the company; individuals with their name. */
export function customerTitle(c: Pick<Customer, 'name' | 'companyName' | 'type'>) {
  const company = c.companyName?.trim();
  if (isB2bCustomerType(c.type) && company) return { primary: company, secondary: c.name };
  return { primary: c.name, secondary: company || undefined };
}

export function hasPhone(phone?: string | null): phone is string {
  return !!phone && !isPlaceholderPhone(phone);
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** wa.me wants digits only, with the country code: a local 0803... becomes 234803... */
export function whatsappHref(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = `234${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export const recordSaleHref = (customerId: string) => `/sales?new=1&customer=${encodeURIComponent(customerId)}`;
export const creditHref = (customerId: string) => `/credits?customer=${encodeURIComponent(customerId)}`;
export const saleHref = (saleId: string) => `/sales?sale=${encodeURIComponent(saleId)}`;
/** Opens Log feedback in Engagement with this customer preselected. */
export const logFeedbackHref = (customerId: string) => `/engagement?tab=interactions&new=feedback&customer=${encodeURIComponent(customerId)}`;

const PLACEHOLDER_EMAILS = new Set(['', 'n/a', 'na', '-', 'none', 'nil']);

export type ApiCustomerType = 'b2c' | 'b2b';

export function isPlaceholderEmail(email?: string | null): boolean {
  return PLACEHOLDER_EMAILS.has((email ?? '').trim().toLowerCase());
}

/** Omit empty/placeholder emails from API payloads. */
export function customerEmailForApi(email?: string | null): string | undefined {
  const trimmed = (email ?? '').trim();
  if (isPlaceholderEmail(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

/** Backend expects lowercase b2c / b2b; UI uses B2C / B2B. */
export function customerTypeToApi(type?: string | null): ApiCustomerType {
  return String(type ?? '').toLowerCase() === 'b2b' ? 'b2b' : 'b2c';
}

/** Map API customer_type to display enum values B2C / B2B. */
export function customerTypeFromApi(type?: string | null): 'B2C' | 'B2B' {
  return customerTypeToApi(type) === 'b2b' ? 'B2B' : 'B2C';
}

export function isB2bCustomerType(type?: string | null): boolean {
  return customerTypeToApi(type) === 'b2b';
}

/** B2C must omit company_name; B2B requires it when provided to API. */
const PLACEHOLDER_PHONES = new Set(['', 'n/a', 'na', '-', 'none', 'nil', '0000000000']);

export function isPlaceholderPhone(phone?: string | null): boolean {
  return PLACEHOLDER_PHONES.has((phone ?? '').trim().toLowerCase());
}

export function customerPhoneForApi(phone?: string | null): string {
  const trimmed = (phone ?? '').trim();
  return isPlaceholderPhone(trimmed) ? 'N/A' : trimmed;
}

/** Empty / "-- Select --" style values must be omitted so @IsOptional + @IsIn pass. */
export function optionalStringForApi(value?: string | null): string | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === '-- Select --') return undefined;
  return trimmed;
}

export function customerCompanyNameForApi(
  customerType: string | undefined,
  companyName?: string | null,
): { company_name?: string } {
  if (!isB2bCustomerType(customerType)) return {};
  const trimmed = (companyName ?? '').trim();
  return trimmed ? { company_name: trimmed } : {};
}

export function customerMatchesSearch(customer: { name: string; email?: string; companyName?: string; type?: string; location?: string }, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return (
    customer.name.toLowerCase().includes(term)
    || (customer.email?.toLowerCase().includes(term) ?? false)
    || (customer.companyName?.toLowerCase().includes(term) ?? false)
    || (customer.type?.toLowerCase().includes(term) ?? false)
    || (customer.location?.toLowerCase().includes(term) ?? false)
  );
}

export function customerOptionLabel(customer: { name: string; type?: string; location?: string }): string {
  if (customer.location) return `${customer.name} - ${customer.location}`;
  return customer.type ? `${customer.name} (${customer.type})` : customer.name;
}

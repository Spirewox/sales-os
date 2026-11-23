'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Customer } from '@/types';
import { customerMatchesSearch, customerOptionLabel } from '@/lib/customer-helpers';
import { cn } from '@/lib/utils';

export interface SearchableCustomerSelectProps {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  error?: boolean;
  inputClassName?: string;
  id?: string;
  placeholder?: string;
  serverSearch?: boolean;
  onSearchChange?: (query: string) => void;
}

export function SearchableCustomerSelect({
  customers,
  value,
  onChange,
  error = false,
  inputClassName = '',
  id,
  placeholder = 'Search customers by name, email, or company...',
  serverSearch = false,
  onSearchChange,
}: SearchableCustomerSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value],
  );

  const filteredCustomers = useMemo(
    () => (serverSearch ? customers : customers.filter((c) => customerMatchesSearch(c, query))),
    [customers, query, serverSearch],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const displayValue = open ? query : (selectedCustomer ? customerOptionLabel(selectedCustomer) : '');

  const selectCustomer = (customer: Customer) => {
    onChange(customer.id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const clearSelection = () => {
    onChange('');
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (event.key === 'Enter' && open && filteredCustomers.length > 0) {
      event.preventDefault();
      selectCustomer(filteredCustomers[0]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (serverSearch) onSearchChange?.(next);
            if (value) onChange('');
          }}
          onFocus={() => {
            setOpen(true);
            if (selectedCustomer && !query) setQuery('');
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
            error && 'border-destructive',
            inputClassName,
          )}
        />
        {value && !open && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear customer selection"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-popover py-1 text-sm shadow-md"
        >
          {filteredCustomers.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">No customers match your search.</li>
          ) : (
            filteredCustomers.map((customer) => (
              <li key={customer.id} role="option" aria-selected={customer.id === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCustomer(customer)}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted',
                    customer.id === value && 'bg-muted',
                  )}
                >
                  <span className="font-medium">{customerOptionLabel(customer)}</span>
                  {(customer.email || customer.companyName || customer.location) && (
                    <span className="text-xs text-muted-foreground">
                      {[customer.email, customer.companyName, customer.location].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type FilterOption = { value: string; label: string };

/** In-app dropdown. Native selects open a white system menu in dark mode. */
export function FilterSelect({
  id,
  value,
  onChange,
  options,
  icon,
  className = '',
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={value}
      items={options}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={`h-10 w-full rounded-md bg-background px-3 font-medium shadow-none data-[size=default]:h-10 ${className}`}
      >
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

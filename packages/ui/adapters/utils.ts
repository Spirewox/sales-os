import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Package-only copy of the app's `cn` (lib/utils.ts), without the app's user helpers. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

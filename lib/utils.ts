import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiUser, AppUser } from '@/types/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function formatRoleSlug(name?: string): string | null {
  if (!name) return null;
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Human-readable role from whoami / user API role object. */
export function resolveUserRoleLabel(role?: { label?: string; name?: string } | null): string {
  const label = role?.label?.trim();
  if (label) return label;
  return formatRoleSlug(role?.name) ?? 'User';
}

export function mapApiUser(u: ApiUser): AppUser {
  const hubName = u.hub?.name ?? null;
  return {
    id: u._id,
    visibleHubIds: u.visible_hub_ids,
    name: u.full_name,
    email: u.email,
    phone: u.phone,
    is_active: u.is_active,
    hubId: u.hub?._id ?? null,
    hubName,
    location: hubName ?? 'All Hubs',
    dataScope: u.data_scope,
    role: resolveUserRoleLabel(u.role),
    roleName: u.role?.name ?? '',
    permissions: u.permissions,
  };
}

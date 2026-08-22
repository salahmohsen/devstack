import { MEMBER_ROLE, SUPER_ADMIN_ROLE } from "#@/admin/constants";
import { type UserRole } from "#@/admin/types";

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === SUPER_ADMIN_ROLE;
}

export function parseUserRole(role: string | null | undefined): UserRole {
  return role === SUPER_ADMIN_ROLE ? SUPER_ADMIN_ROLE : MEMBER_ROLE;
}

export function formatUserRole(role: UserRole): string {
  return role === SUPER_ADMIN_ROLE ? "Super admin" : "Member";
}

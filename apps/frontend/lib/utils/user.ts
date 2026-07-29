import { User } from "@/types";
import { UserRole } from "@/types/enums";

export const initials = (u: User | undefined) => {
  if (!u) return "";
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
};

export const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

export const isAdminRole = (role?: string) =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

export function getNonAdminMemberIds(users: User[], ids: string[]) {
  return ids.filter((id) => !isAdminRole(users.find((u) => u.id === id)?.role));
}

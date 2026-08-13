import { User } from "@/types";
import { UserRole } from "@/types/enums";

export const initials = (u: User | null) => {
  if (!u) return "";
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
};

export const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

export const hasManagerAccess = (role?: string) =>
  role === UserRole.MANAGER || role === UserRole.OWNER;

export function getNonAdminMemberIds(users: User[], ids: string[]) {
  return ids.filter(
    (id) => !hasManagerAccess(users.find((u) => u.id === id)?.role),
  );
}

import { ProjectState, User } from "@/types";
import { UserRole } from "@/types/enums";

export const initials = (u: User) =>
  `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();

export const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

export const isAdminRole = (role?: string) =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

export function getNonAdminMemberIds(users: User[], ids: string[]) {
  return ids.filter((id) => !isAdminRole(users.find((u) => u.id === id)?.role));
}

export type FormErrors = Partial<Record<keyof ProjectState, string>>;

export function validate(state: ProjectState): FormErrors {
  const errors: FormErrors = {};
  if (!state.name.trim()) errors.name = "Name is required";
  else if (state.name.trim().length < 3)
    errors.name = "Name must be at least 3 characters";
  if (state.estimate < 1) errors.estimate = "Estimate must be at least 1h";
  return errors;
}

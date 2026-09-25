import { AvatarUser, User } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";

export const initials = (u: User | AvatarUser | null) => {
  if (!u) return "";
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
};

export const fullName = (u: User | AvatarUser) =>
  `${u.firstName} ${u.lastName}`;

export const hasManagerAccess = (role?: string) =>
  role === UserRole.MANAGER || role === UserRole.OWNER;

export const isArchivedUser = (user: { status?: UserStatus }) =>
  user.status === UserStatus.DEACTIVATED;

/**
 * Whether the viewer may create, edit and delete someone's time entries.
 * Write access follows what the viewer can already see, so anyone whose row
 * reaches the team grid is also someone they may correct; everyone else only
 * ever edits their own. The backend enforces the same rule.
 */
export const canWriteTimeLogsFor = (
  role: string | undefined,
  viewerId: string,
  targetUserId: string,
) => hasManagerAccess(role) || viewerId === targetUserId;

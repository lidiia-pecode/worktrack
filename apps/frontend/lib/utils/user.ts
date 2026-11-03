import { AvatarUser, ClosedSpell, User, UserName } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";

import { formatDayMonthYearLabel, isoDateInTimeZone } from "./date";

export const initials = (u: User | AvatarUser | null) => {
  if (!u) return "";
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
};

export const fullName = (u: User | AvatarUser) =>
  `${u.firstName} ${u.lastName}`;

type AuthoredRecord = {
  userId: string;
  createdBy?: UserName | null;
  updatedBy?: UserName | null;
};

/**
 * Who else added or last changed someone's time entry or absence, or null
 * when only the person did (or it predates the record being kept).
 */
export const changedByText = ({
  userId,
  createdBy,
  updatedBy,
}: AuthoredRecord) => {
  const addedBy = createdBy?.id !== userId ? createdBy : null;
  const changedBy = updatedBy?.id !== userId ? updatedBy : null;

  if (addedBy && changedBy) {
    return addedBy.id === changedBy.id
      ? `Added and changed by ${fullName(addedBy)}`
      : `Added by ${fullName(addedBy)} · changed by ${fullName(changedBy)}`;
  }
  if (addedBy) return `Added by ${fullName(addedBy)}`;
  if (changedBy) return `Changed by ${fullName(changedBy)}`;
  return null;
};

export const hasManagerAccess = (role?: string) =>
  role === UserRole.MANAGER || role === UserRole.OWNER;

/** Activities and categories classify everyone's time, so only the owner changes them. */
export const canManageCatalogue = (role?: string) => role === UserRole.OWNER;

/** Archiving a project reaches everyone on it, so only the owner archives or restores one. */
export const canArchiveProjects = (role?: string) => role === UserRole.OWNER;

export const isDeactivatedUser = (user: { status?: UserStatus }) =>
  user.status === UserStatus.DEACTIVATED;

/** The day they were deactivated in the company's time zone, such as "12 Oct 2026". */
export const deactivatedOnLabel = (
  user: Pick<User, "deactivatedAt">,
  timeZone?: string,
) =>
  user.deactivatedAt
    ? formatDayMonthYearLabel(
        isoDateInTimeZone(new Date(user.deactivatedAt), timeZone),
      )
    : null;

/** Whether a day falls in one of a row's closed spells, as the API refuses it. */
export const isClosedOn = (spells: ClosedSpell[], date: string) =>
  spells.some(
    (spell) =>
      spell.from <= date && (spell.until === null || date < spell.until),
  );

/**
 * Whether the viewer may create, edit and delete someone's time entries.
 * Write access follows what the viewer can already see, so anyone whose row
 * reaches the team grid is also someone they may correct; everyone else only
 * ever edits their own. The backend enforces the same rule; it refuses a row's
 * closed days (`isClosedOn`), which the caller checks.
 */
export const canWriteTimeLogsFor = (
  role: string | undefined,
  viewerId: string,
  targetUserId: string,
) => hasManagerAccess(role) || viewerId === targetUserId;

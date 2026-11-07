import { PaginatedResponse, ProjectRef, SearchablePaginationParams } from ".";
import { AbsenceType, TeamRole, UserRole, UserStatus } from "./enums";

export interface User {
  id: string;
  companyId: string;
  role: UserRole;
  status: UserStatus;
  position?: string | null;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  googleLinked: boolean;
  hasPassword: boolean;
  /** While deactivated, their last working day. */
  lastWorkingDay: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What deactivating someone with a given last working day deletes. */
export interface DeactivationImpact {
  time: {
    entryCount: number;
    minutes: number;
    firstDate: string | null;
    lastDate: string | null;
  };
  absences: {
    id: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    /** It starts on or before the last working day, so it is shortened. */
    isCut: boolean;
  }[];
  plans: {
    projectId: string;
    projectName: string;
    planCount: number;
    firstDate: string;
    lastDate: string;
  }[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  position?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/** The person's one team now, among those the viewer can see, and their role in it. */
export interface UserTeam {
  id: string;
  name: string;
  roleInTeam: TeamRole;
  joinedAt: string;
}

export interface UserListItem extends User {
  team: UserTeam | null;
  /** Active projects only. */
  projectsCount: number;
  /** Today's capacity; sent to an owner only. */
  weeklyMinutes?: number;
}

export type UserListResponse = PaginatedResponse<UserListItem>;

/**
 * Who can be put on a team or project. Narrower than `User` because the API
 * sends less: this list exists only so someone can pick a name.
 */
export interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  /** A project keeps archived members, so its list has to say which. */
  status: UserStatus;
  position?: string | null;
  avatarUrl?: string | null;
  /** So a picker can say where a move takes them from, and who leads a team. */
  team: UserTeam | null;
}

export type AssignableUserListResponse = PaginatedResponse<AssignableUser>;

export interface UsersQuery extends SearchablePaginationParams {
  status?: UserStatus;
}

export interface AssignableUsersQuery extends UsersQuery {
  roles?: UserRole[];
  /** Only people in no team now. */
  noTeam?: boolean;
}

export interface UserDetails extends User {
  projects: ProjectRef[];
  team: UserTeam | null;
}

/** Just enough to name someone, such as who added or changed a record. */
export type UserName = Pick<User, "id" | "firstName" | "lastName">;

export type AvatarUser = Pick<User, "firstName" | "lastName"> & {
  avatarUrl?: string | null;
};

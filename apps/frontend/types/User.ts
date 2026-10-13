import { PaginatedResponse, ProjectRef, SearchablePaginationParams } from ".";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "./enums";

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
  createdAt: string;
  updatedAt: string;
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

export interface UserTeam {
  id: string;
  name: string;
}

export interface UserListItem extends User {
  /** Open memberships in active teams the viewer can see. */
  teams: UserTeam[];
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
}

export type AssignableUserListResponse = PaginatedResponse<AssignableUser>;

export interface UsersQuery extends SearchablePaginationParams {
  status?: UserStatus;
}

export interface AssignableUsersQuery extends UsersQuery {
  role?: UserRole;
}

export interface UserTeamMembership extends UserTeam {
  status: TeamStatus;
  roleInTeam: TeamRole;
  joinedAt: string;
}

export interface UserDetails extends User {
  projects: ProjectRef[];
  /** Open memberships in active teams the viewer can see. */
  teams: UserTeamMembership[];
}

export type AvatarUser = Pick<User, "firstName" | "lastName"> & {
  avatarUrl?: string | null;
};

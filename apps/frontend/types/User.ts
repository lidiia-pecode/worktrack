import { PaginatedResponse, PaginationParams } from ".";
import { ProjectStatus, UserRole, UserStatus } from "./enums";

export interface User {
  id: string;
  companyId: string;
  role: UserRole;
  status: UserStatus;
  position?: string | null;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  username?: string | null;
  email: string;
  googleLinked: boolean;
  hasPassword: boolean;
  capacityHoursPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserQuery extends PaginationParams {
  status?: UserStatus;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  password: string;
  role?: UserRole;
  capacityHoursPerWeek?: number;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  position?: string;
  capacityHoursPerWeek?: number;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
}

export type UserListResponse = PaginatedResponse<User>;

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

export interface UsersQuery extends PaginationParams {
  status?: UserStatus;
}

export interface UserProject {
  id: string;
  name: string;
  status: ProjectStatus;
}

export interface UserDetails extends User {
  projects: UserProject[];
}

export type AvatarUser = Pick<User, "firstName" | "lastName"> & {
  avatarUrl?: string | null;
};

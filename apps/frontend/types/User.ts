import { PaginatedResponse, PaginationParams } from ".";
import { Company } from "./Company";
import { UserRole, UserStatus } from "./enums";

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
  googleId?: string | null;
  hasPassword: boolean;
  capacityHoursPerWeek: number;
  createdAt: string;
  updatedAt: string;
  company?: Company;
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

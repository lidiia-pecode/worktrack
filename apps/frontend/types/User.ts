import { PaginatedResponse, PaginationParams, Project } from ".";
import { Status, UserRole } from "./enums";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  position?: string;
  avatarUrl?: string;

  projects: Project[];

  updatedAt: string;
  createdAt: string;
}

export interface UserQuery extends PaginationParams {
  status?: Status;
}

export type UserPayload = Omit<User, "id" | "updatedAt" | "createdAt">;
export type UpdateUserPayload = {
  role?: UserRole;
  position?: string;
};
export type UserListResponse = PaginatedResponse<User>;

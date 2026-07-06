import { UserRole } from "./enums";

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  updatedAt: string;
  createdAt: string;
}

export type UserPayload = Omit<User, "id" | "updatedAt" | "createdAt">;
export type UpdateUserPayload = Partial<UserPayload>;

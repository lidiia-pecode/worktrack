import { UserRole } from './enums';

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  updated_at: string;
  created_at: string;
}

export type UserPayload = Omit<User, 'id' | 'updated_at' | 'created_at'>;
export type UpdateUserPayload = Partial<UserPayload>;

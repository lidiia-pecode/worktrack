// src/users/dtos/UserResponse.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../enums/UserRole.enum';

@Exclude()
export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  status!: UserStatus;

  @Expose()
  role!: UserRole;

  @Expose()
  position?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  username?: string;

  @Expose()
  capacityHoursPerWeek!: number;

  @Expose()
  hasPassword!: boolean;

  @Expose()
  updatedAt!: Date;

  @Expose()
  createdAt!: Date;
}

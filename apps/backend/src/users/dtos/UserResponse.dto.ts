import { Expose } from 'class-transformer';
import { UserRole } from '../enums/UserRole.enum';

export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  role!: UserRole;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  username!: string;

  @Expose()
  updatedAt!: Date;

  @Expose()
  createdAt!: Date;
}

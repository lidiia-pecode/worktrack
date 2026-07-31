import { Expose } from 'class-transformer';
import { UserRole } from '../enums/UserRole.enum';
import { Status } from 'src/enums/Status.enum';

export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  status!: Status;

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
  updatedAt!: Date;

  @Expose()
  createdAt!: Date;
}

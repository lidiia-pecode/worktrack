import { Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../enums/user-role.enum';

/**
 * Deliberately narrower than `UserResponse`: this list exists so someone can
 * pick a name, so it leaves out capacity, credentials and timestamps.
 */
@Exclude()
export class AssignableUserResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: UserRole;

  /** A project keeps archived members, so a list of them has to say which. */
  @Expose()
  status!: UserStatus;

  @Expose()
  position?: string;

  @Expose()
  avatarUrl?: string;
}

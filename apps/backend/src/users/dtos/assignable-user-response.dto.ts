import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

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

  @Expose()
  position?: string;

  @Expose()
  avatarUrl?: string;
}

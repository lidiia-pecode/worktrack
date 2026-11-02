import { Exclude, Expose } from 'class-transformer';

/** Just enough to name someone, such as who added or changed a record. */
@Exclude()
export class UserNameResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

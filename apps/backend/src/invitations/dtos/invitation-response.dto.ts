import { Exclude, Expose, Type } from 'class-transformer';

import { UserRole } from 'src/users/enums/user-role.enum';

@Exclude()
export class InvitationTeamResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

@Exclude()
export class InvitationSenderResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

@Exclude()
export class PendingInvitationResponse {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: UserRole;

  @Expose()
  @Type(() => InvitationTeamResponse)
  team!: InvitationTeamResponse | null;

  @Expose()
  @Type(() => InvitationSenderResponse)
  invitedBy!: InvitationSenderResponse | null;

  @Expose()
  expiresAt!: Date;

  @Expose()
  createdAt!: Date;
}

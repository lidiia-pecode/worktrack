import { Expose, Type } from 'class-transformer';

export class OwnerSetupStepStateDto {
  @Expose()
  createTeam!: boolean;

  @Expose()
  inviteManager!: boolean;

  @Expose()
  managerJoined!: boolean;

  @Expose()
  assignManager!: boolean;
}

export class OwnerSetupStateDto {
  @Expose()
  role!: 'OWNER';

  @Expose()
  @Type(() => OwnerSetupStepStateDto)
  steps!: OwnerSetupStepStateDto;

  @Expose()
  setupComplete!: boolean;
}

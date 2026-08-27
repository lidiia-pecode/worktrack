import { Expose, Type } from 'class-transformer';

export class ManagerSetupStepStateDto {
  @Expose()
  teamAssigned!: boolean;

  @Expose()
  inviteMember!: boolean;

  @Expose()
  createActivity!: boolean;

  @Expose()
  createCategory!: boolean;

  @Expose()
  createProject!: boolean;
}

export class ManagerSetupStateDto {
  @Expose()
  role!: 'MANAGER';

  @Expose()
  @Type(() => ManagerSetupStepStateDto)
  steps!: ManagerSetupStepStateDto;

  @Expose()
  setupComplete!: boolean;
}

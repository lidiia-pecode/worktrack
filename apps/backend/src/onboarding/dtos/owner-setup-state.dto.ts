import { Expose, Type } from 'class-transformer';

/** Everything somebody needs before they can log time. */
export class OwnerSetupStepStateDto {
  @Expose()
  createTeam!: boolean;

  @Expose()
  createCategory!: boolean;

  @Expose()
  createActivity!: boolean;

  @Expose()
  addProjectActivities!: boolean;

  @Expose()
  addProjectPeople!: boolean;
}

/** Optional: an owner who works alone finishes setup without a manager. */
export class OwnerManagerStepStateDto {
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
  @Type(() => OwnerManagerStepStateDto)
  managerSteps!: OwnerManagerStepStateDto;

  /** The project the project steps open, if there is one yet. */
  @Expose()
  setupProjectId!: string | null;

  @Expose()
  setupComplete!: boolean;
}

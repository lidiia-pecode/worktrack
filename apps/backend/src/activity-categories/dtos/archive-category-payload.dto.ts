import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';

import { ActiveActivitiesAction } from '../enums/active-activities-action.enum';

/** Without `activities`, archiving refuses while the category has active ones. */
export class ArchiveCategoryPayload {
  @IsOptional()
  @IsEnum(ActiveActivitiesAction)
  activities?: ActiveActivitiesAction;

  @ValidateIf(
    (payload: ArchiveCategoryPayload) =>
      payload.activities === ActiveActivitiesAction.MOVE,
  )
  @IsUUID()
  moveToCategoryId?: string;
}

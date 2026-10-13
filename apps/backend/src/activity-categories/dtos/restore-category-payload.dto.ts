import { IsEnum, IsOptional } from 'class-validator';

import { ArchivedActivitiesAction } from '../enums/archived-activities-action.enum';

/** Without `activities`, the category comes back alone. */
export class RestoreCategoryPayload {
  @IsOptional()
  @IsEnum(ArchivedActivitiesAction)
  activities?: ArchivedActivitiesAction;
}

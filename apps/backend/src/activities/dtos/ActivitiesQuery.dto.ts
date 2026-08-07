import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ActivityStatus } from '../enums/activity-status.enum';

export class ActivitiesQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}

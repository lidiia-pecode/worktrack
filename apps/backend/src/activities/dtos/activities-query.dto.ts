import { IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { ActivityStatus } from '../enums/activity-status.enum';

export class ActivitiesQuery extends SearchablePaginationQuery {
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}

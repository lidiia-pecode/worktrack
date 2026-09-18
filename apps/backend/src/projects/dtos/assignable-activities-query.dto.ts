import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';

export class AssignableActivitiesQuery extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  userId?: string;
}

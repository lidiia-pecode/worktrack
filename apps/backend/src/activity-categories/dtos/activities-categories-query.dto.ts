import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { ActCategoryStatus } from '../enums/category-status.enum';

export class ActivityCategoriesQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ActCategoryStatus)
  status?: ActCategoryStatus;
}

import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ActCategoryStatus } from '../enums/category-status';

export class ActivityCategoriesQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ActCategoryStatus)
  status?: ActCategoryStatus;
}

import { IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { ActCategoryStatus } from '../enums/category-status.enum';

export class ActivityCategoriesQuery extends SearchablePaginationQuery {
  @IsOptional()
  @IsEnum(ActCategoryStatus)
  status?: ActCategoryStatus;
}

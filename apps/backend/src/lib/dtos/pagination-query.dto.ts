import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGINATION_PAGE_SIZE,
  MAX_PAGINATION_PAGE_SIZE,
} from '../consts';

export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGINATION_PAGE_SIZE)
  @Type(() => Number)
  pageSize: number = DEFAULT_PAGINATION_PAGE_SIZE;

  get offset() {
    return (this.page - 1) * this.pageSize;
  }

  get limit() {
    return this.pageSize;
  }
}

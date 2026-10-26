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
}

/**
 * The rows before the requested page. Not a getter, so `?offset=` stays an
 * unknown parameter the validation pipe refuses with a 400.
 */
export const pageOffset = ({ page, pageSize }: PaginationQuery) =>
  (page - 1) * pageSize;

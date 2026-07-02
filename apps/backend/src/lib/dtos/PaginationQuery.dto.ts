import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { DEFAULT_PAGINATION_PAGE_SIZE } from '../consts';

export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page_size: number = DEFAULT_PAGINATION_PAGE_SIZE;

  get offset() {
    return (this.page - 1) * this.page_size;
  }

  get limit() {
    return this.page_size;
  }
}

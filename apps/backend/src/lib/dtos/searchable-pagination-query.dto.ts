import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../decorators';
import { MAX_SEARCH_LENGTH } from '../consts';
import { PaginationQuery } from './pagination-query.dto';

export class SearchablePaginationQuery extends PaginationQuery {
  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  search?: string;
}

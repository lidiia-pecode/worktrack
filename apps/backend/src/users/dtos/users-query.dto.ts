import { IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { UserStatus } from '../enums/user-role.enum';

export class UsersQuery extends SearchablePaginationQuery {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

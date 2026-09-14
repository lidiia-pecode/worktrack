import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { UserStatus } from '../enums/user-role.enum';

export class UsersQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

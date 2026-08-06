import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { UserStatus } from '../enums/UserRole.enum';

export class UsersQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

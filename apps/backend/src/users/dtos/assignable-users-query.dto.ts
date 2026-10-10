import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UsersQuery } from './users-query.dto';

export class AssignableUsersQuery extends UsersQuery {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

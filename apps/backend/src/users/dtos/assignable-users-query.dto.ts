import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UsersQuery } from './users-query.dto';

export class AssignableUsersQuery extends UsersQuery {
  /** Only a Manager can lead a team, so the team picker asks per role. */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

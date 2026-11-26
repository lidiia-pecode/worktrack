import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { toBoolean } from 'src/lib/dtos/to-boolean.transform';
import { toList } from 'src/lib/dtos/to-list.transform';
import { UserRole } from '../enums/user-role.enum';
import { UsersQuery } from './users-query.dto';

export class AssignableUsersQuery extends UsersQuery {
  /** Comma-separated, e.g. `?roles=EMPLOYEE,MANAGER`. */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  /** Only people in no team now (`?noTeam=true`), such as a Manager who can be given one. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  noTeam?: boolean;
}

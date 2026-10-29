import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UsersQuery } from './users-query.dto';

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : value;

export class AssignableUsersQuery extends UsersQuery {
  /** Comma-separated, e.g. `?roles=EMPLOYEE,MANAGER`. */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}

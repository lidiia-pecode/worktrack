import { IsEnum, IsOptional } from 'class-validator';
import { Status } from 'src/enums/Status.enum';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';

export class UsersQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

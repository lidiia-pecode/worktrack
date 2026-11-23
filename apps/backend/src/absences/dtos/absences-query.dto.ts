import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class AbsencesQuery extends PaginationQuery {
  @IsOptional()
  @IsDateWithoutTimeString()
  dateFrom?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Only the absences of people in this team on the absence's days. */
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

/** One person's day; the caller's own without `userId`. */
export class AbsenceDayQuery {
  @IsDateWithoutTimeString()
  date!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

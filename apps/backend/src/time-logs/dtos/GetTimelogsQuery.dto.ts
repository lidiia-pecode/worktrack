import { IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class GetTimelogsQuery extends PaginationQuery {
  @IsOptional()
  @IsDateWithoutTimeString()
  dateFrom?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  dateTo?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  date?: string;
}

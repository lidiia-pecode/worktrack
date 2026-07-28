import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class PlanningQueryDto extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  date?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  dateFrom?: string;

  @IsOptional()
  @IsDateWithoutTimeString()
  dateTo?: string;
}

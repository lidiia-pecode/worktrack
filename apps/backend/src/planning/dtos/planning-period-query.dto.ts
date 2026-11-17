import { IsOptional, IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

/** A day of the week or month to read. */
export class PlanningPeriodQuery {
  @IsDateWithoutTimeString()
  date!: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}

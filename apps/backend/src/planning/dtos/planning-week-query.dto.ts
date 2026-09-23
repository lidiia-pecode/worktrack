import { IsOptional, IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class PlanningWeekQuery {
  @IsDateWithoutTimeString()
  date!: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}

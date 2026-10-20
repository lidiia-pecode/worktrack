import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class PeriodProjectPayload {
  @IsUUID()
  projectId!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  minutesPerDay!: number;
}

export class PlanPeriodPayload {
  @IsUUID()
  userId!: string;

  @IsDateWithoutTimeString()
  startDate!: string;

  @IsDateWithoutTimeString()
  endDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PeriodProjectPayload)
  projects!: PeriodProjectPayload[];
}

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

/** A plan checked but not saved; the projects may still be empty. */
export class PreviewPeriodPayload {
  @IsUUID()
  userId!: string;

  @IsDateWithoutTimeString()
  startDate!: string;

  @IsDateWithoutTimeString()
  endDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeriodProjectPayload)
  projects!: PeriodProjectPayload[];
}

/** The plan to save: the same fields, with at least one project. */
export class PlanPeriodPayload extends PreviewPeriodPayload {
  @ArrayMinSize(1)
  projects: PeriodProjectPayload[] = [];
}

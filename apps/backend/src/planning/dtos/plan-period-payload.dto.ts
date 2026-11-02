import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { MAX_PLAN_MINUTES, PLAN_MINUTES_STEP } from '../planning-period.util';

export class PeriodProjectPayload {
  @IsUUID()
  projectId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_PLAN_MINUTES)
  @IsDivisibleBy(PLAN_MINUTES_STEP, {
    message: 'minutesPerDay must be in 15-minute steps',
  })
  minutesPerDay!: number;

  /** Only the days in the range that already have this project; otherwise every working day. */
  @IsOptional()
  @IsBoolean()
  existingDaysOnly?: boolean;
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

/** One person's plans on one project between two days, deleted together. */
export class DeletePeriodPlansQuery {
  @IsUUID()
  userId!: string;

  @IsUUID()
  projectId!: string;

  @IsDateWithoutTimeString()
  startDate!: string;

  @IsDateWithoutTimeString()
  endDate!: string;
}

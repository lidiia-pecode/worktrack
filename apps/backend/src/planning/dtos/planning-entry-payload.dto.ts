import {
  IsDivisibleBy,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { MAX_PLAN_MINUTES, PLAN_MINUTES_STEP } from '../planning-period.util';

export class CreatePlanningEntryDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  projectId!: string;

  @IsDateWithoutTimeString()
  date!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(MAX_PLAN_MINUTES)
  @IsDivisibleBy(PLAN_MINUTES_STEP, {
    message: 'plannedMinutes must be in 15-minute steps',
  })
  plannedMinutes!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}

export class UpdatePlanningEntryDto extends PartialType(
  OmitType(CreatePlanningEntryDto, ['userId'] as const),
  { skipNullProperties: false },
) {}

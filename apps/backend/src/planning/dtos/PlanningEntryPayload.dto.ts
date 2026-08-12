import {
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

/**
 * Creates a planning entry for a target user on a specific project activity.
 * The authenticated user (OWNER/MANAGER) is recorded as `createdById`.
 */
export class CreatePlanningEntryDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  projectActivityId!: string;

  @IsDateWithoutTimeString()
  date!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(1440)
  plannedMinutes!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}

/**
 * Update may change the activity, date, planned minutes or note.
 * The target `userId` and `createdById` are immutable.
 */
export class UpdatePlanningEntryDto extends PartialType(
  OmitType(CreatePlanningEntryDto, ['userId'] as const),
) {}

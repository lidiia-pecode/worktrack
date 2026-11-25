import { MINUTES_PER_DAY } from 'src/lib/consts';
import { TrimString } from 'src/lib/decorators';
import {
  IsEnum,
  IsInt,
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
import { AbsenceType } from '../enums/absence-type.enum';

/** No day is longer; the person's own working day is checked on save. */

export class AbsencePayload {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(AbsenceType)
  type!: AbsenceType;

  @IsDateWithoutTimeString()
  startDate!: string;

  @IsDateWithoutTimeString()
  endDate!: string;

  /** Part of one day; left out or null for whole days. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MINUTES_PER_DAY)
  minutes?: number | null;

  @IsOptional()
  @TrimString({ keepNull: true })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string | null;
}

// An absence cannot be reassigned to a different person, so userId is not updatable.
export class UpdateAbsencePayload extends PartialType(
  OmitType(AbsencePayload, ['userId'] as const),
  { skipNullProperties: false },
) {}

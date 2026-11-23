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
const MAX_ABSENCE_MINUTES = 24 * 60;

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
  @Max(MAX_ABSENCE_MINUTES)
  minutes?: number | null;

  @IsOptional()
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

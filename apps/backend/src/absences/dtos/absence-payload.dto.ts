import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { AbsenceType } from '../enums/absence-type.enum';

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

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}

// An absence cannot be reassigned to a different person, so userId is not updatable.
export class UpdateAbsencePayload extends PartialType(
  OmitType(AbsencePayload, ['userId'] as const),
) {}

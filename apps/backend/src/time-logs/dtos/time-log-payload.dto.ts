import {
  IsBoolean,
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

export class TimeLogPayload {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsUUID()
  projectActivityId!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(1440)
  minutes!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @IsDateWithoutTimeString()
  date!: string;
}

// An entry cannot be reassigned to a different person, so userId is not updatable.
export class UpdateTimeLogPayload extends PartialType(
  OmitType(TimeLogPayload, ['userId'] as const),
) {}

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

export class CreatePlanningEntryDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  projectId!: string;

  @IsDateWithoutTimeString()
  date!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(1440)
  time!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}

export class UpdatePlanningEntryDto extends PartialType(
  OmitType(CreatePlanningEntryDto, ['employeeId'] as const),
) {}

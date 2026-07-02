import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class TimeLogPayload {
  @IsUUID()
  projectActivityId!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(1440)
  time!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  note?: string;

  @IsDateWithoutTimeString()
  date!: string;
}

export class UpdateTimelogPayload extends PartialType(TimeLogPayload) {}

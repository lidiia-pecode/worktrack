// src/companies/dtos/update-company.dto.ts
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { WeekDay } from '../enums/week-day.enum';
import { TrimString } from 'src/lib/decorators';
import { IsIanaTimeZone } from 'src/lib/validators/IsIanaTimeZone';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @TrimString()
  @Length(2, 255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIanaTimeZone()
  @Transform(({ value }: TransformFnParams): unknown =>
    value === 'Europe/Kiev' ? 'Europe/Kyiv' : value,
  )
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }: TransformFnParams): string | undefined =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  currency?: string;

  @IsOptional()
  @IsEnum(WeekDay)
  weekStartDay?: WeekDay;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(24)
  standardWorkHoursPerDay?: number;
}

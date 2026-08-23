// src/companies/dtos/update-company.dto.ts
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Matches,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { WeekDay } from '../enum/week-day.enum';
import { TrimString } from 'src/lib/decorators/trim-string.decorator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @TrimString()
  @Length(2, 255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/, {
    message:
      'Timezone must be a valid IANA time zone format (e.g. Europe/Kyiv, UTC)',
  })
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

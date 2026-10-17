import {
  IsEnum,
  IsNumber,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { WeekDay } from '../enums/week-day.enum';
import { OptionalNotNull } from 'src/lib/decorators';
import { CompanyName } from 'src/lib/validators/account-fields';
import { IsIanaTimeZone } from 'src/lib/validators/IsIanaTimeZone';

export class UpdateCompanyDto {
  @OptionalNotNull()
  @CompanyName()
  companyName?: string;

  @OptionalNotNull()
  @IsString()
  @MaxLength(50)
  @IsIanaTimeZone()
  @Transform(({ value }: TransformFnParams): unknown =>
    value === 'Europe/Kiev' ? 'Europe/Kyiv' : value,
  )
  timezone?: string;

  @OptionalNotNull()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }: TransformFnParams): string | undefined =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  currency?: string;

  @OptionalNotNull()
  @IsEnum(WeekDay)
  weekStartDay?: WeekDay;

  @OptionalNotNull()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(24)
  standardWorkHoursPerDay?: number;
}

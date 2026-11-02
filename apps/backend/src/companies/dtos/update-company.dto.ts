import {
  IsEnum,
  IsIn,
  IsNumber,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { WeekDay } from '../enums/week-day.enum';
import { OptionalNotNull } from 'src/lib/decorators';
import {
  MAX_MINUTES_PER_DAY,
  MINUTES_STEP_PER_DAY,
} from 'src/capacity/working-days.util';

/** 1h to 12h in 30-minute steps, as a person's working day (decision 6, Phase 41). */
const STANDARD_DAY_HOURS = Array.from(
  { length: (MAX_MINUTES_PER_DAY - 60) / MINUTES_STEP_PER_DAY + 1 },
  (_, step) => 1 + (step * MINUTES_STEP_PER_DAY) / 60,
);
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
  @IsIn(STANDARD_DAY_HOURS, {
    message: 'standardWorkHoursPerDay must be 1 to 12 hours in 30-minute steps',
  })
  standardWorkHoursPerDay?: number;
}

import { IsDivisibleBy, IsInt, IsUUID, Max, Min } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import {
  MAX_MINUTES_PER_DAY,
  MINUTES_STEP_PER_DAY,
  WORKING_DAYS_PER_WEEK,
} from '../working-days.util';

export class SetCapacityPayload {
  @IsUUID()
  userId!: string;

  /**
   * Five working days of up to 12h each, set in 30-minute steps a day (Phase
   * 41, decision 6), so the day expected and planned is never an odd minute.
   */
  @IsInt()
  @Min(0)
  @Max(MAX_MINUTES_PER_DAY * WORKING_DAYS_PER_WEEK)
  @IsDivisibleBy(MINUTES_STEP_PER_DAY * WORKING_DAYS_PER_WEEK, {
    message: 'minutesPerWeek must be five working days in 30-minute steps',
  })
  minutesPerWeek!: number;

  @IsDateWithoutTimeString()
  validFrom!: string;
}

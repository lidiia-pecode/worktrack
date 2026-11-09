import { IsIn, IsNumber } from 'class-validator';

import {
  MAX_MINUTES_PER_DAY,
  MINUTES_STEP_PER_DAY,
} from 'src/capacity/working-days.util';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

const MIN_STANDARD_DAY_MINUTES = 60;

/** 1h to 12h in 30-minute steps, as a person's working day (decision 6, Phase 41). */
const STANDARD_DAY_HOURS = Array.from(
  {
    length:
      (MAX_MINUTES_PER_DAY - MIN_STANDARD_DAY_MINUTES) / MINUTES_STEP_PER_DAY +
      1,
  },
  (_, step) => (MIN_STANDARD_DAY_MINUTES + step * MINUTES_STEP_PER_DAY) / 60,
);

export class SetStandardDayPayload {
  @IsNumber()
  @IsIn(STANDARD_DAY_HOURS, {
    message: 'hoursPerDay must be 1 to 12 hours in 30-minute steps',
  })
  hoursPerDay!: number;

  @IsDateWithoutTimeString()
  validFrom!: string;
}

export class StandardDayChangeParams {
  @IsDateWithoutTimeString()
  validFrom!: string;
}

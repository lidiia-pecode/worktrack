import { IsIn, IsNumber } from 'class-validator';

import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

import { STANDARD_DAY_HOURS } from './update-company.dto';

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

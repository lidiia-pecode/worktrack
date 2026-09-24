import { BadRequestException } from '@nestjs/common';

import { addDays } from 'src/capacity/working-days.util';

/** The longest range a report or a day-by-day figure may cover, both ends counted. */
export const MAX_RANGE_DAYS = 366;

export const assertDateRange = (dateFrom: string, dateTo: string): void => {
  if (dateFrom > dateTo) {
    throw new BadRequestException('dateFrom cannot be after dateTo');
  }

  const lastAllowedDay = addDays(dateFrom, MAX_RANGE_DAYS - 1);
  if (dateTo > lastAllowedDay) {
    throw new BadRequestException(
      `A date range can cover at most ${MAX_RANGE_DAYS} days`,
    );
  }
};

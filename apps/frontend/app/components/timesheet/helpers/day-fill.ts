import {
  ABSENCE_PATTERN,
  EXCESS_FILL,
  WEEKEND_EXTRA_PATTERN,
  WEEKEND_PATTERN,
} from "../consts";

type DayFillInput = {
  isAbsent: boolean;
  isWeekend: boolean;
  minutes: number;
  /** The person's figure for the day; without it, nothing is marked as over. */
  expectedMinutes?: number;
};

/**
 * How a whole day is filled where it is one cell or one block: a day off's
 * stripes, a weekend's (amber once it has time, all of it extra), or on a
 * working day solid amber when its time is past the person's figure.
 */
export const dayFill = ({
  isAbsent,
  isWeekend,
  minutes,
  expectedMinutes,
}: DayFillInput) => {
  if (isAbsent) return ABSENCE_PATTERN;
  if (isWeekend) return minutes > 0 ? WEEKEND_EXTRA_PATTERN : WEEKEND_PATTERN;
  if (expectedMinutes !== undefined && minutes > expectedMinutes) {
    return EXCESS_FILL;
  }
  return undefined;
};

/** Whether a fill from `dayFill` marks time past what was expected. */
export const isOverFill = (fill: string | undefined) =>
  fill === EXCESS_FILL || fill === WEEKEND_EXTRA_PATTERN;

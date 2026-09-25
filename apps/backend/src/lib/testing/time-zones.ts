import { addDays, todayISODate } from 'src/capacity/working-days.util';
import { editableUntil } from 'src/reporting/reporting-months.util';

const UTC_PLUS_14 = 'Pacific/Kiritimati';
const UTC_MINUS_11 = 'Pacific/Pago_Pago';

// Neither zone has daylight saving, so the offsets never change.
const HOURS_AHEAD_OF_UTC = { [UTC_PLUS_14]: 14, [UTC_MINUS_11]: -11 };

const MS_PER_HOUR = 60 * 60 * 1000;

export type FarTimeZone = keyof typeof HOURS_AHEAD_OF_UTC;

/**
 * A time zone whose date differs from UTC's right now. Between them the two
 * zones cover every hour, so a date taken from the server's clock always fails.
 */
export const timeZoneOnAnotherDay = (): FarTimeZone =>
  todayISODate(UTC_PLUS_14) !== todayISODate() ? UTC_PLUS_14 : UTC_MINUS_11;

/**
 * Stops `Date` at a time on the company's own clock. Timers stay real so the
 * database keeps working; `jest.useRealTimers()` undoes it.
 */
const freezeClockAt = (timeZone: FarTimeZone, localDateTime: string): void => {
  const now =
    Date.parse(`${localDateTime}Z`) -
    HOURS_AHEAD_OF_UTC[timeZone] * MS_PER_HOUR;

  jest.useFakeTimers({
    now,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
};

/**
 * The last second the month can still be edited, on the company's clock.
 * Paired with `freezeAtFirstLockedSecond`, one of the two falls on a different
 * UTC date, so a lock taken from the server's clock fails one of them.
 */
export const freezeAtLastGraceSecond = (
  month: string,
  timeZone: FarTimeZone,
): void => freezeClockAt(timeZone, `${editableUntil(month)}T23:59:59`);

/** The first second the month is locked, on the company's clock. */
export const freezeAtFirstLockedSecond = (
  month: string,
  timeZone: FarTimeZone,
): void =>
  freezeClockAt(timeZone, `${addDays(editableUntil(month), 1)}T00:00:00`);

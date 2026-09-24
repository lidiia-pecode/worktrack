import { todayISODate } from 'src/capacity/working-days.util';

const UTC_PLUS_14 = 'Pacific/Kiritimati';
const UTC_MINUS_11 = 'Pacific/Pago_Pago';

/**
 * A time zone whose date differs from UTC's right now. Between them the two
 * zones cover every hour, so a date taken from the server's clock always fails.
 */
export const timeZoneOnAnotherDay = (): string =>
  todayISODate(UTC_PLUS_14) !== todayISODate() ? UTC_PLUS_14 : UTC_MINUS_11;

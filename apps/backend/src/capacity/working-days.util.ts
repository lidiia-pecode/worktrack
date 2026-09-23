import { WeekDay } from 'src/companies/enums/week-day.enum';

/**
 * Working days are Monday to Friday. `Company.weekStartDay` decides which day a
 * week grid starts on, not which days are worked.
 */
export const WORKING_DAYS_PER_WEEK = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Dates are handled as YYYY-MM-DD in UTC so a timezone never shifts a day. */
const toUtc = (date: string): number => Date.parse(`${date}T00:00:00Z`);

export const toISODate = (timestamp: number): string =>
  new Date(timestamp).toISOString().slice(0, 10);

/** Today where the company is, so nobody is "behind" at nine on Monday. */
export const todayISODate = (timeZone?: string): string => {
  if (!timeZone) return new Date().toISOString().slice(0, 10);

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const isWorkingDay = (date: string): boolean => {
  const day = new Date(toUtc(date)).getUTCDay();
  return day >= 1 && day <= 5;
};

/** Every date from `from` to `to` inclusive. */
export function* eachDate(from: string, to: string): Generator<string> {
  for (let at = toUtc(from); at <= toUtc(to); at += MS_PER_DAY) {
    yield toISODate(at);
  }
}

export const weekRange = (
  date: string,
  weekStartDay: WeekDay,
): { start: string; end: string } => {
  const startIndex = weekStartDay === WeekDay.SUNDAY ? 0 : 1;
  const offset = (new Date(toUtc(date)).getUTCDay() - startIndex + 7) % 7;
  const start = toUtc(date) - offset * MS_PER_DAY;

  return {
    start: toISODate(start),
    end: toISODate(start + 6 * MS_PER_DAY),
  };
};

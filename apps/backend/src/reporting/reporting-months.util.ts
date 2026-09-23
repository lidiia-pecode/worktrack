/**
 * A reporting period is a calendar month. Inside the backend a month is passed
 * around as its first day (YYYY-MM-01), which is also how it is stored; the API
 * shows it as a month key (YYYY-MM).
 */

/** How many days a month stays editable after it ends. */
export const GRACE_DAYS = 7;

const pad = (value: number): string => String(value).padStart(2, '0');

/** Builds a YYYY-MM-DD date. Out-of-range days and months roll over. */
const isoDate = (year: number, monthIndex: number, day: number): string => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const yearAndMonthIndex = (date: string): [number, number] => {
  const [year, month] = date.split('-').map(Number);
  return [year, month - 1];
};

/** Accepts a month key (YYYY-MM) or a date (YYYY-MM-DD). */
export const firstDayOfMonth = (date: string): string => {
  const [year, monthIndex] = yearAndMonthIndex(date);
  return isoDate(year, monthIndex, 1);
};

/** YYYY-MM, the form the API uses. */
export const toMonthKey = (date: string): string => {
  const [year, monthIndex] = yearAndMonthIndex(date);
  return `${year}-${pad(monthIndex + 1)}`;
};

export const addMonths = (month: string, count: number): string => {
  const [year, monthIndex] = yearAndMonthIndex(month);
  return isoDate(year, monthIndex + count, 1);
};

export const lastDayOfMonth = (month: string): string => {
  const [year, monthIndex] = yearAndMonthIndex(month);
  // Day 0 of the next month is the last day of this one.
  return isoDate(year, monthIndex + 1, 0);
};

/** The last day a month can be edited without being reopened. */
export const editableUntil = (month: string): string => {
  const [year, monthIndex] = yearAndMonthIndex(month);
  return isoDate(year, monthIndex + 1, GRACE_DAYS);
};

/** Whether a month has passed its grace window and locked by itself. */
export const isAutoLocked = (month: string, today: string): boolean =>
  today > editableUntil(month);

/** The newest month that has locked by itself as of `today`. */
export const latestAutoLockedMonth = (today: string): string => {
  const lastMonth = addMonths(firstDayOfMonth(today), -1);
  return isAutoLocked(lastMonth, today) ? lastMonth : addMonths(lastMonth, -1);
};

/** The first day of every month from `from` to `to` inclusive, oldest first. */
export const monthsBetween = (from: string, to: string): string[] => {
  const months: string[] = [];
  const last = firstDayOfMonth(to);

  for (
    let month = firstDayOfMonth(from);
    month <= last;
    month = addMonths(month, 1)
  ) {
    months.push(month);
  }

  return months;
};

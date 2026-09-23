/**
 * A reporting period is a calendar month. It stays editable for this many days
 * after it ends, and locks on the day after that.
 */
export const GRACE_DAYS = 7;

const pad = (value: number): string => String(value).padStart(2, '0');

const fromParts = (year: number, monthIndex: number, day = 1): string => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const parts = (date: string): [number, number] => [
  Number(date.slice(0, 4)),
  Number(date.slice(5, 7)) - 1,
];

/** The first day of the month a date falls in. Accepts YYYY-MM or YYYY-MM-DD. */
export const monthOf = (date: string): string => `${date.slice(0, 7)}-01`;

export const addMonths = (month: string, count: number): string => {
  const [year, monthIndex] = parts(month);
  return fromParts(year, monthIndex + count);
};

export const lastDayOf = (month: string): string => {
  const [year, monthIndex] = parts(month);
  return fromParts(year, monthIndex + 1, 0);
};

/** The last day a month can still be edited without being reopened. */
export const editableUntil = (month: string): string => {
  const [year, monthIndex] = parts(month);
  return fromParts(year, monthIndex + 1, GRACE_DAYS);
};

export const isPastGrace = (month: string, today: string): boolean =>
  today > editableUntil(month);

/** The newest month that has locked by itself as of `today`. */
export const latestAutoLockedMonth = (today: string): string => {
  const previous = addMonths(monthOf(today), -1);
  return isPastGrace(previous, today) ? previous : addMonths(previous, -1);
};

/** Every month from `from` to `to` inclusive, oldest first. */
export const eachMonth = (from: string, to: string): string[] => {
  const months: string[] = [];
  let month = monthOf(from);

  while (month <= monthOf(to)) {
    months.push(month);
    month = addMonths(month, 1);
  }

  return months;
};

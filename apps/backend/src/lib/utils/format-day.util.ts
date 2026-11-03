/** "Thu 20 Nov", or "20 Nov" without the weekday. */
export const formatDay = (date: string, withWeekday = true): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

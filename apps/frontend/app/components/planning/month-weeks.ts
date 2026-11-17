import { WeekDay } from "@/types/enums";
import {
  addDays,
  fromISODate,
  getMonthRange,
  getWeekStart,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";

/**
 * A month's working days split into the company's weeks, one list per week.
 * The first and last weeks hold only the month's own days, so they can be
 * short, and a week's figures add up to the month's.
 */
export const monthWorkingWeeks = (
  monthKey: string,
  weekStartDay: WeekDay,
): Date[][] => {
  const { dateFrom, dateTo } = getMonthRange(monthKey);
  const weeks: Date[][] = [];
  let shownWeekStart: string | null = null;

  for (
    let day = fromISODate(dateFrom);
    toISODate(day) <= dateTo;
    day = addDays(day, 1)
  ) {
    if (isWeekend(day)) continue;

    const weekStart = toISODate(getWeekStart(day, weekStartDay));
    if (weekStart !== shownWeekStart) {
      weeks.push([]);
      shownWeekStart = weekStart;
    }
    weeks[weeks.length - 1].push(day);
  }

  return weeks;
};

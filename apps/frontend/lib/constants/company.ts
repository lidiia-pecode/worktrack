import { WeekDay } from "@/types/enums";

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  [WeekDay.MONDAY]: "Monday",
  [WeekDay.SUNDAY]: "Sunday",
};

export const WEEK_START_OPTIONS = [WeekDay.MONDAY, WeekDay.SUNDAY].map(
  (day) => ({ value: day, label: WEEK_DAY_LABELS[day] }),
);

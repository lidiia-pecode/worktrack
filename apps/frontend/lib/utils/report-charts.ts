import { HoursReportRow, TimelineBucket } from "@/types";

import { formatDayMonthLabel, fromISODate } from "./date";
import { countLabel } from "./text";

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { day: "numeric" });

/** A run of days by name: "Oct 5–9", "Sep 29 – Oct 3", or the one day. */
export const bucketLabel = ({
  start,
  end,
}: Pick<TimelineBucket, "start" | "end">) => {
  if (start === end) return formatDayMonthLabel(start);

  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${formatDayMonthLabel(start)}–${DAY_LABEL.format(fromISODate(end))}`
    : `${formatDayMonthLabel(start)} – ${formatDayMonthLabel(end)}`;
};

/**
 * How much of a bucket counts, said under its name: "5 days", or "2 days so
 * far" when the counting stopped at yesterday inside it.
 */
export const bucketNote = (
  { end, workingDays, isPartial }: TimelineBucket,
  countedUntil: string | null,
) => {
  const days = countLabel(workingDays, "day", "days");
  return isPartial && end === countedUntil ? `${days} so far` : days;
};

const MINUTES_PER_HOUR = 60;

/** Tick steps, in hours, that read as round numbers on an axis. */
const TICK_STEPS_HOURS = [
  1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500, 1000, 2000, 2500,
  5000,
];

/** An axis has at most this many intervals, so its labels never crowd. */
const MAX_TICK_INTERVALS = 4;

export interface HourScale {
  /** Where the scale ends, a round number at or just above the largest figure. */
  endMinutes: number;
  /** From 0 to `endMinutes`, evenly spaced. */
  ticks: number[];
}

/** The hour scale of the Week by week chart, from its largest figure. */
export const hourScale = (maxMinutes: number): HourScale => {
  const maxHours = Math.max(maxMinutes / MINUTES_PER_HOUR, 1);
  const step =
    TICK_STEPS_HOURS.find((hours) => hours * MAX_TICK_INTERVALS >= maxHours) ??
    TICK_STEPS_HOURS.at(-1)!;
  const intervals = Math.ceil(maxHours / step);

  return {
    endMinutes: intervals * step * MINUTES_PER_HOUR,
    ticks: Array.from(
      { length: intervals + 1 },
      (_, i) => i * step * MINUTES_PER_HOUR,
    ),
  };
};

/** Categories shown with a colour of their own; the rest share a grey "Other". */
export const CATEGORY_SLOTS = 5;

export const NO_CATEGORY = "No category";
export const OTHER_CATEGORIES = "Other";

export interface CategoryShare {
  name: string;
  minutes: number;
  /** Whole percent of all logged time. */
  share: number;
  /** 1 to `CATEGORY_SLOTS`; null for the grey "Other" and "No category". */
  slot: number | null;
  /** For "Other": the categories in it, largest first. */
  includes?: CategoryShare[];
}

/**
 * Logged time by activity category, largest first, the grey ones last.
 *
 * The categories with time get the colours in the order of the company's
 * Categories list, not by size, so a category keeps its colour while the same
 * ones have time. Past five, the five largest keep a colour and the rest join a
 * grey "Other", which lists them; time on activities without a category is a
 * grey "No category".
 */
export const kindOfWork = (
  activities: HoursReportRow[],
  /** Every category's name, in the Categories list's order. */
  categoryNames: string[],
): CategoryShare[] => {
  const total = activities.reduce((sum, row) => sum + row.totalMinutes, 0);
  const minutesByCategory = new Map<string, number>();
  let withoutCategory = 0;

  for (const { detail, totalMinutes } of activities) {
    if (detail) {
      minutesByCategory.set(
        detail,
        (minutesByCategory.get(detail) ?? 0) + totalMinutes,
      );
    } else {
      withoutCategory += totalMinutes;
    }
  }

  const withTime = [...minutesByCategory.entries()].filter(
    ([, minutes]) => minutes > 0,
  );
  // A category missing from the list (renamed since, say) goes after the rest.
  const listPlace = (name: string) => {
    const index = categoryNames.indexOf(name);
    return index === -1 ? categoryNames.length : index;
  };
  const byListPlace = (a: string, b: string) =>
    listPlace(a) - listPlace(b) || a.localeCompare(b);
  const coloured = new Set(
    [...withTime]
      .sort((a, b) => b[1] - a[1] || byListPlace(a[0], b[0]))
      .slice(0, CATEGORY_SLOTS)
      .map(([name]) => name),
  );
  const slotOf = new Map(
    [...coloured].sort(byListPlace).map((name, index) => [name, index + 1]),
  );

  const share = (minutes: number) =>
    total > 0 ? Math.round((minutes / total) * 100) : 0;
  const inOther = withTime
    .filter(([name]) => !coloured.has(name))
    .sort((a, b) => b[1] - a[1] || byListPlace(a[0], b[0]))
    .map(([name, minutes]) => ({
      name,
      minutes,
      share: share(minutes),
      slot: null,
    }));
  const other = inOther.reduce((sum, { minutes }) => sum + minutes, 0);

  return [
    ...withTime
      .filter(([name]) => coloured.has(name))
      .map(([name, minutes]) => ({
        name,
        minutes,
        share: share(minutes),
        slot: slotOf.get(name)!,
      }))
      .sort((a, b) => b.minutes - a.minutes),
    ...(other > 0
      ? [
          {
            name: OTHER_CATEGORIES,
            minutes: other,
            share: share(other),
            slot: null,
            includes: inOther,
          },
        ]
      : []),
    ...(withoutCategory > 0
      ? [
          {
            name: NO_CATEGORY,
            minutes: withoutCategory,
            share: share(withoutCategory),
            slot: null,
          },
        ]
      : []),
  ];
};

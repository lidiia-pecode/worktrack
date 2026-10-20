import { Absence, PeriodPreview as Preview, PlanningEntry } from "@/types";
import {
  addDays,
  formatDayMonthLabel,
  formatDuration,
  fromISODate,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { getProjectColor } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

const countWeekdays = (startDate: string, endDate: string): number => {
  let count = 0;
  for (
    let day = fromISODate(startDate);
    toISODate(day) <= endDate;
    day = addDays(day, 1)
  ) {
    if (!isWeekend(day)) count++;
  }
  return count;
};

/** The weekdays of the period an absence covers. */
const awayWeekdays = (
  absence: Absence,
  startDate: string,
  endDate: string,
): number =>
  countWeekdays(
    absence.startDate > startDate ? absence.startDate : startDate,
    absence.endDate < endDate ? absence.endDate : endDate,
  );

/** "WorkTrack: 7 days, 35h" for each project already planned in the period. */
const summarisePlans = (plans: PlanningEntry[]): string[] => {
  const byProject = new Map<string, { days: Set<string>; minutes: number }>();

  plans.forEach((plan) => {
    const summary = byProject.get(plan.project.name) ?? {
      days: new Set<string>(),
      minutes: 0,
    };
    summary.days.add(plan.date);
    summary.minutes += plan.plannedMinutes;
    byProject.set(plan.project.name, summary);
  });

  return [...byProject].map(
    ([name, { days, minutes }]) =>
      `${name}: ${days.size} ${days.size === 1 ? "day" : "days"}, ${formatDuration(minutes)}`,
  );
};

type PeriodPreviewProps = {
  firstName: string;
  startDate: string;
  endDate: string;
  dayLimitMinutes: number;
  /** The rows as filled in so far, for the day's total and the bar. */
  rows: { projectId: string; minutes: number }[];
  /** The server's answer; none while the first one loads. */
  preview?: Preview;
  isOutdated: boolean;
  /** A refusal the server gave instead of a preview. */
  refusal: string[];
  /** The preview could not be fetched at all. */
  failed: boolean;
  absences: Absence[];
  existingPlans: PlanningEntry[];
};

/**
 * What saving would do, before it is saved: the day's total, the working days,
 * the absences skipped, what is already planned and anything that does not fit.
 */
export const PeriodPreview = ({
  firstName,
  startDate,
  endDate,
  dayLimitMinutes,
  rows,
  preview,
  isOutdated,
  refusal,
  failed,
  absences,
  existingPlans,
}: PeriodPreviewProps) => {
  const dailyMinutes = rows.reduce((total, row) => total + row.minutes, 0);
  const plannedDays = preview?.plannedDays ?? [];
  const conflicts = preview?.problems ?? [];
  const weekdays = countWeekdays(startDate, endDate);
  const awayDays = absences.reduce(
    (total, absence) => total + awayWeekdays(absence, startDate, endDate),
    0,
  );

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl bg-brand-subtle p-4 text-sm transition-opacity",
        isOutdated && "opacity-60",
      )}
      aria-busy={isOutdated}
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-foreground tabular-nums">
            {formatDuration(dailyMinutes)} a day
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatDuration(dayLimitMinutes)} working day
          </span>
        </div>

        <div
          className="flex h-2 overflow-hidden rounded-full bg-brand-muted"
          aria-hidden
        >
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                width: `${Math.min(100, (row.minutes / dayLimitMinutes) * 100)}%`,
                backgroundColor: row.projectId
                  ? getProjectColor(row.projectId)
                  : "var(--muted-foreground)",
              }}
            />
          ))}
        </div>
      </div>

      {dailyMinutes > dayLimitMinutes && (
        <p className="text-destructive-text">
          That is more than a working day. Lower the hours to save.
        </p>
      )}

      {!preview && refusal.length === 0 && !failed && (
        <p className="text-muted-foreground">Checking the period…</p>
      )}

      {failed && (
        <p className="text-destructive-text" role="alert">
          The period could not be checked. Try again in a moment.
        </p>
      )}

      {preview && plannedDays.length > 0 && (
        <p className="text-foreground">
          <span className="font-medium">
            {plannedDays.length} working{" "}
            {plannedDays.length === 1 ? "day" : "days"}
          </span>{" "}
          to plan, {formatDayMonthLabel(plannedDays[0])} –{" "}
          {formatDayMonthLabel(plannedDays[plannedDays.length - 1])}
          {isOutdated && (
            <span className="text-muted-foreground"> (updating…)</span>
          )}
        </p>
      )}

      {preview && plannedDays.length === 0 && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            No working days to plan in this period.
          </p>
          <p className="text-muted-foreground">
            {awayDays >= weekdays && weekdays > 0
              ? `${firstName} is away on every weekday. Choose another period, or change the absence from its day in the grid.`
              : weekdays === 0
                ? "It holds only weekends. Choose another period."
                : `${firstName}'s account did not exist yet. Choose a later period.`}
          </p>
        </div>
      )}

      {absences.length > 0 && (
        <p className="text-muted-foreground">
          Away {awayDays} {awayDays === 1 ? "day" : "days"}, skipped:{" "}
          {[...absences]
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .map(
              (absence) =>
                `${ABSENCE_TYPE_LABELS[absence.type]} ${formatAbsenceRange(absence)}`,
            )
            .join(", ")}
        </p>
      )}

      {existingPlans.length > 0 && (
        <p className="text-muted-foreground">
          Already planned: {summarisePlans(existingPlans).join(" · ")}. Listed
          projects get the new hours; other projects stay.
        </p>
      )}

      {(conflicts.length > 0 || refusal.length > 0) && (
        <div className="space-y-1 text-destructive-text" role="alert">
          <p className="font-medium">
            {refusal.length > 0
              ? "This period can't be planned."
              : `Doesn't fit on ${conflicts.length} ${conflicts.length === 1 ? "day or week" : "days or weeks"}:`}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            {[...refusal, ...conflicts].map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          {conflicts.length > 0 && (
            <p>
              Lower the hours or change the period. Nothing is saved until
              everything fits.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

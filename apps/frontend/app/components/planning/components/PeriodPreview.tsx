import { Absence, PeriodPreview as Preview } from "@/types";
import {
  addDays,
  formatDuration,
  fromISODate,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { getProjectColor } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { DayShare } from "./period-lines";

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

type PeriodPreviewProps = {
  firstName: string;
  startDate: string;
  endDate: string;
  dayLimitMinutes: number;
  /** The fullest working day saving would leave, for the total and the bar. */
  busiestDay: { minutes: number; shares: DayShare[]; isSameEveryDay: boolean };
  /** What saving changes, one line per project: "add Support, 1h on 19 working days". */
  changes: string[];
  /** The server's answer; none while the first one loads. */
  preview?: Preview;
  isOutdated: boolean;
  /** A refusal the server gave instead of a preview. */
  refusal: string[];
  /** The preview could not be fetched at all. */
  failed: boolean;
  absences: Absence[];
};

/**
 * What saving would do, before it is saved: the fullest day, each change, the
 * absences skipped and anything that does not fit.
 */
export const PeriodPreview = ({
  firstName,
  startDate,
  endDate,
  dayLimitMinutes,
  busiestDay,
  changes,
  preview,
  isOutdated,
  refusal,
  failed,
  absences,
}: PeriodPreviewProps) => {
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
            {busiestDay.isSameEveryDay ? "" : "Up to "}
            {formatDuration(busiestDay.minutes)} a day
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatDuration(dayLimitMinutes)} working day
          </span>
        </div>

        <div
          className="flex h-2 overflow-hidden rounded-full bg-brand-muted"
          aria-hidden
        >
          {busiestDay.shares.map((share) => (
            <div
              key={share.projectId}
              style={{
                width: `${Math.min(100, (share.minutes / dayLimitMinutes) * 100)}%`,
                backgroundColor: getProjectColor(share.projectId),
              }}
            />
          ))}
        </div>
      </div>

      {!preview && refusal.length === 0 && !failed && (
        <p className="text-muted-foreground">Checking the period…</p>
      )}

      {failed && (
        <p className="text-destructive-text" role="alert">
          The period could not be checked. Try again in a moment.
        </p>
      )}

      {preview && changes.length > 0 && (
        <div className="space-y-1 text-foreground">
          <p className="font-medium">
            Saving will
            {isOutdated && (
              <span className="font-normal text-muted-foreground">
                {" "}
                (updating…)
              </span>
            )}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
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

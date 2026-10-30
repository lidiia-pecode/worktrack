"use client";

import { Ref, useEffect, useRef } from "react";
import { Lock, Plus } from "lucide-react";

import { PlanningEntry, TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  formatDayMonthLabel,
  formatDuration,
  formatLongDayLabel,
  formatWeekdayLabel,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { getProjectColor } from "@/lib/utils/project-colors";
import { getTimelogDisplay } from "@/lib/utils/timelog";

import { Badge } from "@/components/ui/badge";

import { dayFill } from "../helpers/day-fill";
import { TimesheetDay, dayActions } from "../helpers/day-state";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

type WeekDayListProps = {
  days: TimesheetDay[];
  todayIso: string;
  /** The previous week is still shown while this one loads. */
  isBusy?: boolean;
  className?: string;
  /** With a project when it comes from that project's plan. */
  onAddClick: (date: Date, projectId?: string) => void;
  onAbsenceClick: (date: Date) => void;
  onEntryClick: (timelog: TimeLog) => void;
};

/**
 * The week as a list of days, for a screen too narrow for the grid: each
 * entry, plan and absence shows its details in its row, so nothing is only on
 * hover. A day offers what its column in the grid does.
 */
export const WeekDayList = ({
  days,
  todayIso,
  isBusy = false,
  className,
  onAddClick,
  onAbsenceClick,
  onEntryClick,
}: WeekDayListProps) => {
  const todayRef = useRef<HTMLElement>(null);
  const firstDayIso = days[0] ? toISODate(days[0].date) : "";

  // The current week opens at today. A hidden list (the grid is shown) has no
  // offset parent and stays put.
  useEffect(() => {
    const today = todayRef.current;
    if (today?.offsetParent) today.scrollIntoView({ block: "start" });
  }, [firstDayIso, todayIso]);

  return (
    <div aria-busy={isBusy} className={cn("flex flex-col", className)}>
      {days.map((day) => {
        const iso = toISODate(day.date);

        return (
          <DayRow
            key={iso}
            ref={iso === todayIso ? todayRef : undefined}
            day={day}
            isToday={iso === todayIso}
            onAddClick={onAddClick}
            onAbsenceClick={onAbsenceClick}
            onEntryClick={onEntryClick}
          />
        );
      })}
    </div>
  );
};

type DayRowProps = Pick<
  WeekDayListProps,
  "onAddClick" | "onAbsenceClick" | "onEntryClick"
> & {
  ref?: Ref<HTMLElement>;
  day: TimesheetDay;
  isToday: boolean;
};

const DayRow = ({
  ref,
  day,
  isToday,
  onAddClick,
  onAbsenceClick,
  onEntryClick,
}: DayRowProps) => {
  const { date, absence, timelogs, plannedEntries, totalMinutes } = day;
  const { opensAbsence, canAddEntry, showsPlan } = dayActions(day);
  const weekend = isWeekend(date);
  const longLabel = formatLongDayLabel(date);
  const label = `${formatWeekdayLabel(date)} ${formatDayMonthLabel(toISODate(date))}`;

  const fill =
    dayFill({
      isAbsent: Boolean(absence),
      isWeekend: weekend,
      minutes: totalMinutes,
    }) ??
    (isToday ? "bg-brand-subtle" : day.isLocked ? "bg-muted/20" : undefined);
  // The rows reach into the page's padding, so their text lines up with the toolbar.
  const sectionClass = cn(
    "-mx-3 flex flex-col gap-2 border-b border-border px-3 py-2",
    fill,
  );

  const title = (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "text-sm font-semibold whitespace-nowrap",
          isToday ? "text-brand" : "text-foreground",
        )}
      >
        {label}
        {weekend && (
          <span className="font-normal text-muted-foreground"> · Weekend</span>
        )}
      </span>
      {isToday && (
        <span className="rounded-full bg-brand-muted px-1.5 text-2xs font-semibold text-brand">
          Today
        </span>
      )}
      {day.isLocked && (
        <Lock
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-label="Locked"
        />
      )}
    </span>
  );

  if (absence) {
    const absenceContent = (
      <>
        {/* The button's name already says which day. */}
        <span aria-hidden>{title}</span>
        <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
            {ABSENCE_TYPE_LABELS[absence.type]}
          </span>
          {absence.note && (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {absence.note}
            </span>
          )}
          {day.isAbsenceLocked && !day.isLocked && (
            <span className="text-xs text-muted-foreground">
              Part of it is in a locked month
            </span>
          )}
        </span>
      </>
    );
    const rowClass =
      "flex min-h-11 w-full items-center justify-between gap-3 text-left";

    return (
      <section ref={ref} className={sectionClass}>
        {opensAbsence ? (
          <button
            type="button"
            onClick={() => onAbsenceClick(date)}
            className={cn(rowClass, "cursor-pointer rounded-md", FOCUS_RING)}
          >
            <span className="sr-only">
              {day.isEditable ? "Edit" : "View"} the absence on {longLabel}:
            </span>
            {absenceContent}
          </button>
        ) : (
          <div className={rowClass}>{absenceContent}</div>
        )}

        {timelogs.length > 0 && (
          <EntryRows day={day} onEntryClick={onEntryClick} />
        )}
      </section>
    );
  }

  return (
    <section ref={ref} className={sectionClass}>
      <div className="flex min-h-11 items-center gap-2">
        <h2 className="shrink-0">{title}</h2>
        <DayFigure day={day} showsPlan={showsPlan} />
        {canAddEntry && (
          <button
            type="button"
            aria-label={`Log time on ${longLabel}`}
            onClick={() => onAddClick(date)}
            className={cn(
              "-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-brand/8",
              weekend ? "text-muted-foreground" : "text-brand",
              FOCUS_RING,
            )}
          >
            <Plus className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {showsPlan &&
        plannedEntries.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            dayLabel={longLabel}
            onClick={
              canAddEntry ? () => onAddClick(date, plan.project.id) : undefined
            }
          />
        ))}

      {timelogs.length > 0 && (
        <EntryRows day={day} onEntryClick={onEntryClick} />
      )}
    </section>
  );
};

/** The day's time against what was expected, or why there is none yet. */
const DayFigure = ({
  day,
  showsPlan,
}: {
  day: TimesheetDay;
  showsPlan: boolean;
}) => {
  const { totalMinutes, expectedMinutes, plannedEntries } = day;
  const expectsTime = expectedMinutes !== undefined && expectedMinutes > 0;

  if (totalMinutes > 0) {
    // A weekend expects nothing, so all of its time is over.
    const overMinutes =
      expectedMinutes === undefined ? 0 : totalMinutes - expectedMinutes;

    return (
      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
        <span
          className={cn(
            "font-semibold",
            overMinutes > 0 ? "text-warning-text" : "text-foreground",
          )}
        >
          {formatDuration(totalMinutes)}
        </span>
        {expectsTime && (
          <span className="text-muted-foreground">
            / {formatDuration(expectedMinutes)}
          </span>
        )}
        {overMinutes > 0 && (
          <Badge
            variant="warning"
            className="px-1.5 py-0.5 text-2xs font-semibold"
          >
            +{formatDuration(overMinutes)}
          </Badge>
        )}
      </span>
    );
  }

  if (showsPlan) {
    const plannedMinutes = plannedEntries.reduce(
      (sum, plan) => sum + plan.plannedMinutes,
      0,
    );
    return (
      <span className="ml-auto min-w-0 text-right text-sm text-muted-foreground tabular-nums">
        {formatDuration(plannedMinutes)} planned
      </span>
    );
  }

  if (!expectsTime) return null;

  return (
    <span className="ml-auto min-w-0 text-right text-sm text-muted-foreground tabular-nums">
      {day.canLogTime && (
        <>
          <span className="whitespace-nowrap">No time logged ·</span>{" "}
        </>
      )}
      <span className="whitespace-nowrap">
        {formatDuration(expectedMinutes)} expected
      </span>
    </span>
  );
};

const EntryRows = ({
  day,
  onEntryClick,
}: {
  day: TimesheetDay;
  onEntryClick: (timelog: TimeLog) => void;
}) => (
  <div className="flex flex-col gap-2">
    {day.timelogs.map((timelog) => (
      <EntryRow
        key={timelog.id}
        timelog={timelog}
        onClick={day.isEditable ? () => onEntryClick(timelog) : undefined}
      />
    ))}
  </div>
);

const ROW_CLASS =
  "flex min-h-11 w-full gap-3 rounded-lg px-3 py-2.5 text-left text-sm ring-1 ring-foreground/5";

/** An entry with everything the desktop card shows; it opens the entry on an editable day. */
const EntryRow = ({
  timelog,
  onClick,
}: {
  timelog: TimeLog;
  onClick?: () => void;
}) => {
  const { colorSeed, projectName, activityName } = getTimelogDisplay(timelog);
  const color = getProjectColor(colorSeed);
  // The project colour is translucent, so it sits on the card colour.
  const style = {
    backgroundColor: "var(--card)",
    backgroundImage: `linear-gradient(${color}, ${color})`,
  };
  const content = (
    <>
      <span className="w-14 shrink-0 font-semibold text-foreground tabular-nums">
        {formatDuration(timelog.minutes)}
      </span>
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="break-words text-foreground">
          {projectName} · {activityName}
        </span>
        {timelog.note && (
          <span className="break-words text-xs text-foreground/70">
            {timelog.note}
          </span>
        )}
        {!timelog.isBillable && (
          <span className="rounded bg-muted/40 px-1.5 text-2xs text-muted-foreground">
            Non-billable
          </span>
        )}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={ROW_CLASS} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ROW_CLASS,
        "cursor-pointer transition-[filter] hover:brightness-105",
        FOCUS_RING,
      )}
      style={style}
    >
      {content}
    </button>
  );
};

/** A plan on a day with nothing logged yet; opening it logs time on its project. */
const PlanRow = ({
  plan,
  dayLabel,
  onClick,
}: {
  plan: PlanningEntry;
  dayLabel: string;
  onClick?: () => void;
}) => {
  const color = getProjectColor(plan.project.id);
  const duration = formatDuration(plan.plannedMinutes);
  // Fainter than an entry, so it reads as time not yet worked.
  const style = {
    backgroundColor: `oklch(from ${color} l c h / 0.1)`,
    borderColor: `oklch(from ${color} l c h / 0.7)`,
  };
  const className = cn(
    "flex min-h-11 w-full gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground",
    onClick && cn("cursor-pointer hover:brightness-95", FOCUS_RING),
  );
  const content = (
    <>
      <span className="w-14 shrink-0 font-semibold text-foreground/70 tabular-nums">
        {duration}
      </span>
      <span className="min-w-0 break-words">{plan.project.name} · planned</span>
    </>
  );

  if (!onClick) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Log time on ${dayLabel} for ${plan.project.name} (planned ${duration})`}
      onClick={onClick}
      className={className}
      style={style}
    >
      {content}
    </button>
  );
};

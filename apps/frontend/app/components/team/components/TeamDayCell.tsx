"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Absence, PlanningEntry, TimeLog } from "@/types";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
} from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";

import { TimelogPopover } from "../../timesheet/components/TimelogPopover";
import { dayFill, isOverFill } from "../../timesheet/helpers/day-fill";
import { TimelogChip } from "./TimelogChip";

/** More than this folds behind "+N more", so one busy day doesn't stretch the row. */
const VISIBLE_ENTRIES = 3;

type TeamDayCellProps = {
  date: Date;
  personName: string;
  entries: TimeLog[];
  minutes: number;
  absence?: Absence;
  /** Shown where nothing is logged and no absence covers the day. */
  plans?: PlanningEntry[];
  /** The person's figure for the day; without it nothing is over or missing. */
  expectedMinutes?: number;
  isLocked: boolean;
  /** The day has ended, so a working day without time is flagged. */
  isPast: boolean;
  /** A form for this day waits for the person's activities to load. */
  isBusy?: boolean;
  // Each action is offered only where it is allowed.
  onEditEntry?: (timelog: TimeLog) => void;
  onAdd?: () => void;
  onAbsenceClick?: () => void;
  onPlanClick?: (projectId: string) => void;
};

export const TeamDayCell = ({
  date,
  personName,
  entries,
  minutes,
  absence,
  plans = [],
  expectedMinutes,
  isLocked,
  isPast,
  isBusy = false,
  onEditEntry,
  onAdd,
  onAbsenceClick,
  onPlanClick,
}: TeamDayCellProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovered, setHovered] = useState<{
    timelogId: string;
    anchor: HTMLElement;
  } | null>(null);

  const fill = dayFill({
    isAbsent: Boolean(absence),
    isWeekend: isWeekend(date),
    minutes,
    expectedMinutes,
  });
  const isWithoutTime =
    isPast && !absence && minutes === 0 && (expectedMinutes ?? 0) > 0;
  // Once any time is logged, the record replaces the plan.
  const showsPlans = !absence && entries.length === 0 && plans.length > 0;
  const hiddenCount = entries.length - VISIBLE_ENTRIES;
  const shownEntries =
    isExpanded || hiddenCount <= 0
      ? entries
      : entries.slice(0, VISIBLE_ENTRIES);
  const dayLabel = formatLongDayLabel(date);

  // Read from the current entries: a deleted entry's block unmounts without a
  // mouse leave, so its card must not outlive it.
  const hoveredTimelog =
    hovered && entries.find((timelog) => timelog.id === hovered.timelogId);

  return (
    <td
      aria-busy={isBusy}
      className={cn(
        "group h-px border-r border-border/60 p-0 align-top",
        fill ?? (isLocked && "bg-muted/20"),
        isBusy && "cursor-progress opacity-60",
      )}
    >
      <div className="flex h-full min-h-21 flex-col gap-0.75 px-1.25 pt-1 pb-1.25">
        <span
          className={cn(
            "flex h-4 shrink-0 items-center justify-end gap-1.5 pr-0.5 text-2xs font-medium tabular-nums",
            isOverFill(fill) ? "text-warning-text" : "text-muted-foreground",
          )}
        >
          {minutes > 0 && formatDuration(minutes)}

          {isWithoutTime && (
            <>
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-warning"
              />
              No time
            </>
          )}
        </span>

        {absence &&
          (onAbsenceClick ? (
            <button
              type="button"
              onClick={onAbsenceClick}
              aria-label={`${ABSENCE_TYPE_SHORT_LABELS[absence.type]}, open the absence`}
              className="mt-1 self-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge
                variant="default"
                className="cursor-pointer text-2xs transition-colors hover:bg-brand-subtle"
              >
                {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
              </Badge>
            </button>
          ) : (
            <Badge variant="default" className="mt-1 self-center text-2xs">
              {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
            </Badge>
          ))}

        {shownEntries.map((timelog) => (
          <TimelogChip
            key={timelog.id}
            timelog={timelog}
            onClick={onEditEntry}
            onHover={(hoveredLog, anchor) =>
              setHovered({ timelogId: hoveredLog.id, anchor })
            }
            onLeave={() => setHovered(null)}
          />
        ))}

        {showsPlans &&
          plans.map((plan) => (
            <PlanBlock
              key={plan.id}
              plan={plan}
              dayLabel={dayLabel}
              onClick={onPlanClick}
            />
          ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="self-start rounded-sm px-0.5 text-2xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isExpanded ? "Show less" : `+${hiddenCount} more`}
          </button>
        )}

        {onAdd && !absence && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Log time for ${personName} on ${dayLabel}`}
            className="flex min-h-4.5 flex-1 cursor-pointer items-center justify-center rounded-md text-muted-foreground/45 transition-colors group-hover:bg-brand/8 group-hover:text-brand hover:bg-brand/8 hover:text-brand focus-visible:bg-brand/8 focus-visible:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {hovered && hoveredTimelog && (
        <TimelogPopover timelog={hoveredTimelog} anchor={hovered.anchor} />
      )}
    </td>
  );
};

type PlanBlockProps = {
  plan: PlanningEntry;
  dayLabel: string;
  onClick?: (projectId: string) => void;
};

/** A plan on a day with nothing logged yet, fainter than an entry. */
const PlanBlock = ({ plan, dayLabel, onClick }: PlanBlockProps) => {
  const color = getProjectColor(plan.project.id);
  const duration = formatDuration(plan.plannedMinutes);
  const className = cn(
    "flex h-5 w-full min-w-0 items-center rounded-md border border-dashed px-1.5 text-left text-2xs leading-none text-muted-foreground",
    onClick &&
      "cursor-pointer transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  );
  const style = {
    backgroundColor: `oklch(from ${color} l c h / 0.1)`,
    borderColor: `oklch(from ${color} l c h / 0.7)`,
  };
  const content = (
    <span className="truncate">
      {duration} planned · {plan.project.name}
    </span>
  );

  if (!onClick) {
    return (
      <span className={className} style={style}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Log time on ${dayLabel} for ${plan.project.name} (planned ${duration})`}
      onClick={() => onClick(plan.project.id)}
      className={className}
      style={style}
    >
      {content}
    </button>
  );
};

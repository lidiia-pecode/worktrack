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

import { TimelogPopover } from "../../timesheet/components/TimelogPopover";
import { dayFill } from "../../timesheet/helpers/day-fill";
import { EntryChip } from "../../shared/week/EntryChip";
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

  // A weekend's column is narrow, so its chips show the colour and hours.
  const isNarrow = isWeekend(date);
  const fill = dayFill({
    isAbsent: Boolean(absence),
    isWeekend: isNarrow,
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
      <div className="relative flex h-full min-h-11 flex-col">
        {/* The day's empty space logs time; its entries sit above it, each
            opening its own form, so no button holds another. */}
        {onAdd && !absence && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Log time for ${personName} on ${dayLabel}`}
            title={
              minutes > 0 ? `${formatDuration(minutes)} logged` : undefined
            }
            className="group/add absolute inset-0 cursor-pointer transition-colors hover:bg-brand/8 focus-visible:bg-brand/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <Plus
              aria-hidden
              className="absolute right-1 bottom-0.5 size-3.5 text-brand opacity-0 transition-opacity group-hover:opacity-50 group-hover/add:opacity-100 group-focus-visible/add:opacity-100"
            />
          </button>
        )}

        {/* A strip under the entries stays free, so a full day still takes
            another; its "+" shows while the day is hovered. */}
        <div className="pointer-events-none relative flex flex-1 flex-col gap-0.75 px-1.25 pt-1.25 pb-4 *:pointer-events-auto">
          {isWithoutTime && (
            <span
              className={cn(
                "pointer-events-none! flex h-5 shrink-0 items-center justify-center gap-1.5 text-2xs font-medium text-muted-foreground",
                // Alone in the cell it sits in the middle.
                !showsPlans && "my-auto",
              )}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-warning"
              />
              No time
            </span>
          )}

          {absence &&
            (onAbsenceClick ? (
              <button
                type="button"
                onClick={onAbsenceClick}
                aria-label={`${ABSENCE_TYPE_SHORT_LABELS[absence.type]}, open the absence`}
                className="my-auto self-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge
                  variant="default"
                  className="cursor-pointer text-2xs transition-colors hover:bg-brand-subtle"
                >
                  {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
                </Badge>
              </button>
            ) : (
              <Badge variant="default" className="my-auto self-center text-2xs">
                {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
              </Badge>
            ))}

          {shownEntries.map((timelog) => (
            <TimelogChip
              key={timelog.id}
              timelog={timelog}
              isCompact={isNarrow}
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
        </div>
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

/** A plan on a day with nothing logged yet, dashed as on Planning. */
const PlanBlock = ({ plan, dayLabel, onClick }: PlanBlockProps) => {
  const duration = formatDuration(plan.plannedMinutes);

  return (
    <EntryChip
      projectName={plan.project.name}
      colorSeed={plan.project.id}
      minutes={plan.plannedMinutes}
      isPlan
      onClick={onClick && (() => onClick(plan.project.id))}
      // Named as a plan when it is no button too.
      role={onClick ? undefined : "group"}
      aria-label={
        onClick
          ? `Log time on ${dayLabel} for ${plan.project.name} (planned ${duration})`
          : `${plan.project.name}, planned ${duration}`
      }
    />
  );
};

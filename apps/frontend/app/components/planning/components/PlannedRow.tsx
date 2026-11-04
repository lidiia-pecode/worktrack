"use client";

import { ReactNode } from "react";
import { Clock, Trash2 } from "lucide-react";

import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { PLAN_MINUTE_STEP, isOnPlanStep, toPlanStep } from "../plan-minutes";
import { ListedLine } from "./period-lines";

type PlannedRowProps = {
  line: ListedLine;
  /** Under the name: the days on a period, the note on a day. */
  detail: ReactNode;
  /** "Hours" on a day, "Hours a day" over a period: the picker's name. */
  hoursLabel: string;
  /** The new hours, unsaved; none while the row is as planned. */
  editedMinutes?: number;
  /** Whether the person is still on the project, so its hours can change. */
  isOnProject: boolean;
  /** The person's own day: the most a project's plan can take. */
  maxMinutes: number;
  formId: string;
  /** Applies a change to the row's unsaved hours; none keeps it as planned. */
  onEdit: (update: (minutes: number | undefined) => number | undefined) => void;
  onDelete: () => void;
};

/**
 * A project already planned: its hours changed in place, or deleted with the
 * bin. Hours that differ by day are set together, from "Set hours". While the
 * hours are wrong, the detail line says so instead, so the row keeps its height.
 */
export const PlannedRow = ({
  line,
  detail,
  hoursLabel,
  editedMinutes,
  isOnProject,
  maxMinutes,
  formId,
  onEdit,
  onDelete,
}: PlannedRowProps) => {
  const isEdited = editedMinutes !== undefined;
  // Deleting the project's plans is the bin's job, so no hours is a mistake.
  const hasNoHours = editedMinutes === 0;
  const isOffStep = editedMinutes !== undefined && !isOnPlanStep(editedMinutes);
  const canChangeHours = !line.isArchived && isOnProject;
  const shownMinutes = editedMinutes ?? line.sameMinutes ?? 0;
  // The picker reports the hours, then the minutes, so each part applies to
  // the latest total. Back at the planned hours, the row is as it was.
  const setPart = (part: "hours" | "minutes") => (value: number) =>
    onEdit((current) => {
      const total = current ?? line.sameMinutes ?? 0;
      const next =
        part === "hours"
          ? value * 60 + (total % 60)
          : Math.floor(total / 60) * 60 + value;
      return next === line.sameMinutes ? undefined : next;
    });

  return (
    <li className="flex items-center gap-3 py-2 pr-2 pl-3">
      <ProjectColorDot projectId={line.projectId} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{line.name}</span>
          {line.isArchived ? (
            <Badge variant="neutral">Archived</Badge>
          ) : (
            !isOnProject && <Badge variant="neutral">Not on this project</Badge>
          )}
        </p>

        <div
          className={cn(
            "flex flex-wrap items-center gap-x-1 text-xs",
            hasNoHours || isOffStep
              ? "text-destructive-text"
              : "text-muted-foreground",
          )}
        >
          {hasNoHours ? (
            "Enter hours, or delete the plan"
          ) : isOffStep ? (
            `Plan in ${PLAN_MINUTE_STEP}-minute steps`
          ) : (
            <>
              {detail}
              {isEdited && line.sameMinutes !== null && (
                <span className="font-medium text-brand">
                  · was {formatDuration(line.sameMinutes)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {canChangeHours &&
        (line.sameMinutes === null && !isEdited ? (
          <Button
            type="button"
            variant="outline"
            // The most common hours, on the step and within the person's day.
            onClick={() =>
              onEdit(() =>
                Math.min(
                  maxMinutes,
                  Math.max(PLAN_MINUTE_STEP, toPlanStep(line.commonMinutes)),
                ),
              )
            }
            aria-label={`Set the same hours for ${line.name} on all ${line.days.length} days`}
            title={`Give all ${line.days.length} days the same hours. To change one day, open it in the grid.`}
            className="text-brand"
          >
            <Clock className="size-3.5" />
            Set hours
          </Button>
        ) : (
          <TimePicker
            aria-label={`${hoursLabel} for ${line.name}`}
            hours={Math.floor(shownMinutes / 60)}
            minutes={shownMinutes % 60}
            minuteStep={PLAN_MINUTE_STEP}
            maxMinutes={maxMinutes}
            formId={formId}
            onHoursChange={setPart("hours")}
            onMinutesChange={setPart("minutes")}
            error={hasNoHours || isOffStep}
            className={cn(
              !hasNoHours &&
                !isOffStep &&
                isEdited &&
                "border-brand/40 bg-brand-subtle",
            )}
          />
        ))}

      <Button
        type="button"
        variant="ghostDestructive"
        size="iconSm"
        aria-label={`Delete the ${line.name} plan`}
        title="Delete plan"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
};

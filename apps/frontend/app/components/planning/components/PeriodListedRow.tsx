"use client";

import { Clock, Trash2 } from "lucide-react";

import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { ListedLine, describeDays, setHoursDetail } from "./period-lines";

type PeriodListedRowProps = {
  line: ListedLine;
  workingDays: string[];
  /** The new hours, unsaved; none while the row is as planned. */
  editedMinutes?: number;
  /** Whether the person is still on the project, so its hours can change. */
  isOnProject: boolean;
  minuteStep: number;
  formId: string;
  /** Applies a change to the row's unsaved hours; none keeps it as planned. */
  onEdit: (update: (minutes: number | undefined) => number | undefined) => void;
  onDelete: () => void;
};

/**
 * A project already planned in the period: its days, and hours that apply to
 * those days only. Hours that differ by day are set together, from "Set hours".
 */
export const PeriodListedRow = ({
  line,
  workingDays,
  editedMinutes,
  isOnProject,
  minuteStep,
  formId,
  onEdit,
  onDelete,
}: PeriodListedRowProps) => {
  const isEdited = editedMinutes !== undefined;
  // Deleting the project's plans is the bin's job, so no hours is a mistake.
  const hasNoHours = editedMinutes === 0;
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

        <p className="text-xs text-muted-foreground">
          {line.sameMinutes === null && isEdited ? (
            <>
              {setHoursDetail(line)} ·{" "}
              <button
                type="button"
                onClick={() => onEdit(() => undefined)}
                className="font-medium text-brand underline underline-offset-2"
              >
                Keep as is
              </button>
            </>
          ) : (
            <>
              {describeDays(line, workingDays)}
              {isEdited && line.sameMinutes !== null && (
                <span className="font-medium text-brand">
                  {" "}
                  · was {formatDuration(line.sameMinutes)}
                </span>
              )}
            </>
          )}
        </p>

        {hasNoHours && (
          <p className="text-xs text-destructive-text">
            Enter hours greater than 0, or delete it with the bin.
          </p>
        )}
      </div>

      {canChangeHours &&
        (line.sameMinutes === null && !isEdited ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(() => line.commonMinutes)}
            aria-label={`Set the same hours for ${line.name} on all ${line.days.length} days`}
            className="h-10 border-border bg-transparent text-brand"
          >
            <Clock className="size-3.5" />
            Set hours
          </Button>
        ) : (
          <TimePicker
            aria-label={`Hours a day for ${line.name}`}
            hours={Math.floor(shownMinutes / 60)}
            minutes={shownMinutes % 60}
            minuteStep={minuteStep}
            formId={formId}
            onHoursChange={setPart("hours")}
            onMinutesChange={setPart("minutes")}
            error={hasNoHours}
            className={cn(
              "h-10 bg-transparent",
              !hasNoHours &&
                (isEdited
                  ? "border-brand/40 bg-brand-subtle"
                  : "border-border"),
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

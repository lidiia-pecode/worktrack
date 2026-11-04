"use client";

import { Plus, X } from "lucide-react";
import type { FieldErrors } from "react-hook-form";

import { PlanningProjectOption } from "@/types";
import { NOTE_MAX_LENGTH } from "@/lib/forms/schemas/note.schema";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";

import { FormSelect } from "../../shared/FormSelect";
import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { PLAN_MINUTE_STEP } from "../plan-minutes";
import { AddedLine } from "./plan-lines";

type PlanLinesProps = {
  lines: AddedLine[];
  /** One stable key per line, from the form's field array. */
  keys: string[];
  errors?: FieldErrors<AddedLine>[];
  /** "Hours" on a day, "Hours a day" over a period. */
  hoursLabel: string;
  /** The projects the person can be planned on. */
  projects: PlanningProjectOption[];
  /** Projects no new line may choose: the ones planned or chosen already. */
  takenIds: string[];
  /** A line's project the period already lists above; such a line isn't saved. */
  isListedAbove?: (projectId: string) => boolean;
  /** The most a line's picker reaches. */
  maxMinutes: (index: number) => number;
  /** Under each line while nothing is wrong: what fits. */
  hint: string;
  formId: string;
  /** A note under the line, on a day. */
  withNote?: boolean;
  canAddLine: boolean;
  onChange: (index: number, patch: Partial<AddedLine>) => void;
  onRemove: (index: number) => void;
  onAppend: () => void;
};

const LISTED_ABOVE = "Already planned in this period. Change it above.";

/**
 * The plans to add: a line per project with its hours, dropped with the ×,
 * and "Add project" for the next. One line beneath each says what fits, or
 * what is wrong, so nothing moves when a line is checked.
 */
export const PlanLines = ({
  lines,
  keys,
  errors,
  hoursLabel,
  projects,
  takenIds,
  isListedAbove = () => false,
  maxMinutes,
  hint,
  formId,
  withNote = false,
  canAddLine,
  onChange,
  onRemove,
  onAppend,
}: PlanLinesProps) => {
  const projectName = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name;
  const freeProjectCount = projects.filter(
    (project) => !takenIds.includes(project.id),
  ).length;

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Projects to add</legend>

      {/* The lines' labels, once above them; each line's controls carry
          their own accessible names. */}
      <div
        aria-hidden
        className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] gap-2 text-xs font-medium text-muted-foreground"
      >
        <span>Project</span>
        <span>{hoursLabel}</span>
        <span />
      </div>

      {lines.map((line, index) => {
        const chosenId = line.projectId;
        // A blank line with nothing left to choose would only be in the way.
        if (!chosenId && freeProjectCount === 0) return null;
        const options = projects
          .filter(
            (project) =>
              project.id === chosenId || !takenIds.includes(project.id),
          )
          .map((project) => ({ value: project.id, label: project.name }));
        const lineErrors = errors?.[index];
        const projectError = isListedAbove(chosenId)
          ? LISTED_ABOVE
          : lineErrors?.projectId?.message;
        const hoursError = lineErrors?.hours?.message;
        const noteError = lineErrors?.note?.message;
        const message = projectError ?? hoursError ?? noteError;

        return (
          <div key={keys[index]} className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-start gap-2">
              <FormSelect
                aria-label={`Project ${index + 1}`}
                value={chosenId}
                onValueChange={(projectId) => onChange(index, { projectId })}
                options={options}
                placeholder="Select project"
                leading={<ProjectColorDot projectId={chosenId} />}
                // The message is on the line beneath; the field only turns red.
                triggerClassName={cn(
                  projectError &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
              />

              <TimePicker
                aria-label={`${hoursLabel} for project ${index + 1}`}
                hours={Number(line.hours)}
                minutes={Number(line.minutes)}
                minuteStep={PLAN_MINUTE_STEP}
                maxMinutes={maxMinutes(index)}
                formId={formId}
                onHoursChange={(hours) => onChange(index, { hours })}
                onMinutesChange={(minutes) => onChange(index, { minutes })}
                error={!!hoursError}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Drop the ${projectName(chosenId) ?? `project ${index + 1}`} line`}
                title="Drop this line"
                onClick={() => onRemove(index)}
                className="text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Always one line, so the fields never move when it changes. */}
            <p
              aria-live="polite"
              className={cn(
                "min-h-4 text-xs",
                message ? "text-destructive-text" : "text-muted-foreground",
              )}
            >
              {message ?? hint}
            </p>

            {withNote && (
              <Input
                aria-label={`Note for project ${index + 1}`}
                value={line.note ?? ""}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="Note (optional)"
                // The message is on the line above; the field only turns red.
                aria-invalid={!!noteError}
                className={cn(
                  noteError &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                onChange={(event) =>
                  onChange(index, { note: event.target.value })
                }
              />
            )}
          </div>
        );
      })}

      {canAddLine && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAppend}
          className="text-brand"
        >
          <Plus className="size-4" />
          Add project
        </Button>
      )}
    </fieldset>
  );
};

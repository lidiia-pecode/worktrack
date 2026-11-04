"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";

import { Absence, PlanningEntry, PlanningWeekRow } from "@/types";
import { useDeletePlan, usePlanPeriod } from "@/hooks/usePlanning";
import { getErrorMessages, isClientError } from "@/lib/api";
import {
  formatDayMonthLabel,
  formatDuration,
  formatLongDayLabel,
  fromISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";
import {
  NOTE_MAX_LENGTH,
  optionalNoteSchema,
} from "@/lib/forms/schemas/note.schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { FormAlert } from "../../shared/FormAlert";
import { ImpactDialog } from "../../shared/ImpactDialog";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { dayLimitOn, isOnPlanStep, toPlanStep } from "../plan-minutes";
import { PlannedRow } from "./PlannedRow";
import { PlanLines } from "./PlanLines";
import { PlanSummary } from "./PlanSummary";
import { listedLines } from "./period-lines";
import { EMPTY_LINE, addedLineMinutes, addedLineSchema } from "./plan-lines";

const FORM_ID = "planning-form";
// The one note problem a row can have: the field stops at the most allowed.
const NOTE_TOO_SHORT = "At least 3 characters";

const daySchema = z.object({ added: z.array(addedLineSchema) });

type DayFormData = z.infer<typeof daySchema>;

type PlanningDayModalProps = {
  row: PlanningWeekRow;
  date: string;
  /**
   * The absence covering the day, shown here only while a locked month
   * freezes it; an editable one opens its form straight from the grid.
   */
  absence?: Absence;
  onAddAbsence: () => void;
  onClose: () => void;
};

/**
 * Plans and changes a person's day in one save, as the period dialog does:
 * the day's plans are rows with their hours and note editable in place, the
 * lines beneath add projects, and "Save plan" sends the day as a one-day
 * period. A plan is deleted from its row at once.
 */
export const PlanningDayModal = ({
  row,
  date,
  absence,
  onAddAbsence,
  onClose,
}: PlanningDayModalProps) => {
  const planPeriod = usePlanPeriod();
  const remove = useDeletePlan();
  const [problems, setProblems] = useState<string[] | null>(null);
  const problemsRef = useRef<HTMLDivElement>(null);
  // Unsaved hours and notes of the plans already made, by project.
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [deletingEntry, setDeletingEntry] = useState<PlanningEntry | null>(
    null,
  );

  const dayEntries = useMemo(
    () => row.entries.filter((entry) => entry.date === date),
    [row.entries, date],
  );
  const lines = listedLines(dayEntries);
  const entryOf = (projectId: string) =>
    dayEntries.find((entry) => entry.project.id === projectId);
  const listedIds = lines.map((line) => line.projectId);
  // An edit outlives its row only until the row is deleted.
  const editedMinutes = new Map(
    Object.entries(edits).filter(([projectId]) =>
      listedIds.includes(projectId),
    ),
  );
  const editedNotes = new Map(
    Object.entries(noteEdits).filter(
      ([projectId, note]) =>
        listedIds.includes(projectId) &&
        note !== (entryOf(projectId)?.note ?? ""),
    ),
  );

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DayFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(daySchema) as any,
    defaultValues: { added: [EMPTY_LINE] },
  });
  const {
    fields,
    append,
    remove: removeLine,
  } = useFieldArray({
    control,
    name: "added",
  });
  const added = useWatch({ control, name: "added" });
  const setLine = (index: number, patch: Partial<(typeof added)[number]>) =>
    Object.entries(patch).forEach(([key, value]) =>
      setValue(`added.${index}.${key as keyof typeof patch}`, value, {
        shouldDirty: true,
      }),
    );

  const personProjects = row.projects;
  const projectName = (projectId: string) =>
    personProjects.find((project) => project.id === projectId)?.name ??
    entryOf(projectId)?.project.name ??
    "";
  const takenIds = [...listedIds, ...added.map((line) => line.projectId)];
  const freeProjectCount = personProjects.filter(
    (project) => !takenIds.includes(project.id),
  ).length;
  // Each blank line holds a place for one of the projects still free.
  const canAddLine =
    freeProjectCount > added.filter((line) => !line.projectId).length;
  // With every project planned and no line begun, there is nothing to show.
  const hasLinesToAdd =
    freeProjectCount > 0 || added.some((line) => line.projectId);
  const addedLines = added
    .map((line) => ({
      projectId: line.projectId,
      minutes: addedLineMinutes(line),
      note: line.note?.trim() || undefined,
    }))
    .filter((line) => line.projectId && line.minutes > 0);

  // What is planned once saved: the rows at their current hours, plus the
  // lines. The hours stop at what fits on the day and in the week beside
  // everything else, so a plan the API would refuse can't be entered, and
  // one already over can still be lowered.
  const rowMinutes = (projectId: string) =>
    editedMinutes.get(projectId) ?? entryOf(projectId)?.plannedMinutes ?? 0;
  const savedDayMinutes = dayEntries.reduce(
    (total, entry) => total + entry.plannedMinutes,
    0,
  );
  const dayMinutes =
    listedIds.reduce((total, projectId) => total + rowMinutes(projectId), 0) +
    addedLines.reduce((total, line) => total + line.minutes, 0);
  const dayLimitMinutes = dayLimitOn(row, date);
  const weekMinutes = row.plannedMinutes - savedDayMinutes + dayMinutes;
  const dayLeft = dayLimitMinutes - dayMinutes;
  const weekLeft = row.availableMinutes - weekMinutes;
  const fitsBeside = (current: number) =>
    toPlanStep(Math.max(current, current + Math.min(dayLeft, weekLeft)));
  const fitsMinutes = toPlanStep(Math.max(0, Math.min(dayLeft, weekLeft)));
  const fitsWhere =
    dayLeft <= weekLeft ? "on this day" : `in ${row.user.firstName}'s week`;
  const fitsHint =
    fitsMinutes > 0
      ? `Up to ${formatDuration(fitsMinutes)} fits ${fitsWhere}`
      : `Nothing more fits ${fitsWhere}`;

  const shares = [
    ...listedIds.map((projectId) => ({
      projectId,
      minutes: rowMinutes(projectId),
    })),
    ...addedLines,
  ];
  const changes = [
    ...lines.flatMap((line) => {
      const minutes = editedMinutes.get(line.projectId);
      const hoursChange =
        minutes !== undefined && minutes > 0
          ? `change ${line.name} from ${formatDuration(line.sameMinutes ?? 0)} to ${formatDuration(minutes)}`
          : null;
      const noteChange = editedNotes.has(line.projectId)
        ? `change the note of ${line.name}`
        : null;
      return [hoursChange, noteChange].filter(
        (change): change is string => change !== null,
      );
    }),
    ...addedLines.map(
      (line) =>
        `add ${projectName(line.projectId)}, ${formatDuration(line.minutes)}`,
    ),
  ];

  const payloadProjects = [
    ...listedIds
      .filter(
        (projectId) =>
          editedMinutes.has(projectId) || editedNotes.has(projectId),
      )
      .map((projectId) => ({
        projectId,
        minutesPerDay: rowMinutes(projectId),
        existingDaysOnly: true,
        ...(editedNotes.has(projectId) && {
          note: editedNotes.get(projectId)?.trim() || null,
        }),
      })),
    ...addedLines.map((line) => ({
      projectId: line.projectId,
      minutesPerDay: line.minutes,
      ...(line.note && { note: line.note }),
    })),
  ];
  // A row's note follows the shared rule: empty, or 3 to 1000 characters.
  const noteProblem = (projectId: string) =>
    optionalNoteSchema.safeParse(editedNotes.get(projectId) ?? "").error
      ?.issues[0]?.message;
  // Nothing saves until there is a change and every row is right.
  const cannotSave =
    payloadProjects.length === 0 ||
    [...editedMinutes.values()].some(
      (minutes) => minutes === 0 || !isOnPlanStep(minutes),
    ) ||
    [...editedNotes.keys()].some((projectId) => noteProblem(projectId));

  // The picker reports hours and minutes one after the other, so each update
  // applies to the latest edit.
  const editLine =
    (projectId: string) =>
    (update: (minutes: number | undefined) => number | undefined) =>
      setEdits((current) => {
        const { [projectId]: previous, ...others } = current;
        const next = update(previous);
        return next === undefined ? others : { ...others, [projectId]: next };
      });

  const hasNoProjects = personProjects.length === 0;
  const isBusy = planPeriod.isPending || remove.isPending;

  const onSubmit = async () => {
    setProblems(null);

    try {
      await planPeriod.mutateAsync({
        userId: row.user.id,
        startDate: date,
        endDate: date,
        projects: payloadProjects,
      });

      // As the period does: a saved day says so and closes.
      toast.success(
        `Plan saved for ${fullName(row.user)}, ${formatDayMonthLabel(date)}`,
      );
      onClose();
    } catch (error) {
      // Anything but a refusal has already been toasted by the hook.
      if (!isClientError(error)) return;

      setProblems(getErrorMessages(error));
    }
  };

  // A refusal is listed at the top of the form, which may be scrolled away.
  useEffect(() => {
    if (problems) problemsRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [problems]);

  const handleDelete = async () => {
    if (!deletingEntry) return;

    try {
      await remove.mutateAsync(deletingEntry.id);
      editLine(deletingEntry.project.id)(() => undefined);
    } catch {
      // Reported by the global mutation handler.
    } finally {
      setDeletingEntry(null);
    }
  };

  if (absence) {
    return (
      <ResourceFormModal
        open
        onClose={onClose}
        size="lg"
        title="Plan a day"
        description={`${fullName(row.user)} · ${formatLongDayLabel(fromISODate(date))} · away, nothing to plan`}
        footer={
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <Badge variant="default" dot>
              {ABSENCE_TYPE_LABELS[absence.type]}
            </Badge>
            <span>{formatAbsenceRange(absence)}</span>
          </div>

          {absence.note && (
            <p className="text-sm text-muted-foreground">{absence.note}</p>
          )}

          <p className="text-xs text-muted-foreground">
            This absence touches a locked month and cannot be changed.
          </p>
        </div>
      </ResourceFormModal>
    );
  }

  return (
    <>
      <ResourceFormModal
        open
        onClose={onClose}
        hasUnsavedChanges={
          isDirty || editedMinutes.size > 0 || editedNotes.size > 0
        }
        isBusy={isBusy}
        size="lg"
        title="Plan a day"
        description={`${fullName(row.user)} · ${formatLongDayLabel(fromISODate(date))}`}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAddAbsence}
              className="mr-auto"
              disabled={isBusy}
            >
              <CalendarOff className="size-4" />
              Add absence
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              isLoading={planPeriod.isPending}
              disabled={cannotSave}
            >
              Save plan
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {problems && (
            <div ref={problemsRef}>
              <FormAlert className="space-y-2">
                <p className="font-medium">Nothing was saved.</p>
                <ul className="list-disc space-y-1 pl-4">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </FormAlert>
            </div>
          )}

          {lines.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Planned this day
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {lines.map((line) => {
                  const entry = entryOf(line.projectId);
                  const isOnProject = personProjects.some(
                    (project) => project.id === line.projectId,
                  );
                  const note = noteEdits[line.projectId] ?? entry?.note ?? "";
                  const hasNoteProblem = !!noteProblem(line.projectId);
                  const noteErrorId = `${FORM_ID}-note-${line.projectId}-error`;

                  return (
                    <PlannedRow
                      key={line.projectId}
                      line={line}
                      hoursLabel="Hours"
                      detail={
                        isOnProject && !line.isArchived ? (
                          <>
                            <input
                              aria-label={`Note for ${line.name}`}
                              value={note}
                              maxLength={NOTE_MAX_LENGTH}
                              placeholder="Add a note"
                              aria-invalid={hasNoteProblem}
                              aria-describedby={
                                hasNoteProblem ? noteErrorId : undefined
                              }
                              onChange={(event) =>
                                setNoteEdits((current) => ({
                                  ...current,
                                  [line.projectId]: event.target.value,
                                }))
                              }
                              className={cn(
                                "min-w-0 flex-1 bg-transparent outline-none placeholder:text-input-placeholder focus:text-foreground",
                                hasNoteProblem && "text-destructive-text",
                              )}
                            />
                            {/* On the same line, so the row keeps its height. */}
                            {hasNoteProblem && (
                              <span
                                id={noteErrorId}
                                className="shrink-0 text-destructive-text"
                              >
                                {NOTE_TOO_SHORT}
                              </span>
                            )}
                          </>
                        ) : (
                          note
                        )
                      }
                      editedMinutes={editedMinutes.get(line.projectId)}
                      isOnProject={isOnProject}
                      maxMinutes={fitsBeside(rowMinutes(line.projectId))}
                      formId={FORM_ID}
                      onEdit={editLine(line.projectId)}
                      onDelete={() => entry && setDeletingEntry(entry)}
                    />
                  );
                })}
              </ul>
            </section>
          )}

          {hasNoProjects ? (
            <p className="text-sm text-muted-foreground">
              {row.user.firstName} is not on any active project. Add them to a
              project before planning.
            </p>
          ) : (
            hasLinesToAdd && (
              <PlanLines
                lines={added}
                keys={fields.map((field) => field.id)}
                errors={
                  errors.added as Parameters<typeof PlanLines>[0]["errors"]
                }
                hoursLabel="Hours"
                projects={personProjects}
                takenIds={takenIds}
                maxMinutes={(index) =>
                  fitsBeside(addedLineMinutes(added[index] ?? EMPTY_LINE))
                }
                hint={fitsHint}
                formId={FORM_ID}
                withNote
                canAddLine={canAddLine}
                onChange={setLine}
                onRemove={removeLine}
                onAppend={() => append(EMPTY_LINE)}
              />
            )
          )}

          <PlanSummary
            heading={
              dayMinutes > 0
                ? `${formatDuration(dayMinutes)} planned`
                : "Nothing planned"
            }
            dayLimitMinutes={dayLimitMinutes}
            shares={shares}
            changes={changes}
          />
        </form>
      </ResourceFormModal>

      <ImpactDialog
        isOpen={deletingEntry !== null}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
        title={
          deletingEntry ? `Delete the ${deletingEntry.project.name} plan?` : ""
        }
        description={
          deletingEntry &&
          `The plan for ${formatLongDayLabel(fromISODate(deletingEntry.date))} will be deleted. This can't be undone.`
        }
        confirmText="Delete"
        confirmVariant="destructive"
        loading={remove.isPending}
      />
    </>
  );
};

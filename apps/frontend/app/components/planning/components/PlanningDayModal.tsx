"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarOff, Pencil, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { Absence, PlanningEntry, PlanningWeekRow } from "@/types";
import { ProjectStatus } from "@/types/enums";
import { usePlanningMutations } from "@/hooks/usePlanning";
import {
  formatDuration,
  formatLongDayLabel,
  fromISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";
import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";

import { ImpactDialog } from "../../shared/ImpactDialog";
import { DiscardChangesModal } from "../../shared/DiscardChangesModal";
import { FormSelect } from "../../shared/FormSelect";
import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import {
  PLAN_MINUTE_STEP,
  dayLimitOn,
  isOnPlanStep,
  toPlanStep,
} from "../plan-minutes";

const FORM_ID = "planning-form";

const planSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    // The picker stops at what fits on the day, so only the floor is checked.
    hours: z.coerce.number().min(0),
    minutes: z.coerce.number().min(0).max(59),
    note: optionalNoteSchema,
  })
  .refine((data) => data.hours * 60 + data.minutes > 0, {
    message: "Enter a duration greater than 0",
    path: ["hours"],
  });

type PlanFormData = z.infer<typeof planSchema>;

const EMPTY_FORM: PlanFormData = {
  projectId: "",
  hours: 0,
  minutes: 0,
  note: "",
};

const toFormData = (entry: PlanningEntry): PlanFormData => ({
  projectId: entry.project.id,
  hours: Math.floor(entry.plannedMinutes / 60),
  minutes: entry.plannedMinutes % 60,
  note: entry.note ?? "",
});

const isArchivedEntry = (entry: PlanningEntry) =>
  entry.project.status === ProjectStatus.ARCHIVED;

/** "an 8h" but "a 7h 30m": the article follows how the hours are read out. */
const withArticle = (duration: string) =>
  `${/^(8|11|18)h/.test(duration) ? "an" : "a"} ${duration}`;

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

export const PlanningDayModal = ({
  row,
  date,
  absence,
  onAddAbsence,
  onClose,
}: PlanningDayModalProps) => {
  const { create, update, delete: remove } = usePlanningMutations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<PlanningEntry | null>(
    null,
  );

  const dayEntries = useMemo(
    () => row.entries.filter((entry) => entry.date === date),
    [row.entries, date],
  );

  const plannedMinutes = dayEntries.reduce(
    (total, entry) => total + entry.plannedMinutes,
    0,
  );

  const editing = dayEntries.find((entry) => entry.id === editingId) ?? null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<PlanFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(planSchema) as any,
    defaultValues: EMPTY_FORM,
  });

  const [hours, minutes] = useWatch({ control, name: ["hours", "minutes"] });

  // What still fits beside the day's other plans and the week's: the hours
  // stop there, so a plan the API would refuse can't be entered, and one
  // already over can still be lowered.
  const editedMinutes = editing?.plannedMinutes ?? 0;
  const dayLimitMinutes = dayLimitOn(row, date);
  const dayLeft = dayLimitMinutes - (plannedMinutes - editedMinutes);
  const weekLeft = row.availableMinutes - (row.plannedMinutes - editedMinutes);
  const fitsMinutes = toPlanStep(Math.max(0, Math.min(dayLeft, weekLeft)));
  const fitsWhere =
    dayLeft <= weekLeft ? "on this day" : `in ${row.user.firstName}'s week`;
  const fitsHint =
    fitsMinutes > 0
      ? `Up to ${formatDuration(fitsMinutes)} fits ${fitsWhere}`
      : `Nothing more fits ${fitsWhere}`;

  // Switching to another plan asks first while the form has unsaved changes,
  // as Escape does; the action waits for the answer. The footer's Cancel
  // closes without asking, as in every form.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const guardUnsaved = (action: () => void) => {
    if (isDirty) setPendingAction(() => action);
    else action();
  };

  // One plan per project per day: a project planned today is changed from its
  // own row, so only the plan being edited keeps its project here.
  const projectOptions = useMemo(() => {
    const options = row.projects
      .filter(
        (project) =>
          project.id === editing?.project.id ||
          !dayEntries.some((entry) => entry.project.id === project.id),
      )
      .map((project) => ({
        value: project.id,
        label: project.name,
      }));

    if (editing && !options.some((o) => o.value === editing.project.id)) {
      options.unshift({
        value: editing.project.id,
        label: editing.project.name,
      });
    }

    return options;
  }, [row.projects, dayEntries, editing]);

  const hasNoProjects = row.projects.length === 0;
  const hasNoOptions = projectOptions.length === 0;

  const startNew = () => {
    setEditingId(null);
    reset(EMPTY_FORM);
  };

  const startEditing = (entry: PlanningEntry) => {
    setEditingId(entry.id);
    reset(toFormData(entry));
  };

  const onSubmit = async (data: PlanFormData) => {
    const plannedMinutes = data.hours * 60 + data.minutes;
    // A plan from before the 15-minute steps saves as it is until its hours
    // change, as the API allows.
    const keepsHours = plannedMinutes === editing?.plannedMinutes;
    if (!keepsHours && !isOnPlanStep(plannedMinutes)) {
      setError("hours", { message: "Plan in 15-minute steps" });
      return;
    }

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            ...(!keepsHours && { plannedMinutes }),
            // null clears a saved note; undefined would leave it unchanged.
            note: data.note || null,
            ...(data.projectId !== editing.project.id && {
              projectId: data.projectId,
            }),
          },
        });
      } else {
        await create.mutateAsync({
          userId: row.user.id,
          projectId: data.projectId,
          date,
          plannedMinutes,
          note: data.note || undefined,
        });
      }

      // Like the time form, a saved plan closes the day.
      onClose();
    } catch {
      // Reported by the global mutation handler; keep the form as it is.
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    try {
      await remove.mutateAsync(deletingEntry.id);
      if (deletingEntry.id === editingId) startNew();
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
        hasUnsavedChanges={isDirty}
        isBusy={create.isPending || update.isPending || remove.isPending}
        title="Plan a day"
        description={`${fullName(row.user)} · ${formatLongDayLabel(fromISODate(date))} · ${formatDuration(plannedMinutes)} of ${withArticle(formatDuration(dayLimitMinutes))} day planned`}
        footer={
          <>
            {!editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAddAbsence}
                className="mr-auto"
                disabled={create.isPending || update.isPending}
              >
                <CalendarOff className="size-4" />
                Add absence
              </Button>
            )}

            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startNew}
                className="mr-auto"
                disabled={create.isPending || update.isPending}
              >
                Cancel edit
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={create.isPending || update.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              isLoading={create.isPending || update.isPending}
              disabled={hasNoOptions}
            >
              {editing ? "Save changes" : "Add plan"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {dayEntries.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {dayEntries.map((entry) => {
                const isArchived = isArchivedEntry(entry);

                return (
                  <li
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      entry.id === editingId && "bg-brand-subtle",
                    )}
                  >
                    <ProjectColorDot projectId={entry.project.id} />

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                        <span className="truncate">{entry.project.name}</span>
                        {isArchived && (
                          <Badge variant="neutral">Archived</Badge>
                        )}
                      </p>

                      {entry.note && (
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.note}
                        </p>
                      )}
                    </div>

                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatDuration(entry.plannedMinutes)}
                    </span>

                    {!isArchived && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Edit ${entry.project.name}`}
                        title="Edit plan"
                        onClick={() => guardUnsaved(() => startEditing(entry))}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghostDestructive"
                      size="iconSm"
                      aria-label={`Delete the ${entry.project.name} plan`}
                      title="Delete plan"
                      onClick={() => setDeletingEntry(entry)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            id={FORM_ID}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <FormSelect
                    label="Project"
                    value={field.value}
                    leading={<ProjectColorDot projectId={field.value} />}
                    onValueChange={(projectId) =>
                      setValue("projectId", projectId, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    options={projectOptions}
                    placeholder={
                      hasNoProjects
                        ? "Not on any active project"
                        : hasNoOptions
                          ? "Every project is planned this day"
                          : "Select project"
                    }
                    error={errors.projectId?.message}
                    disabled={hasNoOptions}
                  />
                )}
              />
              <Field id="plan-hours" label="Hours" group>
                <TimePicker
                  aria-label="Hours"
                  hours={Number(hours)}
                  minutes={Number(minutes)}
                  minuteStep={PLAN_MINUTE_STEP}
                  maxMinutes={Math.max(editedMinutes, fitsMinutes)}
                  formId={FORM_ID}
                  onHoursChange={(value) =>
                    setValue("hours", value, { shouldDirty: true })
                  }
                  onMinutesChange={(value) =>
                    setValue("minutes", value, { shouldDirty: true })
                  }
                  error={!!errors.hours}
                  className="w-fit"
                />
              </Field>
            </div>

            {/* Always one line under both fields, so neither changes width. */}
            {!hasNoOptions && (
              <p
                aria-live="polite"
                className={cn(
                  "-mt-4 text-xs",
                  errors.hours
                    ? "text-destructive-text"
                    : "text-muted-foreground",
                )}
              >
                {errors.hours?.message ?? fitsHint}
              </p>
            )}

            {hasNoProjects && (
              <p className="text-sm text-muted-foreground">
                {row.user.firstName} is not on any active project. Add them to a
                project before planning.
              </p>
            )}

            <Field id="plan-note" label="Note" error={errors.note?.message}>
              <TextareaAutosize
                id="plan-note"
                {...register("note")}
                aria-invalid={!!errors.note}
                aria-describedby={fieldMessageId("plan-note", {
                  error: errors.note?.message,
                })}
                minRows={2}
                maxRows={6}
                placeholder="Optional context for this plan"
                className={cn(
                  fieldControlClassName(!!errors.note),
                  "resize-none py-2.5 leading-relaxed",
                )}
              />
            </Field>
          </form>
        </div>
      </ResourceFormModal>

      <DiscardChangesModal
        isOpen={pendingAction !== null}
        onDiscard={() => {
          const action = pendingAction;
          setPendingAction(null);
          action?.();
        }}
        onKeepEditing={() => setPendingAction(null)}
      />

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

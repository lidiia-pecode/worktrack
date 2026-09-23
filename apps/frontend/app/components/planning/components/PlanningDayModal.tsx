"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { PlanningEntry, PlanningWeekRow } from "@/types";
import { ProjectStatus } from "@/types/enums";
import { usePlanningMutations } from "@/hooks/usePlanning";
import { formatDuration, formatLongDayLabel } from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSection } from "../../shared/FormSection";
import { FormSelect } from "../../shared/FormSelect";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resourse/ResourceFormModal";

const FORM_ID = "planning-form";
const MINUTE_STEP = 15;

const planSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
    note: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length >= 3, {
        message: "Use at least 3 characters, or leave it empty",
      }),
  })
  .refine((data) => data.hours * 60 + data.minutes > 0, {
    message: "Enter a duration greater than 0",
    path: ["hours"],
  })
  .refine((data) => data.minutes % MINUTE_STEP === 0, {
    message: "Plan in 15-minute steps",
    path: ["hours"],
  })
  .refine((data) => data.hours * 60 + data.minutes <= 1440, {
    message: "Duration can't exceed 24 hours",
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

type PlanningDayModalProps = {
  row: PlanningWeekRow;
  date: string;
  dayLimitMinutes: number;
  onClose: () => void;
};

export const PlanningDayModal = ({
  row,
  date,
  dayLimitMinutes,
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
    reset,
    formState: { errors },
  } = useForm<PlanFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(planSchema) as any,
    defaultValues: EMPTY_FORM,
  });

  const [hours, minutes] = useWatch({ control, name: ["hours", "minutes"] });

  const projectOptions = useMemo(() => {
    const options = row.projects.map((project) => ({
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
  }, [row.projects, editing]);

  const hasNoProjects = projectOptions.length === 0;

  const startNew = () => {
    setEditingId(null);
    reset(EMPTY_FORM);
  };

  const startEditing = (entry: PlanningEntry) => {
    setEditingId(entry.id);
    reset(toFormData(entry));
  };

  // One entry per project per day: picking a project that is already planned
  // edits that entry instead of adding a second one.
  const handleProjectChange = (projectId: string) => {
    const planned = dayEntries.find((entry) => entry.project.id === projectId);

    if (planned && planned.id !== editingId && !isArchivedEntry(planned)) {
      startEditing(planned);
      return;
    }

    setValue("projectId", projectId, { shouldValidate: true });
  };

  const onSubmit = async (data: PlanFormData) => {
    const plannedMinutes = data.hours * 60 + data.minutes;

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            plannedMinutes,
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

      startNew();
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

  return (
    <>
      <ResourceFormModal
        open
        onClose={onClose}
        title={formatLongDayLabel(new Date(`${date}T00:00:00`))}
        description={`${fullName(row.user)} · ${formatDuration(plannedMinutes)} of a ${formatDuration(dayLimitMinutes)} day planned`}
        icon={<CalendarClock className="size-5" />}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startNew}
              >
                Cancel edit
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>

              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                isLoading={create.isPending || update.isPending}
                disabled={hasNoProjects}
              >
                {editing ? "Save changes" : "Add plan"}
              </Button>
            </div>
          </div>
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
                        onClick={() => startEditing(entry)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Remove ${entry.project.name}`}
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
              <FormSection label="Project">
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <FormSelect
                      value={field.value}
                      onValueChange={handleProjectChange}
                      options={projectOptions}
                      placeholder={
                        hasNoProjects
                          ? "Not on any active project"
                          : "Select project"
                      }
                      error={errors.projectId?.message}
                      disabled={hasNoProjects}
                    />
                  )}
                />
              </FormSection>

              <FormSection label="Hours">
                <TimePicker
                  hours={Number(hours)}
                  minutes={Number(minutes)}
                  minuteStep={MINUTE_STEP}
                  onHoursChange={(value) => setValue("hours", value)}
                  onMinutesChange={(value) => setValue("minutes", value)}
                  error={!!errors.hours}
                  className="w-fit"
                />
              </FormSection>
            </div>

            {errors.hours && (
              <p className="-mt-4 text-xs text-destructive">
                {errors.hours.message}
              </p>
            )}

            {hasNoProjects && (
              <p className="text-sm text-muted-foreground">
                {row.user.firstName} is not on any active project. Add them to a
                project before planning.
              </p>
            )}

            <FormSection label="Note">
              <TextareaAutosize
                {...register("note")}
                minRows={2}
                maxRows={6}
                placeholder="Optional context for this plan"
                className="w-full resize-none rounded-lg border border-input-placeholder/50 bg-input px-3.5 py-2.5 text-sm leading-relaxed text-input-foreground outline-none transition placeholder:text-input-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              />

              {errors.note && (
                <p className="text-xs text-destructive">
                  {errors.note.message}
                </p>
              )}
            </FormSection>
          </form>
        </div>
      </ResourceFormModal>

      <ConfirmModal
        isOpen={deletingEntry !== null}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
        title="Remove this plan?"
        message={
          deletingEntry
            ? `${formatDuration(deletingEntry.plannedMinutes)} on ${deletingEntry.project.name} will be removed.`
            : undefined
        }
        confirmText="Remove"
        variant="danger"
        loading={remove.isPending}
      />
    </>
  );
};

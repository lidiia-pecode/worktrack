"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { PickerProjectActivity } from "@/hooks/useAssignableActivities";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSelect } from "../../shared/FormSelect";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { TimeLog, TimeLogPayload, UpdateTimeLogPayload } from "@/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import {
  NOTE_MAX_LENGTH,
  optionalNoteSchema,
} from "@/lib/forms/schemas/note.schema";

import {
  EntryChoice,
  readLastEntryChoice,
  storeLastEntryChoice,
} from "../helpers/last-entry-choice";

const FORM_ID = "timelog-form";
// The counter appears only near the limit, so a short note stays uncluttered.
const NOTE_COUNTER_FROM = 900;

const timeLogSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    activityId: z.string().min(1, "Select an activity"),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
    note: optionalNoteSchema,
    isBillable: z.boolean(),
  })
  .refine((data) => data.hours * 60 + data.minutes > 0, {
    message: "Enter a duration greater than 0",
    path: ["hours"],
  })
  .refine((data) => data.hours * 60 + data.minutes <= 1440, {
    message: "Duration can't exceed 24 hours",
    path: ["hours"],
  });

type TimeLogFormData = z.infer<typeof timeLogSchema>;

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const findPickerItem = (
  pickerItems: PickerProjectActivity[],
  { projectId, activityId }: EntryChoice,
) =>
  pickerItems.find(
    (item) => item.projectId === projectId && item.activityId === activityId,
  );

const startingChoice = (
  pickerItems: PickerProjectActivity[],
  rememberKey: string,
): EntryChoice => {
  const remembered = readLastEntryChoice(rememberKey);
  if (remembered && findPickerItem(pickerItems, remembered)) return remembered;

  const projectIds = new Set(pickerItems.map((item) => item.projectId));
  if (projectIds.size !== 1) return { projectId: "", activityId: "" };

  return {
    projectId: pickerItems[0].projectId,
    activityId: pickerItems.length === 1 ? pickerItems[0].activityId : "",
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  subjectName?: string;
  /** From `lastEntryChoiceKey`: where the last pair logged for this person is kept. */
  rememberKey: string;
  timelog?: TimeLog;
  pickerItems: PickerProjectActivity[];
  onCreate: (payload: TimeLogPayload) => Promise<unknown>;
  onUpdate: (id: string, payload: UpdateTimeLogPayload) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isSaving: boolean;
  isDeleting: boolean;
};

export const TimeLogFormModal = ({
  open,
  onClose,
  date,
  subjectName,
  rememberKey,
  timelog,
  pickerItems,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
}: Props) => {
  const isEditMode = !!timelog;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Read once per entry, as both callers open the form only after the picker
  // has loaded; a background refetch must not reset what is being typed.
  const defaultValues = useMemo<TimeLogFormData>(() => {
    if (!timelog) {
      const choice = startingChoice(pickerItems, rememberKey);

      return {
        ...choice,
        hours: 0,
        minutes: 0,
        note: "",
        isBillable:
          findPickerItem(pickerItems, choice)?.defaultBillable ?? false,
      };
    }

    return {
      projectId: timelog.projectActivity?.project?.id ?? "",
      activityId: timelog.projectActivity?.activity?.id ?? "",
      hours: Math.floor(timelog.minutes / 60),
      minutes: timelog.minutes % 60,
      note: timelog.note ?? "",
      isBillable: timelog.isBillable,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelog]);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    trigger,
    reset,
    formState: { errors, isDirty, isSubmitted, isSubmitting },
  } = useForm<TimeLogFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(timeLogSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // An entry keeps its own project and activity as an option even when they
  // are archived or the person has left the project, so it can still be
  // corrected. They are only offered back to this entry.
  const current = timelog?.projectActivity;
  const currentProject = current?.project;
  const currentActivity = current?.activity;

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    pickerItems.forEach((item) => seen.set(item.projectId, item.projectName));
    if (currentProject && !seen.has(currentProject.id)) {
      seen.set(currentProject.id, currentProject.name);
    }
    return Array.from(seen, ([id, name]) => ({ value: id, label: name }));
  }, [pickerItems, currentProject]);

  const hasNoOptions = projectOptions.length === 0;

  const [selectedProjectId, selectedActivityId, hours, minutes, note] =
    useWatch({
      control,
      name: ["projectId", "activityId", "hours", "minutes", "note"],
    });
  const noteLength = note?.length ?? 0;
  const noteCounter =
    noteLength > NOTE_COUNTER_FROM
      ? `${noteLength} / ${NOTE_MAX_LENGTH}`
      : undefined;

  const activityOptions = useMemo(() => {
    const options = pickerItems
      .filter((item) => item.projectId === selectedProjectId)
      .map((i) => ({ value: i.activityId, label: i.activityName }));

    if (
      currentActivity &&
      currentProject?.id === selectedProjectId &&
      !options.some((option) => option.value === currentActivity.id)
    ) {
      options.unshift({
        value: currentActivity.id,
        label: currentActivity.name,
      });
    }

    return options;
  }, [pickerItems, selectedProjectId, currentProject, currentActivity]);

  // Off until there is an activity whose default it can start from.
  const startBillableFrom = (activityId: string) => {
    const item = findPickerItem(pickerItems, {
      projectId: getValues("projectId"),
      activityId,
    });

    setValue("isBillable", item?.defaultBillable ?? false, {
      shouldDirty: true,
    });
  };

  // A new project keeps the activity only if it offers it, and otherwise
  // takes its only activity, if it has just one. A new entry's Billable
  // follows the pair, since an internal project starts it off.
  useEffect(() => {
    const current = getValues("activityId");
    const activityId = activityOptions.some((item) => item.value === current)
      ? current
      : activityOptions.length === 1
        ? activityOptions[0].value
        : "";

    if (activityId !== current) {
      setValue("activityId", activityId, { shouldDirty: true });
    }
    if (!isEditMode) startBillableFrom(activityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // After a failed save, the duration error clears as soon as it is fixed.
  // Both parts are checked under "hours", where the schema reports it.
  const setDuration = (name: "hours" | "minutes", value: number) => {
    setValue(name, value, { shouldDirty: true });
    if (isSubmitted) trigger("hours");
  };

  const onSubmit = async (data: TimeLogFormData) => {
    const keepsCurrentPair =
      data.projectId === currentProject?.id &&
      data.activityId === currentActivity?.id;

    const match = findPickerItem(pickerItems, data);
    if (!match && !keepsCurrentPair) {
      setError("activityId", {
        message:
          "That project and activity are no longer available to you. Pick another.",
      });
      return;
    }

    const shared = {
      minutes: data.hours * 60 + data.minutes,
      isBillable: data.isBillable,
    };

    try {
      if (timelog) {
        await onUpdate(timelog.id, {
          ...shared,
          // null clears a saved note; undefined would leave it unchanged.
          note: data.note || null,
          // Sent only when it changes, so the server re-checks availability
          // only for a new project or activity.
          ...(match && !keepsCurrentPair && { projectActivityId: match.id }),
        });
      } else {
        // A new entry has no current pair, so the check above guarantees a match.
        await onCreate({
          ...shared,
          projectActivityId: match!.id,
          note: data.note || undefined,
          date,
        });
        storeLastEntryChoice(rememberKey, {
          projectId: data.projectId,
          activityId: data.activityId,
        });
      }
      onClose();
    } catch {}
  };

  const handleDelete = async () => {
    if (!timelog) return;
    try {
      await onDelete(timelog.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch {
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <>
      <ResourceFormModal
        open={open}
        onClose={onClose}
        hasUnsavedChanges={isDirty}
        size="lg"
        title={isEditMode ? "Edit time entry" : "Log time"}
        description={[
          DAY_LABEL.format(new Date(`${date}T00:00:00`)),
          subjectName,
        ]
          .filter(Boolean)
          .join(" · ")}
        headerEnd={
          <div
            role="group"
            aria-label="Duration"
            aria-describedby={
              errors.hours ? "timelog-duration-error" : undefined
            }
            className="flex flex-col items-end gap-1"
          >
            <TimePicker
              hours={Number(hours)}
              minutes={Number(minutes)}
              onHoursChange={(value) => setDuration("hours", value)}
              onMinutesChange={(value) => setDuration("minutes", value)}
              formId={FORM_ID}
              error={!!errors.hours}
            />
            {errors.hours && (
              <p
                id="timelog-duration-error"
                className="text-xs whitespace-nowrap text-destructive-text"
              >
                {errors.hours.message}
              </p>
            )}
          </div>
        }
        footer={
          <>
            {isEditMode && (
              <Button
                type="button"
                className="mr-auto max-sm:px-2.5"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isSaving}
              >
                <Trash2 className="size-4" />
                {/* Icon only on a phone, so the footer stays on one row. */}
                <span className="max-sm:sr-only">Delete</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              isLoading={isSaving}
              disabled={hasNoOptions || isDeleting}
            >
              {isEditMode ? "Save changes" : "Log time"}
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <FormSelect
                  label="Project"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={projectOptions}
                  placeholder={
                    hasNoOptions ? "No projects assigned" : "Select project"
                  }
                  error={errors.projectId?.message}
                  disabled={hasNoOptions}
                />
              )}
            />

            <Controller
              control={control}
              name="activityId"
              render={({ field }) => (
                <FormSelect
                  label="Activity"
                  value={field.value}
                  onValueChange={(activityId) => {
                    field.onChange(activityId);
                    if (!isEditMode) startBillableFrom(activityId);
                  }}
                  options={activityOptions}
                  placeholder={
                    selectedProjectId
                      ? "Select activity"
                      : "Pick a project first"
                  }
                  error={errors.activityId?.message}
                  disabled={!selectedProjectId}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <label
                htmlFor="timelog-billable"
                className="text-sm font-medium text-foreground"
              >
                Billable
              </label>
              {!selectedActivityId && (
                <p
                  id="timelog-billable-description"
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  Choose an activity first.
                </p>
              )}
            </div>

            <Switch
              id="timelog-billable"
              {...register("isBillable")}
              disabled={!selectedActivityId}
              aria-describedby={
                selectedActivityId ? undefined : "timelog-billable-description"
              }
            />
          </div>

          <Field
            id="timelog-note"
            error={errors.note?.message}
            description={noteCounter}
          >
            <TextareaAutosize
              id="timelog-note"
              {...register("note")}
              aria-label="Note"
              aria-invalid={!!errors.note}
              aria-describedby={fieldMessageId("timelog-note", {
                error: errors.note?.message,
                description: noteCounter,
              })}
              minRows={4}
              maxRows={8}
              placeholder="What did you work on?"
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;

                e.preventDefault();
                // requestSubmit skips the disabled button, so a save in
                // progress has to be checked here.
                if (isSubmitting || isSaving || isDeleting) return;
                e.currentTarget.form?.requestSubmit();
              }}
              className={cn(
                fieldControlClassName(!!errors.note),
                "resize-none py-2.5 leading-relaxed",
              )}
            />
          </Field>
        </form>
      </ResourceFormModal>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this time entry?"
        message="This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );
};

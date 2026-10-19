"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { PickerProjectActivity } from "@/hooks/useAssignableActivities";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSelect } from "../../shared/FormSelect";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { TimeLog, TimeLogPayload, UpdateTimeLogPayload } from "@/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, fieldControlClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import {
  EntryChoice,
  readLastEntryChoice,
  storeLastEntryChoice,
} from "../helpers/last-entry-choice";

const FORM_ID = "timelog-form";

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
  }, [timelog, pickerItems, rememberKey]);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty },
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

  const [selectedProjectId, selectedActivityId, hours, minutes] = useWatch({
    control,
    name: ["projectId", "activityId", "hours", "minutes"],
  });

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
  // takes its only activity, if it has just one.
  useEffect(() => {
    const activityId = getValues("activityId");
    if (activityOptions.some((item) => item.value === activityId)) return;

    const onlyActivityId =
      activityOptions.length === 1 ? activityOptions[0].value : "";
    if (!activityId && !onlyActivityId) return;

    setValue("activityId", onlyActivityId, { shouldDirty: true });
    if (!isEditMode) startBillableFrom(onlyActivityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

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
        title={isEditMode ? "Edit time entry" : "Log time"}
        description={[
          DAY_LABEL.format(new Date(`${date}T00:00:00`)),
          subjectName,
        ]
          .filter(Boolean)
          .join(" · ")}
        icon={<Calendar className="size-5" />}
        footer={
          <>
            {isEditMode && (
              <Button
                type="button"
                className="mr-auto"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isSaving}
              >
                <Trash2 className="size-4" />
                Delete
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
          <Field
            id="timelog-duration"
            label="Duration"
            group
            error={errors.hours?.message}
          >
            <TimePicker
              hours={Number(hours)}
              minutes={Number(minutes)}
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

          <div className="grid grid-cols-2 gap-4">
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

          <Field id="timelog-note" label="Note" error={errors.note?.message}>
            <TextareaAutosize
              id="timelog-note"
              {...register("note")}
              minRows={3}
              maxRows={8}
              placeholder="What did you work on?"
              className={cn(
                fieldControlClassName(),
                "resize-none py-2.5 leading-relaxed",
              )}
            />
          </Field>

          <label className="flex cursor-pointer select-none items-center justify-between gap-4">
            <span className="text-sm font-medium text-foreground">
              Billable
            </span>
            <Switch
              {...register("isBillable")}
              disabled={!selectedActivityId}
            />
          </label>
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

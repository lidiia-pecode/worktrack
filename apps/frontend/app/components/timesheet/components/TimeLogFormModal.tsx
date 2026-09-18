"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { PickerProjectActivity } from "@/hooks/useAssignableActivities";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSection } from "../../shared/FormSection";
import { FormSelect } from "../../shared/FormSelect";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resourse/ResourceFormModal";
import { TimeLog, TimeLogPayload, UpdateTimeLogPayload } from "@/types";
import { Button } from "@/components/ui/button";

const FORM_ID = "timelog-form";

const timeLogSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    activityId: z.string().min(1, "Select an activity"),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
    note: z.string().optional(),
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

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  subjectName?: string;
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
      return {
        projectId: "",
        activityId: "",
        hours: 0,
        minutes: 0,
        note: "",
        isBillable: true,
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
  }, [timelog]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<TimeLogFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(timeLogSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    pickerItems.forEach((item) => seen.set(item.projectId, item.projectName));
    return Array.from(seen, ([id, name]) => ({ value: id, label: name }));
  }, [pickerItems]);

  const hasNoOptions = projectOptions.length === 0;

  const selectedProjectId = watch("projectId");
  const hours = watch("hours");
  const minutes = watch("minutes");

  const activityOptions = useMemo(
    () =>
      pickerItems
        .filter((item) => item.projectId === selectedProjectId)
        .map((i) => ({ value: i.activityId, label: i.activityName })),
    [pickerItems, selectedProjectId],
  );

  useEffect(() => {
    const activityId = getValues("activityId");
    const stillValid = activityOptions.some(
      (item) => item.value === activityId,
    );
    if (activityId && !stillValid) {
      setValue("activityId", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const onSubmit = async (data: TimeLogFormData) => {
    const match = pickerItems.find(
      (item) =>
        item.projectId === data.projectId &&
        item.activityId === data.activityId,
    );
    if (!match) {
      setError("activityId", {
        message:
          "That project and activity are no longer available to you. Pick another.",
      });
      return;
    }

    const minutes = data.hours * 60 + data.minutes;

    const shared = {
      projectActivityId: match.id,
      minutes,
      note: data.note?.trim() || undefined,
      isBillable: data.isBillable,
    };

    try {
      if (timelog) {
        await onUpdate(timelog.id, shared);
      } else {
        await onCreate({ ...shared, date });
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
        title={isEditMode ? "Edit time entry" : "Log time"}
        description={[
          DAY_LABEL.format(new Date(`${date}T00:00:00`)),
          subjectName,
        ]
          .filter(Boolean)
          .join(" · ")}
        icon={<Calendar className="size-5" />}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {isEditMode ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>

              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                isLoading={isSaving}
                disabled={hasNoOptions}
              >
                {isEditMode ? "Save changes" : "Log time"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormSection label="Duration">
            <TimePicker
              hours={Number(hours)}
              minutes={Number(minutes)}
              onHoursChange={(value) => setValue("hours", value)}
              onMinutesChange={(value) => setValue("minutes", value)}
              error={!!errors.hours}
              className="w-fit"
            />

            {errors.hours && (
              <p className="text-xs text-destructive">{errors.hours.message}</p>
            )}
          </FormSection>

          <div className="grid grid-cols-2 gap-4">
            <FormSection label="Project">
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <FormSelect
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
            </FormSection>

            <FormSection label="Activity">
              <Controller
                control={control}
                name="activityId"
                render={({ field }) => (
                  <FormSelect
                    value={field.value}
                    onValueChange={field.onChange}
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
            </FormSection>
          </div>

          <FormSection label="Note">
            <TextareaAutosize
              {...register("note")}
              minRows={3}
              maxRows={8}
              placeholder="What did you work on?"
              className="w-full resize-none rounded-lg border border-input-placeholder/50 bg-input px-3.5 py-2.5 text-sm leading-relaxed text-input-foreground outline-none transition placeholder:text-input-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </FormSection>

          <label className="flex cursor-pointer select-none items-center gap-2.5">
            <input
              type="checkbox"
              {...register("isBillable")}
              className="size-4 rounded border-input-placeholder/50 accent-brand focus-visible:ring-2 focus-visible:ring-ring/20"
            />
            <span className="text-sm text-foreground">Billable</span>
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

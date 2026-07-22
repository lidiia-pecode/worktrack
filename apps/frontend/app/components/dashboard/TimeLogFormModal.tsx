"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, X } from "lucide-react";

import { Timelog, TimelogPayload, UpdateTimelogPayload } from "@/types";
import { PickerProjectActivity } from "@/hooks/useMyProjectActivities";

import { Modal } from "../shared/Modal/Modal";
import Button from "../shared/Button";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { ConfirmModal } from "../shared/ConfirmModal";

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
  });

type TimeLogFormData = z.infer<typeof timeLogSchema>;

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string; // ISO "YYYY-MM-DD" — fixed for this modal instance
  timelog?: Timelog; // present when editing an existing entry
  pickerItems: PickerProjectActivity[];
  onCreate: (payload: TimelogPayload) => Promise<unknown>;
  onUpdate: (id: string, payload: UpdateTimelogPayload) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isSaving: boolean;
  isDeleting: boolean;
};

export const TimeLogFormModal = ({
  isOpen,
  onClose,
  date,
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
    if (timelog) {
      return {
        projectId: timelog.projectActivity.project.id,
        activityId: timelog.projectActivity.activity.id,
        hours: Math.floor(timelog.time / 60),
        minutes: timelog.time % 60,
        note: timelog.note ?? "",
        isBillable: timelog.isBillable,
      };
    }
    return {
      projectId: "",
      activityId: "",
      hours: 0,
      minutes: 0,
      note: "",
      isBillable: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelog?.id]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TimeLogFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(timeLogSchema) as any,
    defaultValues,
  });

  // Reset the form whenever a different day/entry is opened.
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    pickerItems.forEach((item) => seen.set(item.projectId, item.projectName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [pickerItems]);

  const selectedProjectId = watch("projectId");

  const activityOptions = useMemo(
    () => pickerItems.filter((item) => item.projectId === selectedProjectId),
    [pickerItems, selectedProjectId],
  );

  // If the project changes and the currently selected activity no longer
  // belongs to it, clear it so we don't submit a mismatched pair.
  useEffect(() => {
    const activityId = getValues("activityId");
    const stillValid = activityOptions.some(
      (item) => item.activityId === activityId,
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
    if (!match) return;

    const time = data.hours * 60 + data.minutes;
    const shared = {
      projectActivityId: match.id,
      time,
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
    } catch {
      // mutation hook already surfaces a toast on error
    }
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
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {isEditMode ? "Edit time entry" : "Log time"}
            </p>
            <p className="text-sm font-medium text-zinc-700 mt-0.5">
              {DAY_LABEL.format(new Date(`${date}T00:00:00`))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                className="md:hover:text-red-500 md:hover:bg-red-50 transition"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={15} />
              </Button>
            )}
            <Button
              form={FORM_ID}
              type="submit"
              disabled={isSaving}
              size="sm"
              className="w-auto flex items-center gap-1.5"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="iconSm"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5 block">
                Project
              </label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select {...field} error={errors.projectId?.message}>
                    <option value="" disabled>
                      Select project
                    </option>
                    {projectOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5 block">
                Activity
              </label>
              <Controller
                control={control}
                name="activityId"
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={!selectedProjectId}
                    error={errors.activityId?.message}
                  >
                    <option value="" disabled>
                      {selectedProjectId
                        ? "Select activity"
                        : "Pick a project first"}
                    </option>
                    {activityOptions.map((a) => (
                      <option key={a.activityId} value={a.activityId}>
                        {a.activityName}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5 block">
              Time spent
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  className="w-20 text-center"
                  {...register("hours")}
                />
                <span className="text-sm text-zinc-500">h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  className="w-20 text-center"
                  {...register("minutes")}
                />
                <span className="text-sm text-zinc-500">m</span>
              </div>
            </div>
            {errors.hours && (
              <p className="text-red-500 text-xs mt-1">
                {errors.hours.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5 block">
              Note
            </label>
            <textarea
              {...register("note")}
              rows={3}
              placeholder="What did you work on?"
              className="w-full text-sm text-zinc-700 leading-relaxed resize-none rounded-md p-3 border border-slate-300 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("isBillable")}
              className="size-4 rounded border-slate-300 accent-blue-600 focus:ring-blue-300"
            />
            <span className="text-sm text-zinc-700">Billable</span>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this time entry?"
        message="This action cannot be undone."
        loading={isDeleting}
      />
    </>
  );
};

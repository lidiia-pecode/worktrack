"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarOff, Info, Lock, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { Absence, AbsencePayload, UpdateAbsencePayload } from "@/types";
import { AbsenceType } from "@/types/enums";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { formatDuration, isISODateRange } from "@/lib/utils/date";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { Button } from "@/components/ui/button";
import { Field, fieldControlClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSelect } from "../../shared/FormSelect";
import { DateRangePicker } from "../../shared/inputs";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";

const FORM_ID = "absence-form";

const absenceSchema = z
  .object({
    type: z.nativeEnum(AbsenceType, { message: "Pick a reason" }),
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    note: optionalNoteSchema,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "The last day can't be before the first",
    path: ["endDate"],
  });

type AbsenceFormData = z.infer<typeof absenceSchema>;

const TYPE_OPTIONS = Object.values(AbsenceType).map((type) => ({
  value: type,
  label: ABSENCE_TYPE_LABELS[type],
}));

type Props = {
  open: boolean;
  onClose: () => void;
  /** Whose absence it is, to name the plans it will remove. */
  userId: string;
  /** Named under the title when the form is for someone else. */
  subjectName?: string;
  date: string;
  absence?: Absence;
  onCreate: (payload: AbsencePayload) => Promise<unknown>;
  onUpdate: (id: string, payload: UpdateAbsencePayload) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isSaving: boolean;
  isDeleting: boolean;
};

export const AbsenceFormModal = ({
  open,
  onClose,
  userId,
  subjectName,
  date,
  absence,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
}: Props) => {
  const isEditMode = !!absence;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const defaultValues = useMemo<AbsenceFormData>(
    () => ({
      type: absence?.type ?? AbsenceType.VACATION,
      startDate: absence?.startDate ?? date,
      endDate: absence?.endDate ?? date,
      note: absence?.note ?? "",
    }),
    [absence, date],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<AbsenceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(absenceSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [startDate, endDate] = useWatch({
    control,
    name: ["startDate", "endDate"],
  });

  const isRangeComplete = isISODateRange(startDate, endDate);
  const { items: plansInRange } = usePlanningEntries(
    { userId, dateFrom: startDate, dateTo: endDate },
    { enabled: open && isRangeComplete },
  );

  // Recording the absence deletes these on the server; named here first.
  const removedPlans = useMemo(() => {
    if (!isRangeComplete) return null;

    const minutesByProject = new Map<string, number>();
    plansInRange.forEach((plan) => {
      minutesByProject.set(
        plan.project.name,
        (minutesByProject.get(plan.project.name) ?? 0) + plan.plannedMinutes,
      );
    });

    return plansInRange.length === 0
      ? null
      : {
          count: plansInRange.length,
          projects: [...minutesByProject]
            .map(([name, minutes]) => `${name} ${formatDuration(minutes)}`)
            .join(", "),
        };
  }, [isRangeComplete, plansInRange]);

  const setDays = (first: string, last: string) => {
    setValue("startDate", first, { shouldDirty: true, shouldValidate: true });
    setValue("endDate", last, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data: AbsenceFormData) => {
    const shared = {
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    // A refusal is the server's to explain — the global mutation handler shows
    // it, and the modal stays open on the values that caused it.
    try {
      if (absence) {
        // null clears a saved note; undefined would leave it unchanged.
        await onUpdate(absence.id, { ...shared, note: data.note || null });
      } else {
        await onCreate({ ...shared, note: data.note || undefined });
      }
      onClose();
    } catch {}
  };

  const handleDelete = async () => {
    if (!absence) return;
    try {
      await onDelete(absence.id);
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
        title={isEditMode ? "Edit absence" : "Add absence"}
        description={subjectName}
        icon={<CalendarOff className="size-5" />}
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
              disabled={isDeleting}
            >
              {isEditMode ? "Save changes" : "Add absence"}
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <FormSelect
                label="Reason"
                value={field.value}
                onValueChange={field.onChange}
                options={TYPE_OPTIONS}
                placeholder="Select a reason"
                error={errors.type?.message}
              />
            )}
          />

          <Field
            id="absence-days"
            label="Days"
            group
            error={errors.startDate?.message ?? errors.endDate?.message}
          >
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              invalid={!!(errors.startDate || errors.endDate)}
              onChange={setDays}
            />
          </Field>

          {removedPlans && (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Removes {removedPlans.count}{" "}
                {removedPlans.count === 1 ? "plan" : "plans"} on these days:{" "}
                {removedPlans.projects}
              </span>
            </p>
          )}

          <Field id="absence-note" label="Note" error={errors.note?.message}>
            <TextareaAutosize
              id="absence-note"
              {...register("note")}
              minRows={3}
              maxRows={8}
              placeholder="Anything worth adding?"
              className={cn(
                fieldControlClassName(),
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
        title="Remove this absence?"
        message="The days go back to being ordinary working days."
        confirmText="Remove"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );
};

type LockedAbsenceModalProps = {
  absence: Absence;
  subjectName?: string;
  onClose: () => void;
};

/** An absence in a locked month, to read in full: nothing about it can change. */
export const LockedAbsenceModal = ({
  absence,
  subjectName,
  onClose,
}: LockedAbsenceModalProps) => (
  <ResourceFormModal
    open
    onClose={onClose}
    title="Absence"
    description={subjectName}
    icon={<CalendarOff className="size-5" />}
    footer={
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>
    }
  >
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      <div>
        <dt className="text-xs text-muted-foreground">Reason</dt>
        <dd className="mt-1 text-sm text-foreground">
          {ABSENCE_TYPE_LABELS[absence.type]}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Days</dt>
        <dd className="mt-1 text-sm text-foreground">
          {formatAbsenceRange(absence)}
        </dd>
      </div>
      {absence.note && (
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Note</dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-line text-foreground">
            {absence.note}
          </dd>
        </div>
      )}
    </dl>

    <p className="mt-6 flex gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      Part of it is in a locked month, so it can no longer be changed.
    </p>
  </ResourceFormModal>
);

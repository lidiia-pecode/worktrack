"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarOff, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { Absence, AbsencePayload, UpdateAbsencePayload } from "@/types";
import { AbsenceType } from "@/types/enums";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { Button } from "@/components/ui/button";
import { Field, fieldControlClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSelect } from "../../shared/FormSelect";
import { DateInput } from "../../shared/inputs";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";

const FORM_ID = "absence-form";

const absenceSchema = z
  .object({
    type: z.nativeEnum(AbsenceType, { message: "Pick a reason" }),
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    note: z.string().optional(),
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
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AbsenceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(absenceSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const startDate = useWatch({ control, name: "startDate" });

  // Moving the first day past the last is almost always a longer absence, not
  // a shorter one, so the last day follows rather than becoming invalid.
  useEffect(() => {
    if (startDate && getValues("endDate") < startDate) {
      setValue("endDate", startDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  const onSubmit = async (data: AbsenceFormData) => {
    const shared = {
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      note: data.note?.trim() || undefined,
    };

    // A refusal is the server's to explain — the global mutation handler shows
    // it, and the modal stays open on the values that caused it.
    try {
      if (absence) {
        await onUpdate(absence.id, shared);
      } else {
        await onCreate(shared);
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
        title={isEditMode ? "Edit absence" : "Add absence"}
        description="Days away are recorded once, as a range."
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

            <Button type="submit" form={FORM_ID} size="sm" isLoading={isSaving}>
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

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="First day"
              {...register("startDate")}
              error={errors.startDate?.message}
            />

            <DateInput
              label="Last day"
              {...register("endDate")}
              min={startDate || undefined}
              error={errors.endDate?.message}
            />
          </div>

          <Field id="absence-note" label="Note">
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

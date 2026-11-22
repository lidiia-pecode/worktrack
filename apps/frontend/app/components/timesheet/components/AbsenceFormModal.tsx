"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Info, Lock, Trash2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { Absence, AbsencePayload, UpdateAbsencePayload, User } from "@/types";
import { AbsenceType } from "@/types/enums";
import {
  ABSENCE_TYPE_LABELS,
  MAX_ABSENCE_DAYS,
  formatAbsenceRange,
  projectHoursText,
} from "@/lib/utils/absence";
import {
  formatDayRangeLabel,
  formatLongDayLabel,
  fromISODate,
  isISODateRange,
  formatDateRangeLabel,
  shiftISODate,
} from "@/lib/utils/date";
import {
  AbsenceLockedPart,
  absenceLockedPart,
  isAbsenceFrozen,
} from "@/lib/utils/reporting-period";
import { fullName } from "@/lib/utils/user";
import { useAbsencesMutations } from "@/hooks/useAbsences";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { Button } from "@/components/ui/button";
import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import { ImpactDialog } from "../../shared/ImpactDialog";
import { FormSelect } from "../../shared/FormSelect";
import { DatePicker, DateRangePicker } from "../../shared/inputs";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { PartLoadError } from "../../shared/PartLoadError";
import { ChangedByNote } from "./ChangedByNote";

const PLANS_CHECK_ERROR =
  "Plans on these days couldn't load, so the absence can't be saved yet.";

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
  })
  .refine(
    (data) =>
      !data.startDate ||
      data.endDate <= shiftISODate(data.startDate, MAX_ABSENCE_DAYS - 1),
    {
      message: `An absence can last at most ${MAX_ABSENCE_DAYS} days`,
      path: ["endDate"],
    },
  );

type AbsenceFormData = z.infer<typeof absenceSchema>;

const TYPE_OPTIONS = Object.values(AbsenceType).map((type) => ({
  value: type,
  label: ABSENCE_TYPE_LABELS[type],
}));

const deletedAbsenceText = (absence: Absence) => {
  const daysBecome =
    absence.startDate === absence.endDate
      ? "that day becomes a working day"
      : "those days become working days";

  return `${ABSENCE_TYPE_LABELS[absence.type]} on ${formatAbsenceRange(absence)} will be deleted, and ${daysBecome} again. This can't be undone.`;
};

/** The open days a delete removes from an absence partly in a locked month. */
const removedOpenDaysText = (absence: Absence, locked: AbsenceLockedPart) => {
  const removed = [
    locked.startOpen &&
      formatDayRangeLabel(absence.startDate, shiftISODate(locked.from, -1)),
    locked.endOpen &&
      formatDayRangeLabel(shiftISODate(locked.to, 1), absence.endDate),
  ].filter(Boolean);

  return `${removed.join(" and ")} will be removed from this absence. ${lockedDaysText(locked)} This can't be undone.`;
};

const lockedDaysText = ({ from, to }: AbsenceLockedPart) =>
  from === to
    ? `${formatDayRangeLabel(from, to)} stays as it is: it's in a locked month.`
    : `${formatDayRangeLabel(from, to)} stay as they are: they're in a locked month.`;

/** Under the locked days in the form: why its reason and note can't change. */
const LOCKED_RECORD_NOTE = "Its reason and note stay as they are too.";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Whose absence it is, to name the plans it will delete. */
  userId: string;
  /** Named under the title when the form is for someone else. */
  subjectName?: string;
  /** The first day a new absence starts on, and its last unless `endDate` says. */
  date: string;
  endDate?: string;
  /** For one known day, such as a Planning day: no dates to pick, the day named. */
  isSingleDay?: boolean;
  absence?: Absence;
  /** Month locks: an absence partly in a locked month keeps those days, and its reason and note. */
  isLocked: (date: string) => boolean;
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
  endDate: lastDate = date,
  isSingleDay = false,
  absence,
  isLocked,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
}: Props) => {
  const isEditMode = !!absence;
  const lockedPart =
    absence && absenceLockedPart(isLocked, absence.startDate, absence.endDate);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const defaultValues = useMemo<AbsenceFormData>(
    () => ({
      type: absence?.type ?? AbsenceType.VACATION,
      startDate: absence?.startDate ?? date,
      endDate: absence?.endDate ?? lastDate,
      note: absence?.note ?? "",
    }),
    [absence, date, lastDate],
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
  const {
    items: plansInRange,
    isLoading: plansLoading,
    isError: plansFailed,
    isPlaceholderData: plansFromOtherRange,
    refetch: refetchPlans,
  } = usePlanningEntries(
    { userId, dateFrom: startDate, dateTo: endDate },
    { enabled: open && isRangeComplete },
  );
  // Saving deletes the plans on these days, so it waits until they are known
  // for this range: not while they load, nor the last range's kept meanwhile.
  const arePlansKnown =
    !isRangeComplete || (!plansLoading && !plansFromOtherRange && !plansFailed);

  // Recording the absence deletes these on the server; named here first.
  const removedPlans = useMemo(() => {
    if (!isRangeComplete || !arePlansKnown) return null;

    // Plans on its days in a locked month stay, as those days do.
    const removable = plansInRange.filter((plan) => !isLocked(plan.date));
    if (removable.length === 0) return null;

    const minutesByProject = new Map<string, number>();
    removable.forEach((plan) => {
      minutesByProject.set(
        plan.project.name,
        (minutesByProject.get(plan.project.name) ?? 0) + plan.plannedMinutes,
      );
    });

    return {
      count: removable.length,
      projects: projectHoursText(
        [...minutesByProject].map(([name, minutes]) => ({ name, minutes })),
      ),
    };
  }, [isRangeComplete, arePlansKnown, plansInRange, isLocked]);

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
      if (absence && lockedPart) {
        // Only its open days move; the server keeps the rest as it is.
        await onUpdate(absence.id, {
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } else if (absence) {
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

  // One day reads as its day, a range as its first and last.
  const firstDay = absence?.startDate ?? date;
  const lastDay = absence?.endDate ?? lastDate;
  const absenceDaysLabel =
    isSingleDay || firstDay === lastDay
      ? formatLongDayLabel(fromISODate(firstDay))
      : formatDateRangeLabel(firstDay, lastDay);

  return (
    <>
      <ResourceFormModal
        open={open}
        onClose={onClose}
        hasUnsavedChanges={isDirty}
        isBusy={isSaving || isDeleting}
        title={isEditMode ? "Edit absence" : "Add absence"}
        description={[subjectName, absenceDaysLabel]
          .filter(Boolean)
          .join(" · ")}
        footer={
          <>
            {isEditMode && (
              <Button
                type="button"
                className="mr-auto max-sm:px-2.5"
                variant="ghostDestructive"
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
              disabled={isDeleting || !arePlansKnown}
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
                disabled={!!lockedPart}
              />
            )}
          />

          {lockedPart && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {lockedPart.startOpen && (
                  <DatePicker
                    label="First day"
                    value={startDate}
                    maxDate={shiftISODate(lockedPart.from, -1)}
                    onChange={(day) =>
                      setValue("startDate", day, { shouldDirty: true })
                    }
                  />
                )}
                {lockedPart.endOpen && (
                  <DatePicker
                    label="Last day"
                    value={endDate}
                    minDate={shiftISODate(lockedPart.to, 1)}
                    onChange={(day) =>
                      setValue("endDate", day, { shouldDirty: true })
                    }
                  />
                )}
              </div>
              <p className="flex gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {lockedDaysText(lockedPart)} {LOCKED_RECORD_NOTE}
                </span>
              </p>
            </>
          )}

          {!isSingleDay && !lockedPart && (
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
          )}

          {plansFailed && (
            <PartLoadError onRetry={() => refetchPlans()}>
              {PLANS_CHECK_ERROR}
            </PartLoadError>
          )}

          {removedPlans && (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Deletes {removedPlans.count}{" "}
                {removedPlans.count === 1 ? "plan" : "plans"} on{" "}
                {isSingleDay ? "this day" : "these days"}:{" "}
                {removedPlans.projects}
              </span>
            </p>
          )}

          <Field id="absence-note" label="Note" error={errors.note?.message}>
            <TextareaAutosize
              id="absence-note"
              {...register("note")}
              aria-invalid={!!errors.note}
              aria-describedby={fieldMessageId("absence-note", {
                error: errors.note?.message,
              })}
              minRows={3}
              maxRows={8}
              disabled={!!lockedPart}
              placeholder="Anything worth adding?"
              className={cn(
                fieldControlClassName(!!errors.note),
                "resize-none py-2.5 leading-relaxed",
              )}
            />
          </Field>

          {absence && <ChangedByNote record={absence} />}
        </form>
      </ResourceFormModal>

      <ImpactDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title={lockedPart ? "Remove the open days?" : "Delete this absence?"}
        description={
          absence &&
          (lockedPart
            ? removedOpenDaysText(absence, lockedPart)
            : deletedAbsenceText(absence))
        }
        confirmText={lockedPart ? "Remove" : "Delete"}
        confirmVariant="destructive"
        loading={isDeleting}
      />
    </>
  );
};

/** Why an absence opens to be read only, by default a locked month. */
export const ABSENCE_IN_LOCKED_MONTH =
  "It's in a locked month, so it can no longer be changed.";
/** For an absence the viewer can't change because some of its days are another team's. */
export const absenceInAnotherTeam = (subjectName: string) =>
  `This absence includes days in another team. ${subjectName} or your company owner can change it.`;

type LockedAbsenceModalProps = {
  absence: Absence;
  subjectName?: string;
  reason?: string;
  onClose: () => void;
};

/** An absence the viewer can only read in full: nothing about it can change. */
export const LockedAbsenceModal = ({
  absence,
  subjectName,
  reason = ABSENCE_IN_LOCKED_MONTH,
  onClose,
}: LockedAbsenceModalProps) => (
  <ResourceFormModal
    open
    onClose={onClose}
    title="Absence"
    description={[subjectName, formatAbsenceRange(absence)]
      .filter(Boolean)
      .join(" · ")}
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

    <ChangedByNote record={absence} className="mt-6" />

    <p className="mt-6 flex gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      {reason}
    </p>
  </ResourceFormModal>
);

type PersonAbsenceModalProps = {
  /** Whose absence it is; an owner or a manager records or opens it. */
  user: Pick<User, "id" | "firstName" | "lastName">;
  /** The day a new absence starts on. */
  date: string;
  absence?: Absence;
  isLocked: (date: string) => boolean;
  onClose: () => void;
};

/**
 * A person's absence as an owner or a manager meets it in a team grid: the
 * form, or the absence to read when a locked month or another team's days
 * keep it from changing.
 */
export const PersonAbsenceModal = ({
  user,
  date,
  absence,
  isLocked,
  onClose,
}: PersonAbsenceModalProps) => {
  const actions = useAbsencesMutations();
  const subjectName = fullName(user);
  // Read only once both its ends are locked, as on the timesheet. Otherwise
  // the API says whether the viewer may change it: some of its days may be
  // another team's, which is the person's and the owner's to change.
  const readOnlyReason =
    absence && isAbsenceFrozen(isLocked, absence.startDate, absence.endDate)
      ? ABSENCE_IN_LOCKED_MONTH
      : absence?.canChange === false
        ? absenceInAnotherTeam(subjectName)
        : undefined;

  if (absence && readOnlyReason) {
    return (
      <LockedAbsenceModal
        absence={absence}
        reason={readOnlyReason}
        subjectName={subjectName}
        onClose={onClose}
      />
    );
  }

  return (
    <AbsenceFormModal
      open
      onClose={onClose}
      userId={user.id}
      subjectName={subjectName}
      date={date}
      absence={absence}
      isLocked={isLocked}
      onCreate={(payload) =>
        actions.create.mutateAsync({ ...payload, userId: user.id })
      }
      onUpdate={(id, data) => actions.update.mutateAsync({ id, data })}
      onDelete={(id) => actions.delete.mutateAsync(id)}
      isSaving={actions.create.isPending || actions.update.isPending}
      isDeleting={actions.delete.isPending}
    />
  );
};

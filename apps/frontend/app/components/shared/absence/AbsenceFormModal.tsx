"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarPlus, Info, Lock, Trash2, X } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import { Absence, AbsencePayload, UpdateAbsencePayload } from "@/types";
import { AbsenceType } from "@/types/enums";
import {
  ABSENCE_TYPE_LABELS,
  MAX_ABSENCE_DAYS,
  projectHoursText,
} from "@/lib/utils/absence";
import {
  formatDuration,
  formatLongDayLabel,
  fromISODate,
  isISODateRange,
  formatDateRangeLabel,
  shiftISODate,
  firstOfMonth,
  toISODate,
} from "@/lib/utils/date";
import { absenceLockedPart } from "@/lib/utils/reporting-period";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { Button } from "@/components/ui/button";
import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import { ImpactDialog } from "../ImpactDialog";
import { SegmentedControl } from "../SegmentedControl";
import { TimePicker } from "../TimePicker";
import { FormSelect } from "../FormSelect";
import { DatePicker } from "../inputs";
import { ResourceFormModal } from "../resource/ResourceFormModal";
import { PartLoadError } from "../PartLoadError";
import {
  UNAVAILABLE_DAYS_HINT,
  changeableDays,
  firstFreeWorkingDay,
  firstUnavailableAfter,
  firstUnavailableIn,
  latestLastDayFrom,
  unavailableDayError,
  unavailableDaysWindow,
} from "./absence-form-rules";
import {
  DAY_CHECK_ERROR,
  LOCKED_RECORD_NOTE,
  PLANS_CHECK_ERROR,
  deletedAbsenceText,
  filledDayText,
  lockedDaysText,
  plannedAgainstLeftText,
  removedOpenDaysText,
} from "./absence-form-texts";
import { ChangedByNote } from "../ChangedByNote";
import { useAbsenceDayPart } from "./useAbsenceDayPart";
import { useUnavailableDays } from "./useUnavailableDays";

const FORM_ID = "absence-form";

const absenceSchema = z
  .object({
    type: z.nativeEnum(AbsenceType, { message: "Pick a reason" }),
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    length: z.enum(["whole", "rest", "hours"]),
    partHours: z.number(),
    partMinutes: z.number(),
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

type Props = {
  open: boolean;
  onClose: () => void;
  /** Whose absence it is, to name the plans it will delete. */
  userId: string;
  /** Named under the title when the form is for someone else. */
  subjectName?: string;
  /** The day a new absence starts on, and ends on until more are chosen. */
  date: string;
  /**
   * Opened from a day: that day is fixed and named, and part of it can be
   * taken. An absence of one day opens the same way; otherwise the form takes
   * whole days over a range.
   */
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
      endDate: absence?.endDate ?? date,
      length: absence?.minutes != null ? "hours" : "whole",
      partHours: Math.floor((absence?.minutes ?? 0) / 60),
      partMinutes: (absence?.minutes ?? 0) % 60,
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
    resolver: zodResolver(absenceSchema),
    defaultValues,
  });

  // A new range moves once, as it opens, off a day it can't take; never once
  // a day was picked in the form.
  const hasLookedForFreeDay = useRef(false);

  useEffect(() => {
    reset(defaultValues);
    hasLookedForFreeDay.current = false;
  }, [defaultValues, reset]);

  const [startDate, endDate, chosenLength, partHours, partMinutes] = useWatch({
    control,
    name: ["startDate", "endDate", "length", "partHours", "partMinutes"],
  });
  const [triedSaving, setTriedSaving] = useState(false);
  // A new absence opened from a day is that day, unless more days are added.
  const opensOnDay = isSingleDay && !absence;
  const [addsDays, setAddsDays] = useState(false);
  const [shownMonth, setShownMonth] = useState(() =>
    toISODate(firstOfMonth(fromISODate(date))),
  );

  // Part of a day is offered on a form about one day: opened from a day, or
  // an absence of one day, while it still covers one day.
  const isAboutOneDay =
    isSingleDay || (!!absence && absence.startDate === absence.endDate);
  const offersPart =
    isAboutOneDay && !lockedPart && !addsDays && startDate === endDate;

  const {
    day,
    dayFailed,
    refetchDay,
    length,
    isPart,
    partTotal,
    partError,
    lengthOptions,
    isDayPending,
    filledDay,
  } = useAbsenceDayPart({
    userId,
    date: startDate,
    absence,
    offersPart: open && offersPart,
    chosenLength,
    setMinutes: partHours * 60 + partMinutes,
  });
  // "Enter the hours" waits for a save; a limit shows as the hours change.
  const shownPartError =
    partError && (triedSaving || partTotal > 0) ? partError : undefined;

  // Whole days are picked around the ones the server would refuse.
  const picksDays = !isPart && (!opensOnDay || addsDays);
  const daysWindow = unavailableDaysWindow(shownMonth, startDate, endDate);
  const { isUnavailable, isKnown: areDaysKnown } = useUnavailableDays({
    userId,
    absenceId: absence?.id,
    ...daysWindow,
    enabled: open && picksDays && isISODateRange(startDate, endDate),
  });
  // The last day can't reach past a day the absence can't take.
  const latestLastDay = latestLastDayFrom(
    startDate,
    picksDays ? isUnavailable : () => false,
  );
  // The pickers keep such a day out of reach, but days chosen while they
  // were still loading may hold one, which the server would refuse.
  const blockedDay =
    picksDays && areDaysKnown
      ? firstUnavailableIn(
          changeableDays(startDate, endDate, lockedPart),
          isUnavailable,
        )
      : undefined;
  const daysError = blockedDay ? unavailableDayError(blockedDay) : undefined;

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
    // Part of a day keeps the day's plans.
    if (isPart || isDayPending || !isRangeComplete || !arePlansKnown) {
      return null;
    }

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
  }, [
    isPart,
    isDayPending,
    isRangeComplete,
    arePlansKnown,
    plansInRange,
    isLocked,
  ]);

  // A first day past the last, or one with a day it can't take before the
  // last, takes the last day with it.
  const setFirstDay = (first: string) => {
    hasLookedForFreeDay.current = true;
    setValue("startDate", first, { shouldDirty: true, shouldValidate: true });
    const blocked = firstUnavailableAfter(first, endDate, isUnavailable);
    if (endDate < first || blocked) {
      setValue("endDate", first, { shouldDirty: true, shouldValidate: true });
    }
  };

  const setLastDay = (last: string) => {
    hasLookedForFreeDay.current = true;
    setValue("endDate", last, { shouldDirty: true, shouldValidate: true });
  };

  const backToOneDay = () => {
    setAddsDays(false);
    setLastDay(startDate);
  };

  // A new range opens on a day it can take: the day offered may already have
  // time logged, or be away. A day chosen in the form stays as chosen.
  useEffect(() => {
    if (absence || opensOnDay || !areDaysKnown) return;
    if (hasLookedForFreeDay.current) return;
    hasLookedForFreeDay.current = true;
    if (!isUnavailable(startDate)) return;

    const freeDay = firstFreeWorkingDay(
      startDate,
      daysWindow.to,
      isUnavailable,
    );
    if (freeDay) {
      setValue("startDate", freeDay);
      setValue("endDate", freeDay);
    }
  }, [
    absence,
    opensOnDay,
    areDaysKnown,
    isUnavailable,
    startDate,
    daysWindow.to,
    setValue,
  ]);

  // Named only when some day in reach is one the absence can't take.
  const hasUnavailableDays =
    picksDays && !!firstUnavailableIn([daysWindow], isUnavailable);
  const unavailableHint = hasUnavailableDays
    ? UNAVAILABLE_DAYS_HINT
    : undefined;

  const onSubmit = async (data: AbsenceFormData) => {
    setTriedSaving(true);
    if (filledDay || daysError || (isPart && (!day || partError))) return;

    const shared = {
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      minutes: isPart ? partTotal : null,
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

  // One day reads as its day, a range as its first and last, as chosen.
  const absenceDaysLabel =
    startDate === endDate
      ? formatLongDayLabel(fromISODate(startDate))
      : formatDateRangeLabel(startDate, endDate);

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
              disabled={
                isDeleting ||
                !arePlansKnown ||
                isDayPending ||
                !!filledDay ||
                !!daysError ||
                (isPart && !day)
              }
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
              <Field id="absence-open-days" group error={daysError}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {lockedPart.startOpen && (
                    <DatePicker
                      label="First day"
                      value={startDate}
                      maxDate={shiftISODate(lockedPart.from, -1)}
                      isDayDisabled={isUnavailable}
                      onMonthChange={setShownMonth}
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
                      isDayDisabled={isUnavailable}
                      onMonthChange={setShownMonth}
                      onChange={(day) =>
                        setValue("endDate", day, { shouldDirty: true })
                      }
                    />
                  )}
                </div>
              </Field>
              <p className="flex gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {lockedDaysText(lockedPart)} {LOCKED_RECORD_NOTE}
                </span>
              </p>
            </>
          )}

          {filledDay && (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{filledDayText(filledDay)}</span>
            </p>
          )}

          {offersPart && !filledDay && (
            <SegmentedControl
              label="How long"
              options={lengthOptions}
              value={length}
              onChange={(next) =>
                setValue("length", next, { shouldDirty: true })
              }
              className="*:flex-auto *:whitespace-nowrap"
            />
          )}

          {picksDays && !lockedPart && !opensOnDay && (
            <Field
              id="absence-days"
              group
              error={
                errors.startDate?.message ??
                errors.endDate?.message ??
                daysError
              }
              description={unavailableHint}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DatePicker
                  label="First day"
                  value={startDate}
                  isDayDisabled={isUnavailable}
                  onMonthChange={setShownMonth}
                  onChange={setFirstDay}
                />
                <DatePicker
                  label="Last day"
                  value={endDate}
                  minDate={startDate}
                  maxDate={latestLastDay}
                  isDayDisabled={isUnavailable}
                  onMonthChange={setShownMonth}
                  onChange={setLastDay}
                />
              </div>
            </Field>
          )}

          {opensOnDay && !isPart && !addsDays && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="-mt-3 px-0"
              onClick={() => setAddsDays(true)}
            >
              <CalendarPlus className="size-4" aria-hidden />
              Add more days
            </Button>
          )}

          {opensOnDay && addsDays && (
            <Field
              id="absence-until"
              group
              error={errors.endDate?.message ?? daysError}
              description={unavailableHint}
            >
              <div className="flex items-end gap-2">
                <DatePicker
                  label="Until"
                  value={endDate}
                  minDate={startDate}
                  maxDate={latestLastDay}
                  isDayDisabled={isUnavailable}
                  onMonthChange={setShownMonth}
                  onChange={setLastDay}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Back to one day"
                  onClick={backToOneDay}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </Field>
          )}

          {length === "hours" && !filledDay && (
            <Field
              id="absence-hours"
              group
              error={shownPartError}
              description={
                day &&
                `${formatDuration(day.workingMinutes)} working day · ${formatDuration(day.loggedMinutes)} logged`
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">
                  Hours away
                </span>
                <TimePicker
                  hours={partHours}
                  minutes={partMinutes}
                  onHoursChange={(value) =>
                    setValue("partHours", value, { shouldDirty: true })
                  }
                  onMinutesChange={(value) =>
                    setValue("partMinutes", value, { shouldDirty: true })
                  }
                  formId={FORM_ID}
                  error={!!shownPartError}
                  aria-label="Hours away"
                />
              </div>
            </Field>
          )}

          {length === "rest" && !filledDay && shownPartError && (
            <p className="text-xs text-destructive-text">{shownPartError}</p>
          )}

          {isPart && dayFailed && (
            <PartLoadError onRetry={() => refetchDay()}>
              {DAY_CHECK_ERROR}
            </PartLoadError>
          )}

          {isPart &&
            !filledDay &&
            day &&
            partTotal > 0 &&
            day.plannedMinutes > 0 && (
              <p className="flex gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {plannedAgainstLeftText(
                    day.plannedMinutes,
                    Math.max(0, day.workingMinutes - partTotal),
                  )}
                </span>
              </p>
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
                {startDate === endDate ? "this day" : "these days"}:{" "}
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

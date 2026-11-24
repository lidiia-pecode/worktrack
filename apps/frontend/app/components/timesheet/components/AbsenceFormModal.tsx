"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarPlus, Info, Lock, Trash2, X } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

import {
  Absence,
  AbsenceDay,
  AbsencePayload,
  UpdateAbsencePayload,
  User,
} from "@/types";
import { AbsenceType } from "@/types/enums";
import {
  ABSENCE_TYPE_LABELS,
  MAX_ABSENCE_DAYS,
  formatAbsenceRange,
  isPartDayAbsence,
  projectHoursText,
} from "@/lib/utils/absence";
import {
  formatDayRangeLabel,
  formatDuration,
  formatLongDayLabel,
  fromISODate,
  isISODateRange,
  formatDateRangeLabel,
  shiftISODate,
  firstOfMonth,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import {
  AbsenceLockedPart,
  absenceLockedPart,
  isAbsenceFrozen,
} from "@/lib/utils/reporting-period";
import { fullName } from "@/lib/utils/user";
import {
  useAbsenceDay,
  useAbsencesMutations,
  useAllAbsencesQuery,
} from "@/hooks/useAbsences";
import { useAllTimeLogsQuery } from "@/hooks/useTimelogs";
import { useLockedDates } from "@/hooks/useReportingPeriods";
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
import { SegmentedControl } from "../../shared/SegmentedControl";
import { TimePicker } from "../../shared/TimePicker";
import { FormSelect } from "../../shared/FormSelect";
import { DatePicker } from "../../shared/inputs";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { PartLoadError } from "../../shared/PartLoadError";
import { ChangedByNote } from "./ChangedByNote";

const PLANS_CHECK_ERROR =
  "Plans on these days couldn't load, so the absence can't be saved yet.";

const DAY_CHECK_ERROR =
  "This day's hours couldn't load, so part of it can't be saved yet.";

const FORM_ID = "absence-form";

/** What a part of a day leaves for the plans already on it, which stay. */
const plannedAgainstLeftText = (planned: number, leftAfter: number) =>
  planned > leftAfter
    ? `${formatDuration(planned)} planned on this day, ${formatDuration(leftAfter)} left after the absence. The plans stay, and Planning shows the week as over.`
    : `${formatDuration(planned)} planned on this day, ${formatDuration(leftAfter)} left after the absence.`;

const absenceSchema = z
  .object({
    type: z.nativeEnum(AbsenceType, { message: "Pick a reason" }),
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    /** How much of one day: all of it, what logging left, or hours set. */
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

type Length = AbsenceFormData["length"];

/** A day's working, logged and part-away minutes, as the server checks them. */
const partDayError = ({
  minutes,
  workingMinutes,
  loggedMinutes,
  isMeasuredAgainstLogged,
}: {
  minutes: number;
  workingMinutes: number;
  loggedMinutes: number;
  isMeasuredAgainstLogged: boolean;
}) => {
  const left = Math.max(0, workingMinutes - loggedMinutes);
  if (workingMinutes === 0) return "This day has no working hours.";
  if (minutes === 0) return "Enter the hours away";
  if (minutes >= workingMinutes) {
    return `Part of a day is shorter than the ${formatDuration(workingMinutes)} working day. Choose Whole day instead.`;
  }
  if (isMeasuredAgainstLogged && minutes > left) {
    return `Only ${formatDuration(left)} of this day is left: ${formatDuration(loggedMinutes)} is already logged.`;
  }
  return undefined;
};

const UNAVAILABLE_DAYS_HINT =
  "Days with time logged, another absence or in a locked month can't be chosen.";

/**
 * The days a whole-day absence can't take, as the server refuses them: time
 * logged, another of the person's absences, a locked month. Read for the
 * days the pickers show and the chosen ones.
 */
const useUnavailableDays = ({
  userId,
  absenceId,
  from,
  to,
  enabled,
}: {
  userId: string;
  /** The absence being edited, whose own days stay free. */
  absenceId?: string;
  from: string;
  to: string;
  enabled: boolean;
}) => {
  // The months these days are in, which can be outside the page's own.
  const locks = useLockedDates(from, to);
  const range = { userId, dateFrom: from, dateTo: to };
  const logs = useAllTimeLogsQuery(range, { enabled });
  const others = useAllAbsencesQuery(range, { enabled });
  const { isLocked } = locks;
  const timelogs = logs.items;
  const absences = others.items;
  // Read for these very days: not loading, failed, or kept from other days.
  const isKnown =
    !locks.isLoading &&
    !locks.isError &&
    [logs, others].every(
      (list) => !list.isLoading && !list.isError && !list.isPlaceholderData,
    );

  const takenDays = useMemo(() => {
    const days = new Set(timelogs.map((log) => log.date));
    absences
      .filter((other) => other.id !== absenceId)
      .forEach((other) => {
        for (
          let day = other.startDate;
          day <= other.endDate;
          day = shiftISODate(day, 1)
        ) {
          days.add(day);
        }
      });
    return days;
  }, [timelogs, absences, absenceId]);

  const isUnavailable = useCallback(
    (date: string) => isLocked(date) || takenDays.has(date),
    [isLocked, takenDays],
  );

  return { isUnavailable, isKnown: enabled && isKnown };
};

/** The first working day from `from` to `until` an absence can take. */
const firstFreeWorkingDay = (
  from: string,
  until: string,
  isUnavailable: (date: string) => boolean,
) => {
  for (let day = from; day <= until; day = shiftISODate(day, 1)) {
    if (!isWeekend(fromISODate(day)) && !isUnavailable(day)) return day;
  }
  return undefined;
};

/** The first unavailable day after `from`, up to `until`, if there is one. */
const firstUnavailableAfter = (
  from: string,
  until: string,
  isUnavailable: (date: string) => boolean,
) => {
  for (
    let day = shiftISODate(from, 1);
    day <= until;
    day = shiftISODate(day, 1)
  ) {
    if (isUnavailable(day)) return day;
  }
  return undefined;
};

/** Why a day that logged time fills takes no new absence. */
const filledDayText = ({ workingMinutes, loggedMinutes }: AbsenceDay) =>
  workingMinutes === 0
    ? `${formatDuration(loggedMinutes)} is logged on this day, which has no working hours, so it can't be taken off.`
    : `${formatDuration(loggedMinutes)} is logged on this day, so none of it is left to take off. Remove some of that time first.`;

const deletedAbsenceText = (absence: Absence) => {
  if (isPartDayAbsence(absence)) {
    return `${ABSENCE_TYPE_LABELS[absence.type]} on ${formatAbsenceRange(absence)} will be deleted, and that day's hours are expected again. This can't be undone.`;
  }
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
      length: absence?.minutes != null ? "hours" : "whole",
      partHours: Math.floor((absence?.minutes ?? 0) / 60),
      partMinutes: (absence?.minutes ?? 0) % 60,
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

  // A new range moves once, as it opens, off a day it can't take.
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
    data: day,
    isError: dayFailed,
    refetch: refetchDay,
  } = useAbsenceDay(
    { date: startDate, userId },
    open && offersPart && !!startDate,
  );
  const leftOfDay = day
    ? Math.max(0, day.workingMinutes - day.loggedMinutes)
    : 0;
  // "Rest of the day" is what logging left, so it is offered once time is
  // logged and something of the day is left.
  const offersRest =
    !!day &&
    day.loggedMinutes > 0 &&
    leftOfDay > 0 &&
    leftOfDay < day.workingMinutes;
  // A day with time logged can't be away whole, as the server refuses it.
  const canBeWhole = !day || day.loggedMinutes === 0;
  const partLength: Length = offersRest ? "rest" : "hours";
  const length: Length = !offersPart
    ? "whole"
    : (chosenLength === "whole" && !canBeWhole) ||
        (chosenLength === "rest" && !offersRest)
      ? partLength
      : chosenLength;
  const isPart = length !== "whole";
  // Until the day is read, the form doesn't know whether it can be away whole.
  const isDayPending = offersPart && !day && !dayFailed;
  // A new absence on a day that time already fills has nothing to take.
  const filledDay =
    offersPart && !absence && !!day && day.loggedMinutes > 0 && leftOfDay === 0
      ? day
      : null;
  const partTotal =
    length === "rest" ? leftOfDay : partHours * 60 + partMinutes;
  const lengthOptions: { value: Length; label: string }[] = [
    ...(canBeWhole ? [{ value: "whole" as const, label: "Whole day" }] : []),
    ...(offersRest
      ? [
          {
            value: "rest" as const,
            label: `Rest of the day · ${formatDuration(leftOfDay)}`,
          },
        ]
      : []),
    { value: "hours", label: "Set hours" },
  ];
  const partError =
    isPart && day
      ? partDayError({
          minutes: partTotal,
          workingMinutes: day.workingMinutes,
          loggedMinutes: day.loggedMinutes,
          // As on the server: only a new day or more hours are measured again.
          isMeasuredAgainstLogged:
            !absence ||
            startDate !== absence.startDate ||
            absence.minutes === null ||
            partTotal > absence.minutes,
        })
      : undefined;
  // "Enter the hours" waits for a save; a limit shows as the hours change.
  const shownPartError =
    partError && (triedSaving || partTotal > 0) ? partError : undefined;

  // Whole days are picked around the ones the server would refuse.
  const picksDays = !lockedPart && !isPart && (!opensOnDay || addsDays);
  // The month on show with the grid's days around it, and the chosen days.
  const daysFrom = [shiftISODate(shownMonth, -7), startDate].sort()[0];
  const daysTo = [
    shiftISODate(toISODate(firstOfMonth(fromISODate(shownMonth), 1)), 14),
    toISODate(firstOfMonth(fromISODate(endDate), 1)),
  ].sort()[1];
  const { isUnavailable, isKnown: areDaysKnown } = useUnavailableDays({
    userId,
    absenceId: absence?.id,
    from: daysFrom,
    to: daysTo,
    enabled: open && picksDays && isISODateRange(startDate, endDate),
  });
  const lastDayLimit = shiftISODate(startDate, MAX_ABSENCE_DAYS - 1);
  // The last day can't reach past a day the absence can't take.
  const firstBlocked = picksDays
    ? firstUnavailableAfter(startDate, lastDayLimit, isUnavailable)
    : undefined;
  const latestLastDay = firstBlocked
    ? shiftISODate(firstBlocked, -1)
    : lastDayLimit;

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
    setValue("startDate", first, { shouldDirty: true, shouldValidate: true });
    const blocked = firstUnavailableAfter(first, endDate, isUnavailable);
    if (endDate < first || blocked) {
      setValue("endDate", first, { shouldDirty: true, shouldValidate: true });
    }
  };

  const setLastDay = (last: string) =>
    setValue("endDate", last, { shouldDirty: true, shouldValidate: true });

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

    const freeDay = firstFreeWorkingDay(startDate, daysTo, isUnavailable);
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
    daysTo,
    setValue,
  ]);

  // Named only when some day in reach is one the absence can't take.
  const hasUnavailableDays =
    picksDays &&
    !!firstUnavailableAfter(shiftISODate(daysFrom, -1), daysTo, isUnavailable);
  const unavailableHint = hasUnavailableDays
    ? UNAVAILABLE_DAYS_HINT
    : undefined;

  const onSubmit = async (data: AbsenceFormData) => {
    setTriedSaving(true);
    if (filledDay || (isPart && (!day || partError))) return;

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

          {picksDays && !opensOnDay && (
            <Field
              id="absence-days"
              group
              error={errors.startDate?.message ?? errors.endDate?.message}
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
              error={errors.endDate?.message}
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
  /** Opened from a day: that day only, whole or in part. */
  isSingleDay?: boolean;
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
  isSingleDay,
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
      isSingleDay={isSingleDay}
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

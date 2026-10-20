"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Absence, PlanningEntry, PlanningWeekRow } from "@/types";
import {
  usePeriodPreview,
  usePlanPeriod,
  usePlanningEntries,
} from "@/hooks/usePlanning";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { getErrorMessages, isClientError } from "@/lib/api";
import {
  addDays,
  addMonthsToKey,
  companyToday,
  formatDayMonthLabel,
  formatDuration,
  formatMonthLabel,
  getMonthRange,
  isISODate,
  isWeekend,
  lastDayOfReportRange,
  toISODate,
  toMonthKey,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { getProjectColor } from "@/lib/utils/project-colors";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { FormAlert } from "../../shared/FormAlert";
import { FormSelect } from "../../shared/FormSelect";
import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { DateRangePicker } from "../../shared/inputs";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";

const FORM_ID = "plan-period-form";
const PERIOD_FIELD_ID = "plan-period-days";
const MINUTE_STEP = 15;

const projectSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
  })
  .refine((data) => data.hours * 60 + data.minutes > 0, {
    message: "Enter hours greater than 0",
    path: ["hours"],
  })
  .refine((data) => data.minutes % MINUTE_STEP === 0, {
    message: "Plan in 15-minute steps",
    path: ["hours"],
  });

const periodSchema = z
  .object({
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    projects: z.array(projectSchema).min(1, "Add at least one project"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "The last day can't be before the first",
    path: ["endDate"],
  })
  .refine((data) => data.endDate <= lastDayOfReportRange(data.startDate), {
    message: "A period can cover at most 366 days",
    path: ["endDate"],
  });

type PeriodFormData = z.infer<typeof periodSchema>;

const EMPTY_PROJECT = { projectId: "", hours: 0, minutes: 0 };

const minutesOf = ({ hours, minutes }: { hours: number; minutes: number }) =>
  Number(hours) * 60 + Number(minutes);

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);

const isWholeRange = (startDate: string, endDate: string) =>
  isISODate(startDate) && isISODate(endDate) && endDate >= startDate;

const countWeekdays = (startDate: string, endDate: string): number => {
  let count = 0;
  for (
    let day = toDate(startDate);
    toISODate(day) <= endDate;
    day = addDays(day, 1)
  ) {
    if (!isWeekend(day)) count++;
  }
  return count;
};

const isWholeMonth = (startDate: string, endDate: string) => {
  const { dateFrom, dateTo } = getMonthRange(toMonthKey(startDate));
  return startDate === dateFrom && endDate === dateTo;
};

type PeriodPickerProps = {
  startDate: string;
  endDate: string;
  invalid: boolean;
  onChange: (startDate: string, endDate: string) => void;
};

/**
 * A month at a time with the arrows; the label opens the shared range picker
 * for any other period.
 */
const PeriodPicker = ({
  startDate,
  endDate,
  invalid,
  onChange,
}: PeriodPickerProps) => {
  const monthKey = toMonthKey(startDate);

  const pickMonth = (key: string) => {
    const { dateFrom, dateTo } = getMonthRange(key);
    onChange(dateFrom, dateTo);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Previous month"
        onClick={() => pickMonth(addMonthsToKey(monthKey, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        label={
          isWholeMonth(startDate, endDate)
            ? formatMonthLabel(monthKey)
            : undefined
        }
        invalid={invalid}
        onChange={onChange}
        className="flex-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-brand"
          onClick={() => pickMonth(monthKey)}
        >
          Whole {formatMonthLabel(monthKey)}
        </Button>
      </DateRangePicker>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Next month"
        onClick={() => pickMonth(addMonthsToKey(monthKey, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
};

/** The weekdays of the period an absence covers. */
const awayWeekdays = (
  absence: Absence,
  startDate: string,
  endDate: string,
): number =>
  countWeekdays(
    absence.startDate > startDate ? absence.startDate : startDate,
    absence.endDate < endDate ? absence.endDate : endDate,
  );

/** "WorkTrack: 7 days, 35h" for each project already planned in the period. */
const summarisePlans = (plans: PlanningEntry[]): string[] => {
  const byProject = new Map<string, { days: Set<string>; minutes: number }>();

  plans.forEach((plan) => {
    const summary = byProject.get(plan.project.name) ?? {
      days: new Set<string>(),
      minutes: 0,
    };
    summary.days.add(plan.date);
    summary.minutes += plan.plannedMinutes;
    byProject.set(plan.project.name, summary);
  });

  return [...byProject].map(
    ([name, { days, minutes }]) =>
      `${name}: ${days.size} ${days.size === 1 ? "day" : "days"}, ${formatDuration(minutes)}`,
  );
};

type PlanPeriodModalProps = {
  /** The person's row, with the projects they can be planned on. */
  row: PlanningWeekRow;
  dayLimitMinutes: number;
  onClose: () => void;
};

export const PlanPeriodModal = ({
  row,
  dayLimitMinutes,
  onClose,
}: PlanPeriodModalProps) => {
  const { timezone } = useWorkSettings();
  const planPeriod = usePlanPeriod();
  const [problems, setProblems] = useState<string[] | null>(null);
  const problemsRef = useRef<HTMLDivElement>(null);

  const thisMonth = getMonthRange(
    toMonthKey(toISODate(companyToday(timezone))),
  );

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PeriodFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(periodSchema) as any,
    defaultValues: {
      startDate: thisMonth.dateFrom,
      endDate: thisMonth.dateTo,
      projects: [EMPTY_PROJECT],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  const [startDate, endDate, chosen] = useWatch({
    control,
    name: ["startDate", "endDate", "projects"],
  });

  const personProjects = row.projects;
  const projectName = (projectId: string) =>
    personProjects.find((project) => project.id === projectId)?.name;
  const chosenIds = chosen.map((project) => project.projectId);
  const dailyMinutes = chosen.reduce(
    (total, project) => total + minutesOf(project),
    0,
  );
  const periodError = errors.startDate?.message ?? errors.endDate?.message;
  const hasPeriod = isWholeRange(startDate, endDate);

  // What the server would do with the rows filled in so far.
  const previewPayload = hasPeriod
    ? {
        userId: row.user.id,
        startDate,
        endDate,
        projects: chosen
          .filter((project) => project.projectId && minutesOf(project) > 0)
          .map((project) => ({
            projectId: project.projectId,
            minutesPerDay: minutesOf(project),
          })),
      }
    : null;
  const {
    preview,
    isOutdated,
    error: previewError,
  } = usePeriodPreview(previewPayload);
  const { items: absences } = useAllAbsencesQuery(
    { userId: row.user.id, dateFrom: startDate, dateTo: endDate },
    { enabled: hasPeriod },
  );
  const { items: existingPlans } = usePlanningEntries(
    { userId: row.user.id, dateFrom: startDate, dateTo: endDate },
    { enabled: hasPeriod },
  );

  const plannedDays = preview?.plannedDays ?? [];
  const conflicts = preview?.problems ?? [];
  const previewRefusal =
    previewError && isClientError(previewError)
      ? getErrorMessages(previewError)
      : [];
  const awayDays = hasPeriod
    ? absences.reduce(
        (total, absence) => total + awayWeekdays(absence, startDate, endDate),
        0,
      )
    : 0;
  const weekdays = hasPeriod ? countWeekdays(startDate, endDate) : 0;
  const cannotSave =
    personProjects.length === 0 ||
    dailyMinutes > dayLimitMinutes ||
    conflicts.length > 0 ||
    previewRefusal.length > 0 ||
    (!!preview && plannedDays.length === 0);

  const setPeriod = (first: string, last: string) => {
    setValue("startDate", first, { shouldDirty: true, shouldValidate: true });
    setValue("endDate", last, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data: PeriodFormData) => {
    setProblems(null);

    try {
      const result = await planPeriod.mutateAsync({
        userId: row.user.id,
        startDate: data.startDate,
        endDate: data.endDate,
        projects: data.projects.map((project) => ({
          projectId: project.projectId,
          minutesPerDay: minutesOf(project),
        })),
      });

      toast.success(
        `${fullName(row.user)} planned for ${result.days} ${result.days === 1 ? "day" : "days"}, ${formatDayMonthLabel(data.startDate)}–${formatDayMonthLabel(data.endDate)}`,
      );
      onClose();
    } catch (error) {
      // Anything but a refusal has already been toasted by the hook.
      if (!isClientError(error)) return;

      setProblems(getErrorMessages(error));
    }
  };

  // A refusal is listed at the top of the form, which may be scrolled away.
  useEffect(() => {
    if (problems) problemsRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [problems]);

  return (
    <ResourceFormModal
      open
      onClose={onClose}
      hasUnsavedChanges={isDirty}
      size="lg"
      title={`Plan a period for ${fullName(row.user)}`}
      description="The same hours on every working day. Single days can still be changed in the grid."
      icon={<CalendarRange className="size-5" />}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={planPeriod.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            isLoading={planPeriod.isPending}
            disabled={cannotSave}
          >
            Save plan
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {problems && (
          <div ref={problemsRef}>
            <FormAlert className="space-y-2">
              <p className="font-medium">Nothing was saved.</p>
              <ul className="list-disc space-y-1 pl-4">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </FormAlert>
          </div>
        )}

        <Field id={PERIOD_FIELD_ID} label="Period" group error={periodError}>
          <PeriodPicker
            startDate={startDate}
            endDate={endDate}
            invalid={!!periodError}
            onChange={setPeriod}
          />
        </Field>

        {personProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {row.user.firstName} is not on any active project. Add them to a
            project before planning.
          </p>
        ) : (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium text-foreground">
              Hours per working day
            </legend>

            {fields.map((field, index) => {
              const chosenId = chosen[index]?.projectId ?? "";
              const options = personProjects
                .filter(
                  (project) =>
                    project.id === chosenId || !chosenIds.includes(project.id),
                )
                .map((project) => ({ value: project.id, label: project.name }));
              const rowErrors = errors.projects?.[index];

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-2"
                >
                  <ProjectColorDot
                    projectId={chosenId}
                    className={cn("mt-4", !chosenId && "invisible")}
                  />

                  <Controller
                    control={control}
                    name={`projects.${index}.projectId`}
                    render={({ field: select }) => (
                      <FormSelect
                        aria-label={`Project ${index + 1}`}
                        value={select.value}
                        onValueChange={select.onChange}
                        options={options}
                        placeholder="Select project"
                        error={rowErrors?.projectId?.message}
                      />
                    )}
                  />

                  <Field
                    id={`period-hours-${field.id}`}
                    error={rowErrors?.hours?.message}
                  >
                    <TimePicker
                      aria-label={`Hours a day for project ${index + 1}`}
                      hours={Number(chosen[index]?.hours ?? 0)}
                      minutes={Number(chosen[index]?.minutes ?? 0)}
                      minuteStep={MINUTE_STEP}
                      onHoursChange={(value) =>
                        setValue(`projects.${index}.hours`, value, {
                          shouldDirty: true,
                        })
                      }
                      onMinutesChange={(value) =>
                        setValue(`projects.${index}.minutes`, value, {
                          shouldDirty: true,
                        })
                      }
                      error={!!rowErrors?.hours}
                    />
                  </Field>

                  {/* The only row can be changed, not removed. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Remove ${projectName(chosenId) ?? `project ${index + 1}`}`}
                    title="Remove from this plan"
                    onClick={() => remove(index)}
                    className={cn("mt-1.5", fields.length === 1 && "invisible")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}

            {fields.length < personProjects.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append(EMPTY_PROJECT)}
                className="text-brand"
              >
                <Plus className="size-4" />
                Add another project
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {row.user.firstName} is on no other active project.
              </p>
            )}
          </fieldset>
        )}

        {personProjects.length > 0 && (
          <div
            className={cn(
              "space-y-3 rounded-xl bg-brand-subtle p-4 text-sm transition-opacity",
              isOutdated && "opacity-60",
            )}
            aria-busy={isOutdated}
          >
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-foreground tabular-nums">
                  {formatDuration(dailyMinutes)} a day
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDuration(dayLimitMinutes)} working day
                </span>
              </div>

              <div
                className="flex h-2 overflow-hidden rounded-full bg-brand-muted"
                aria-hidden
              >
                {chosen.map((project, index) => (
                  <div
                    key={fields[index]?.id ?? index}
                    style={{
                      width: `${Math.min(100, (minutesOf(project) / dayLimitMinutes) * 100)}%`,
                      backgroundColor: project.projectId
                        ? getProjectColor(project.projectId)
                        : "var(--muted-foreground)",
                    }}
                  />
                ))}
              </div>
            </div>

            {dailyMinutes > dayLimitMinutes && (
              <p className="text-destructive-text">
                That is more than a working day. Lower the hours to save.
              </p>
            )}

            {!preview && previewRefusal.length === 0 && (
              <p className="text-muted-foreground">Checking the period…</p>
            )}

            {preview && plannedDays.length > 0 && (
              <p className="text-foreground">
                <span className="font-medium">
                  {plannedDays.length} working{" "}
                  {plannedDays.length === 1 ? "day" : "days"}
                </span>{" "}
                to plan, {formatDayMonthLabel(plannedDays[0])} –{" "}
                {formatDayMonthLabel(plannedDays[plannedDays.length - 1])}
                {isOutdated && (
                  <span className="text-muted-foreground"> (updating…)</span>
                )}
              </p>
            )}

            {preview && plannedDays.length === 0 && (
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  No working days to plan in this period.
                </p>
                <p className="text-muted-foreground">
                  {awayDays >= weekdays && weekdays > 0
                    ? `${row.user.firstName} is away on every weekday. Choose another period, or change the absence from its day in the grid.`
                    : weekdays === 0
                      ? "It holds only weekends. Choose another period."
                      : `${row.user.firstName}'s account did not exist yet. Choose a later period.`}
                </p>
              </div>
            )}

            {hasPeriod && absences.length > 0 && (
              <p className="text-muted-foreground">
                Away {awayDays} {awayDays === 1 ? "day" : "days"}, skipped:{" "}
                {[...absences]
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map(
                    (absence) =>
                      `${ABSENCE_TYPE_LABELS[absence.type]} ${formatAbsenceRange(absence)}`,
                  )
                  .join(", ")}
              </p>
            )}

            {hasPeriod && existingPlans.length > 0 && (
              <p className="text-muted-foreground">
                Already planned: {summarisePlans(existingPlans).join(" · ")}.
                Listed projects get the new hours; other projects stay.
              </p>
            )}

            {(conflicts.length > 0 || previewRefusal.length > 0) && (
              <div className="space-y-1 text-destructive-text" role="alert">
                <p className="font-medium">
                  {previewRefusal.length > 0
                    ? "This period can't be planned."
                    : `Doesn't fit on ${conflicts.length} ${conflicts.length === 1 ? "day or week" : "days or weeks"}:`}
                </p>
                <ul className="list-disc space-y-0.5 pl-4">
                  {[...previewRefusal, ...conflicts].map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                {conflicts.length > 0 && (
                  <p>
                    Lower the hours or change the period. Nothing is saved until
                    everything fits.
                  </p>
                )}
              </div>
            )}

            {preview && plannedDays.length > 0 && conflicts.length === 0 && (
              <p className="text-muted-foreground">
                Weekends and absence days are skipped. Nothing else changes.
              </p>
            )}
          </div>
        )}
      </form>
    </ResourceFormModal>
  );
};

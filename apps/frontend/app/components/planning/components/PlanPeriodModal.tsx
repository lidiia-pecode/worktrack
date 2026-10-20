"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PlanningWeekRow } from "@/types";
import {
  usePeriodPreview,
  usePlanPeriod,
  usePlanningEntries,
} from "@/hooks/usePlanning";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { getErrorMessages, isClientError } from "@/lib/api";
import {
  companyToday,
  formatDayMonthLabel,
  getMonthRange,
  isISODateRange,
  lastDayOfReportRange,
  toISODate,
  toMonthKey,
} from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { FormAlert } from "../../shared/FormAlert";
import { FormSelect } from "../../shared/FormSelect";
import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { PeriodPicker } from "./PeriodPicker";
import { PeriodPreview } from "./PeriodPreview";

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
  const rows = chosen.map((project) => ({
    projectId: project.projectId,
    minutes: minutesOf(project),
  }));
  const dailyMinutes = rows.reduce(
    (total, project) => total + project.minutes,
    0,
  );
  const periodError = errors.startDate?.message ?? errors.endDate?.message;
  const hasPeriod = isISODateRange(startDate, endDate);

  // What the server would do with the rows filled in so far.
  const previewPayload = hasPeriod
    ? {
        userId: row.user.id,
        startDate,
        endDate,
        projects: rows
          .filter((project) => project.projectId && project.minutes > 0)
          .map((project) => ({
            projectId: project.projectId,
            minutesPerDay: project.minutes,
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

  const previewRefusal =
    previewError && isClientError(previewError)
      ? getErrorMessages(previewError)
      : [];
  const previewFailed = !!previewError && !isClientError(previewError);
  // Nothing saves until the server has said the plan fits.
  const cannotSave =
    personProjects.length === 0 ||
    dailyMinutes > dayLimitMinutes ||
    !preview ||
    preview.plannedDays.length === 0 ||
    preview.problems.length > 0 ||
    previewRefusal.length > 0 ||
    previewFailed;

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
                    variant="ghostDestructive"
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

        {personProjects.length > 0 && hasPeriod && (
          <PeriodPreview
            firstName={row.user.firstName}
            startDate={startDate}
            endDate={endDate}
            dayLimitMinutes={dayLimitMinutes}
            rows={rows}
            preview={preview}
            isOutdated={isOutdated}
            refusal={previewRefusal}
            failed={previewFailed}
            absences={absences}
            existingPlans={existingPlans}
          />
        )}
      </form>
    </ResourceFormModal>
  );
};

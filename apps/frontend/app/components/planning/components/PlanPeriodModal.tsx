"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarRange, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { PlanningWeekRow } from "@/types";
import {
  useDeletePeriodPlans,
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
  formatDayMonthYearLabel,
  getMonthRange,
  isISODateRange,
  lastDayOfReportRange,
  toISODate,
  toMonthKey,
} from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { DiscardChangesModal } from "../../shared/DiscardChangesModal";
import { FormAlert } from "../../shared/FormAlert";
import { FormSelect } from "../../shared/FormSelect";
import { ImpactDialog } from "../../shared/ImpactDialog";
import { ProjectColorDot } from "../../shared/ProjectColorDot";
import { TimePicker } from "../../shared/TimePicker";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { PeriodListedRow } from "./PeriodListedRow";
import { PeriodPicker } from "./PeriodPicker";
import { PeriodPreview } from "./PeriodPreview";
import {
  ListedLine,
  addedText,
  busiestDay,
  listedChangeText,
  listedLines,
} from "./period-lines";

const FORM_ID = "plan-period-form";
const PERIOD_FIELD_ID = "plan-period-days";
const MINUTE_STEP = 15;

const minutesOf = ({ hours, minutes }: { hours: number; minutes: number }) =>
  Number(hours) * 60 + Number(minutes);

// A line left blank is ignored; one with a project needs hours, and hours a project.
const addedLineSchema = z
  .object({
    projectId: z.string(),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
  })
  .refine((data) => data.minutes % MINUTE_STEP === 0, {
    message: "Plan in 15-minute steps",
    path: ["hours"],
  })
  .refine((data) => !data.projectId || minutesOf(data) > 0, {
    message: "Enter hours greater than 0",
    path: ["hours"],
  })
  .refine((data) => data.projectId || minutesOf(data) === 0, {
    message: "Select a project",
    path: ["projectId"],
  });

const periodSchema = z
  .object({
    startDate: z.string().min(1, "Pick a first day"),
    endDate: z.string().min(1, "Pick a last day"),
    added: z.array(addedLineSchema),
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

const EMPTY_LINE = { projectId: "", hours: 0, minutes: 0 };

type PlanPeriodModalProps = {
  /** The person's row, with the projects they can be planned on. */
  row: PlanningWeekRow;
  dayLimitMinutes: number;
  onClose: () => void;
};

/**
 * Plans and changes a person's period in one save: the projects already
 * planned in it change only on their own days, and a project added fills
 * every working day. A planned project is deleted from its row at once.
 */
export const PlanPeriodModal = ({
  row,
  dayLimitMinutes,
  onClose,
}: PlanPeriodModalProps) => {
  const { timezone } = useWorkSettings();
  const planPeriod = usePlanPeriod();
  const deletePeriodPlans = useDeletePeriodPlans();
  const [problems, setProblems] = useState<string[] | null>(null);
  const problemsRef = useRef<HTMLDivElement>(null);
  // Unsaved hours for the projects already planned, by project.
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [pendingPeriod, setPendingPeriod] = useState<{
    first: string;
    last: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<ListedLine | null>(null);

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
      added: [EMPTY_LINE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "added" });

  const [startDate, endDate, added] = useWatch({
    control,
    name: ["startDate", "endDate", "added"],
  });

  const personProjects = row.projects;
  const projectName = (projectId: string) =>
    personProjects.find((project) => project.id === projectId)?.name;
  const periodError = errors.startDate?.message ?? errors.endDate?.message;
  const hasPeriod = isISODateRange(startDate, endDate);

  const { items: loadedPlans, isPlaceholderData: arePlansFromBefore } =
    usePlanningEntries(
      { userId: row.user.id, dateFrom: startDate, dateTo: endDate },
      { enabled: hasPeriod },
    );
  // Until the new period's plans arrive, the old ones would be shown as its
  // rows, and their delete would apply to the new dates.
  const existingPlans = arePlansFromBefore ? [] : loadedPlans;
  const lines = hasPeriod ? listedLines(existingPlans) : [];
  const listedIds = lines.map((line) => line.projectId);
  // An edit outlives its row only until the row is deleted.
  const editedMinutes = new Map(
    Object.entries(edits).filter(([projectId]) =>
      listedIds.includes(projectId),
    ),
  );
  const takenIds = [...listedIds, ...added.map((line) => line.projectId)];
  const freeProjectCount = personProjects.filter(
    (project) => !takenIds.includes(project.id),
  ).length;
  // Each blank line holds a place for one of the projects still free.
  const canAddLine =
    freeProjectCount > added.filter((line) => !line.projectId).length;
  const addedLines = added
    .map((line) => ({ projectId: line.projectId, minutes: minutesOf(line) }))
    .filter((line) => line.projectId && line.minutes > 0);

  const payloadProjects = [
    ...[...editedMinutes].map(([projectId, minutes]) => ({
      projectId,
      minutesPerDay: minutes,
      existingDaysOnly: true,
    })),
    ...addedLines.map((line) => ({
      projectId: line.projectId,
      minutesPerDay: line.minutes,
    })),
  ];

  // What the server would do with the changes so far.
  const {
    preview,
    isOutdated,
    error: previewError,
  } = usePeriodPreview(
    hasPeriod
      ? { userId: row.user.id, startDate, endDate, projects: payloadProjects }
      : null,
  );
  const { items: absences } = useAllAbsencesQuery(
    { userId: row.user.id, dateFrom: startDate, dateTo: endDate },
    { enabled: hasPeriod },
  );

  const workingDays = preview?.plannedDays ?? [];
  const changeOf = (projectId: string) =>
    preview?.changes.find((change) => change.projectId === projectId);
  const changes = [
    ...lines.flatMap((line) => {
      const minutes = editedMinutes.get(line.projectId);
      return minutes === undefined
        ? []
        : [
            listedChangeText(
              line,
              minutes,
              changeOf(line.projectId)?.changed ?? line.days.length,
            ),
          ];
    }),
    ...addedLines.map((line) =>
      addedText(
        projectName(line.projectId) ?? "",
        line.minutes,
        changeOf(line.projectId)?.added ?? workingDays.length,
      ),
    ),
  ];

  const previewRefusal =
    previewError && isClientError(previewError)
      ? getErrorMessages(previewError)
      : [];
  const previewFailed = !!previewError && !isClientError(previewError);
  // Nothing saves until there is a change and the server has said it fits.
  const cannotSave =
    payloadProjects.length === 0 ||
    !preview ||
    preview.plannedDays.length === 0 ||
    preview.problems.length > 0 ||
    previewRefusal.length > 0 ||
    previewFailed;

  // The picker reports hours and minutes one after the other, so each update
  // applies to the latest edit.
  const editLine =
    (projectId: string) =>
    (update: (minutes: number | undefined) => number | undefined) =>
      setEdits((current) => {
        const { [projectId]: previous, ...others } = current;
        const next = update(previous);
        return next === undefined ? others : { ...others, [projectId]: next };
      });

  const applyPeriod = (first: string, last: string) => {
    setEdits({});
    setValue("startDate", first, { shouldDirty: true, shouldValidate: true });
    setValue("endDate", last, { shouldDirty: true, shouldValidate: true });
  };

  // The rows belong to the period, so their changed hours would be lost.
  const setPeriod = (first: string, last: string) => {
    if (editedMinutes.size > 0) setPendingPeriod({ first, last });
    else applyPeriod(first, last);
  };

  const confirmDelete = () => {
    if (!deleting) return;

    deletePeriodPlans.mutate(
      {
        userId: row.user.id,
        projectId: deleting.projectId,
        startDate,
        endDate,
      },
      {
        onSuccess: () => {
          editLine(deleting.projectId)(() => undefined);
          setDeleting(null);
        },
      },
    );
  };

  const onSubmit = async (data: PeriodFormData) => {
    setProblems(null);

    try {
      await planPeriod.mutateAsync({
        userId: row.user.id,
        startDate: data.startDate,
        endDate: data.endDate,
        projects: payloadProjects,
      });

      toast.success(
        `Plan saved for ${fullName(row.user)}, ${formatDayMonthLabel(data.startDate)}–${formatDayMonthLabel(data.endDate)}`,
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
    <>
      <ResourceFormModal
        open
        onClose={onClose}
        hasUnsavedChanges={isDirty || editedMinutes.size > 0}
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

          {lines.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Planned in this period
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {lines.map((line) => (
                  <PeriodListedRow
                    key={line.projectId}
                    line={line}
                    workingDays={workingDays}
                    editedMinutes={editedMinutes.get(line.projectId)}
                    minuteStep={MINUTE_STEP}
                    formId={FORM_ID}
                    onEdit={editLine(line.projectId)}
                    onDelete={() => setDeleting(line)}
                  />
                ))}
              </ul>
            </section>
          )}

          {personProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {row.user.firstName} is not on any active project. Add them to a
              project before planning.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">
                Add to every working day
              </legend>

              {fields.map((field, index) => {
                const chosenId = added[index]?.projectId ?? "";
                // A blank line with nothing left to choose would only be in the way.
                if (!chosenId && freeProjectCount === 0) return null;
                const options = personProjects
                  .filter(
                    (project) =>
                      project.id === chosenId || !takenIds.includes(project.id),
                  )
                  .map((project) => ({
                    value: project.id,
                    label: project.name,
                  }));
                const lineErrors = errors.added?.[index];

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2"
                  >
                    <Controller
                      control={control}
                      name={`added.${index}.projectId`}
                      render={({ field: select }) => (
                        <FormSelect
                          aria-label={`Project ${index + 1}`}
                          value={select.value}
                          onValueChange={select.onChange}
                          options={options}
                          placeholder="Select project"
                          leading={<ProjectColorDot projectId={select.value} />}
                          error={lineErrors?.projectId?.message}
                        />
                      )}
                    />

                    <Field
                      id={`period-hours-${field.id}`}
                      error={lineErrors?.hours?.message}
                    >
                      <TimePicker
                        aria-label={`Hours a day for project ${index + 1}`}
                        hours={Number(added[index]?.hours ?? 0)}
                        minutes={Number(added[index]?.minutes ?? 0)}
                        minuteStep={MINUTE_STEP}
                        formId={FORM_ID}
                        onHoursChange={(value) =>
                          setValue(`added.${index}.hours`, value, {
                            shouldDirty: true,
                          })
                        }
                        onMinutesChange={(value) =>
                          setValue(`added.${index}.minutes`, value, {
                            shouldDirty: true,
                          })
                        }
                        error={!!lineErrors?.hours}
                      />
                    </Field>

                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Drop the ${projectName(chosenId) ?? `project ${index + 1}`} line`}
                      title="Drop this line"
                      onClick={() => remove(index)}
                      className="mt-1.5 text-muted-foreground"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}

              {canAddLine ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => append(EMPTY_LINE)}
                  className="text-brand"
                >
                  <Plus className="size-4" />
                  Add a project
                </Button>
              ) : (
                freeProjectCount === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {row.user.firstName} is on no other active project.
                  </p>
                )
              )}
            </fieldset>
          )}

          {hasPeriod && (
            <PeriodPreview
              firstName={row.user.firstName}
              startDate={startDate}
              endDate={endDate}
              dayLimitMinutes={dayLimitMinutes}
              busiestDay={busiestDay({
                plannedDays: workingDays,
                plans: existingPlans,
                editedMinutes,
                added: addedLines,
              })}
              changes={changes}
              preview={preview}
              isOutdated={isOutdated}
              refusal={previewRefusal}
              failed={previewFailed}
              absences={absences}
            />
          )}
        </form>
      </ResourceFormModal>

      <DiscardChangesModal
        isOpen={pendingPeriod !== null}
        onDiscard={() => {
          if (pendingPeriod)
            applyPeriod(pendingPeriod.first, pendingPeriod.last);
          setPendingPeriod(null);
        }}
        onKeepEditing={() => setPendingPeriod(null)}
      />

      <ImpactDialog
        isOpen={deleting !== null}
        title={deleting ? `Delete the ${deleting.name} plan?` : ""}
        description={`The plan for ${formatDayMonthLabel(startDate)} – ${formatDayMonthYearLabel(endDate)} will be deleted. This can't be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
        loading={deletePeriodPlans.isPending}
      />
    </>
  );
};

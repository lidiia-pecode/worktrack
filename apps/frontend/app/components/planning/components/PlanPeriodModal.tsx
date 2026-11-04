"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";

import { PlanningWeekRow } from "@/types";
import {
  useDeletePeriodPlans,
  usePeriodPreview,
  usePlanPeriod,
  usePlanningEntries,
} from "@/hooks/usePlanning";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { getErrorMessages, isClientError } from "@/lib/api";
import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  formatDuration,
  isISODateRange,
  lastDayOfReportRange,
  toISODate,
} from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { DiscardChangesModal } from "../../shared/DiscardChangesModal";
import { FormAlert } from "../../shared/FormAlert";
import { ImpactDialog } from "../../shared/ImpactDialog";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { isOnPlanStep, toPlanStep } from "../plan-minutes";
import { PlannedRow } from "./PlannedRow";
import { PlanLines } from "./PlanLines";
import { PeriodPicker } from "./PeriodPicker";
import { PeriodPreview } from "./PeriodPreview";
import {
  ListedLine,
  addedText,
  busiestDay,
  describeDays,
  listedChangeText,
  listedLines,
  setHoursDetail,
} from "./period-lines";
import { EMPTY_LINE, addedLineMinutes, addedLineSchema } from "./plan-lines";

const FORM_ID = "plan-period-form";
const PERIOD_FIELD_ID = "plan-period-days";

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

type PlanPeriodModalProps = {
  /** The person's row, with the projects they can be planned on. */
  row: PlanningWeekRow;
  /** The working days of the week shown on Planning, where the dialog opens. */
  weekDates: Date[];
  /** Opens the absence form on the chosen days, to change before saving. */
  onAddAbsence: (startDate: string, endDate: string) => void;
  onClose: () => void;
};

/**
 * Plans and changes a person's period in one save: the projects already
 * planned in it change only on their own days, and a project added fills
 * every working day. A planned project is deleted from its row at once.
 */
export const PlanPeriodModal = ({
  row,
  weekDates,
  onAddAbsence,
  onClose,
}: PlanPeriodModalProps) => {
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

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PeriodFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(periodSchema) as any,
    defaultValues: {
      startDate: toISODate(weekDates[0]),
      endDate: toISODate(weekDates[weekDates.length - 1]),
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
  const setLine = (index: number, patch: Partial<(typeof added)[number]>) =>
    Object.entries(patch).forEach(([key, value]) =>
      setValue(`added.${index}.${key as keyof typeof patch}`, value, {
        shouldDirty: true,
      }),
    );
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
  // With every project listed above and no line begun, there is nothing to show.
  const hasLinesToAdd =
    freeProjectCount > 0 || added.some((line) => line.projectId);
  // A line keeps its project when the dates change, though the new period may
  // already list it above; such a line says so and isn't saved.
  const isListedAbove = (projectId: string) => listedIds.includes(projectId);
  const addedLines = added
    .map((line) => ({
      projectId: line.projectId,
      minutes: addedLineMinutes(line),
    }))
    .filter(
      (line) =>
        line.projectId && line.minutes > 0 && !isListedAbove(line.projectId),
    );

  const payloadProjects = [
    // A row at 0h is not sent: it shows its own message and blocks Save.
    ...[...editedMinutes]
      .filter(([, minutes]) => minutes > 0)
      .map(([projectId, minutes]) => ({
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
  // No project can take more than the person's longest day in the period;
  // until the server says, the longest in the week the dialog opened from.
  const dayLimitMinutes =
    preview?.dayLimitMinutes ??
    Math.max(0, ...row.dayLimits.map((day) => day.minutes));
  const maxPlanMinutes = toPlanStep(dayLimitMinutes);
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
      return minutes === undefined || minutes === 0
        ? []
        : [
            listedChangeText(
              line,
              minutes,
              changeOf(line.projectId)?.changed ?? line.days.length,
              workingDays,
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
    [...editedMinutes.values()].some(
      (minutes) => minutes === 0 || !isOnPlanStep(minutes),
    ) ||
    added.some((line) => isListedAbove(line.projectId)) ||
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
        isBusy={planPeriod.isPending || deletePeriodPlans.isPending}
        size="lg"
        title="Plan a period"
        description={fullName(row.user)}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddAbsence(startDate, endDate)}
              className="mr-auto"
              disabled={!hasPeriod || planPeriod.isPending}
            >
              <CalendarOff className="size-4" />
              Add absence
            </Button>

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

          <Field id={PERIOD_FIELD_ID} group error={periodError}>
            <PeriodPicker
              startDate={startDate}
              endDate={endDate}
              weekDates={weekDates}
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
                  <PlannedRow
                    key={line.projectId}
                    line={line}
                    hoursLabel="Hours a day"
                    detail={
                      line.sameMinutes === null &&
                      editedMinutes.has(line.projectId) ? (
                        <>
                          {setHoursDetail(line, workingDays)} ·{" "}
                          <button
                            type="button"
                            onClick={() =>
                              editLine(line.projectId)(() => undefined)
                            }
                            className="font-medium text-brand underline underline-offset-2"
                          >
                            Keep as is
                          </button>
                        </>
                      ) : (
                        describeDays(line, workingDays)
                      )
                    }
                    editedMinutes={editedMinutes.get(line.projectId)}
                    isOnProject={personProjects.some(
                      (project) => project.id === line.projectId,
                    )}
                    maxMinutes={maxPlanMinutes}
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
            hasLinesToAdd && (
              <PlanLines
                lines={added}
                keys={fields.map((field) => field.id)}
                errors={
                  errors.added as Parameters<typeof PlanLines>[0]["errors"]
                }
                hoursLabel="Hours a day"
                projects={personProjects}
                takenIds={takenIds}
                isListedAbove={isListedAbove}
                maxMinutes={() => maxPlanMinutes}
                hint={`Up to ${formatDuration(maxPlanMinutes)} a day`}
                formId={FORM_ID}
                canAddLine={canAddLine}
                onChange={setLine}
                onRemove={remove}
                onAppend={() => append(EMPTY_LINE)}
              />
            )
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

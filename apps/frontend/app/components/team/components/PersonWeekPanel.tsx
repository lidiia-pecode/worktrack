"use client";

import { useId, useMemo, useState } from "react";
import { CalendarOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAbsencesMutations } from "@/hooks/useAbsences";
import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { useTimelogs } from "@/hooks/useTimelogs";
import { Absence, PlanningEntry, TeamSummaryRow, TimeLog } from "@/types";
import { newAbsenceStartDate } from "@/lib/utils/absence";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { isRangeLocked } from "@/lib/utils/reporting-period";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { groupTimelogsByDate } from "@/lib/utils/timelog";

import { Avatar } from "../../shared/Avatar";
import { CloseButton } from "../../shared/buttons/CloseButton";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { SidePanel } from "../../shared/SidePanel";
import { NonWorkDayConfirm } from "../../shared/week/NonWorkDayConfirm";
import { AbsenceFormModal } from "../../timesheet/components/AbsenceFormModal";
import { TimeLogFormModal } from "../../timesheet/components/TimeLogFormModal";
import { lastEntryChoiceKey } from "../../timesheet/helpers/last-entry-choice";
import { UserTimeDayGroup } from "./UserTimeDayGroup";

type FormState = {
  date: string;
  timelog?: TimeLog;
};

type AbsenceFormState = {
  date: string;
  absence?: Absence;
};

type PersonWeekPanelProps = {
  /** The grid row the panel explains: the person and their week's figures. */
  row: TeamSummaryRow;
  viewerId: string;
  weekDates: Date[];
  weekLabel: string;
  todayIso: string;
  canWrite: boolean;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  projectId?: string;
  absencesByDate: Record<string, Absence>;
  onClose: () => void;
};

export const PersonWeekPanel = ({
  row,
  viewerId,
  weekDates,
  weekLabel,
  todayIso,
  canWrite,
  isLocked,
  isEditable,
  projectId,
  absencesByDate,
  onClose,
}: PersonWeekPanelProps) => {
  const { user } = row;
  const expectedByDate = Object.fromEntries(
    row.expectedByDate.map((day) => [day.date, day.minutes]),
  );
  const titleId = useId();
  const [formState, setFormState] = useState<FormState | null>(null);
  const [absenceForm, setAbsenceForm] = useState<AbsenceFormState | null>(null);
  const [nonWorkDayDate, setNonWorkDayDate] = useState<Date | null>(null);

  const isDeactivated = isDeactivatedUser(user);
  const canEdit = canWrite && !isDeactivated;

  const dateFrom = toISODate(weekDates[0]);
  const dateTo = toISODate(weekDates[6]);
  const isCurrentWeek = dateFrom <= todayIso && todayIso <= dateTo;

  const {
    items: timelogs,
    actions,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    refetch: refetchLogs,
  } = useTimelogs({ userId: user.id, dateFrom, dateTo, projectId });

  const {
    items: pickerItems,
    isLoading: isLoadingPicker,
    isError: isPickerError,
    refetch: refetchPicker,
  } = useAssignableActivities(user.id, canEdit);

  // Context for an empty day, narrowed like the entries; a failed load leaves
  // the days without it.
  const { items: plannedEntries } = usePlanningEntries({
    userId: user.id,
    dateFrom,
    dateTo,
    projectId,
  });

  const absenceActions = useAbsencesMutations();

  const timelogsByDate = useMemo(
    () => groupTimelogsByDate(timelogs),
    [timelogs],
  );

  const plannedByDate = useMemo(() => {
    const byDate: Record<string, PlanningEntry[]> = {};

    plannedEntries.forEach((entry) => {
      (byDate[entry.date] ??= []).push(entry);
    });

    return byDate;
  }, [plannedEntries]);

  const totalMinutes = timelogs.reduce((sum, log) => sum + log.minutes, 0);

  const hasError = isLogsError || isPickerError;
  const isLoading = isLoadingLogs || isLoadingPicker;

  const retry = () => {
    void refetchLogs();
    void refetchPicker();
  };

  const openCreate = (date: Date) => {
    if (isWeekend(date)) {
      setNonWorkDayDate(date);
      return;
    }

    setFormState({ date: toISODate(date) });
  };

  const confirmNonWorkDay = () => {
    if (!nonWorkDayDate) return;

    setFormState({ date: toISODate(nonWorkDayDate) });
    setNonWorkDayDate(null);
  };

  const closeForm = () => setFormState(null);

  const openNewAbsence = () =>
    setAbsenceForm({
      date: newAbsenceStartDate({
        today: new Date(`${todayIso}T00:00:00`),
        weekStart: weekDates[0],
        isCurrentWeek,
        isEditable,
      }),
    });

  const openAbsence = (absence: Absence) =>
    setAbsenceForm({ date: absence.startDate, absence });

  return (
    <SidePanel titleId={titleId} focusKey={user.id} onClose={onClose}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
        <Avatar user={user} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="truncate text-sm font-semibold text-foreground"
            >
              {fullName(user)}
            </h2>

            {isDeactivated && (
              <Badge variant="neutral" size="sm">
                Deactivated
              </Badge>
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {user.position ? `${user.position} · ${weekLabel}` : weekLabel}
          </p>
        </div>

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openNewAbsence}
          >
            <CalendarOff className="size-4" />
            Add absence
          </Button>
        )}

        <CloseButton aria-label="Close panel" onClick={onClose} />
      </div>

      {!isLoading && !hasError && (
        <dl className="grid shrink-0 grid-cols-2 gap-3 border-b border-border bg-muted/10 px-4 py-3">
          <div>
            <dt className="text-2xs uppercase tracking-wider text-muted-foreground">
              {projectId ? "Logged on this project" : "Logged"}
            </dt>
            <dd className="text-base font-semibold tabular-nums text-foreground">
              {formatDuration(totalMinutes)}
            </dd>
          </div>

          {!projectId && (
            <div>
              <dt className="text-2xs uppercase tracking-wider text-muted-foreground">
                Expected
              </dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">
                {formatDuration(row.expectedMinutes)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <LoadingState
            className="min-h-60"
            title="Loading entries"
            description={`Fetching what ${user.firstName} logged this week.`}
          />
        )}

        {!isLoading && hasError && (
          <ErrorState
            className="min-h-60"
            title="We couldn't load these entries"
            description="This person's week is unavailable right now."
            onRetry={retry}
          />
        )}

        {!isLoading &&
          !hasError &&
          weekDates.map((date) => {
            const iso = toISODate(date);
            const absence = absencesByDate[iso];
            const canWriteDay = canEdit && isEditable(iso);
            // An absence is frozen whole once any of its days locks.
            const isAbsenceLocked =
              !!absence &&
              isRangeLocked(isLocked, absence.startDate, absence.endDate);

            return (
              <UserTimeDayGroup
                key={iso}
                date={date}
                isToday={iso === todayIso}
                isLocked={isLocked(iso)}
                timelogs={timelogsByDate[iso] ?? []}
                absence={absence}
                isAbsenceLocked={isAbsenceLocked}
                plannedEntries={plannedByDate[iso]}
                expectedMinutes={projectId ? undefined : expectedByDate[iso]}
                // Time is logged only for a day that has happened (Decision 13).
                onAdd={
                  canWriteDay && !absence && iso <= todayIso
                    ? () => openCreate(date)
                    : undefined
                }
                onEdit={
                  canWriteDay
                    ? (timelog) => setFormState({ date: timelog.date, timelog })
                    : undefined
                }
                onAbsenceClick={canWriteDay ? openAbsence : undefined}
              />
            );
          })}
      </div>

      {!isLoading && !hasError && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {projectId ? "Logged on this project" : "Logged this week"}
          </span>

          <span className="font-semibold tabular-nums text-foreground">
            {formatDuration(totalMinutes)}
          </span>
        </div>
      )}

      <NonWorkDayConfirm
        date={nonWorkDayDate}
        onClose={() => setNonWorkDayDate(null)}
        onConfirm={confirmNonWorkDay}
      />

      {absenceForm && (
        <AbsenceFormModal
          open
          onClose={() => setAbsenceForm(null)}
          userId={user.id}
          date={absenceForm.date}
          absence={absenceForm.absence}
          onCreate={(payload) =>
            absenceActions.create.mutateAsync({ ...payload, userId: user.id })
          }
          onUpdate={(id, data) =>
            absenceActions.update.mutateAsync({ id, data })
          }
          onDelete={(id) => absenceActions.delete.mutateAsync(id)}
          isSaving={
            absenceActions.create.isPending || absenceActions.update.isPending
          }
          isDeleting={absenceActions.delete.isPending}
        />
      )}

      {formState && (
        <TimeLogFormModal
          open
          onClose={closeForm}
          date={formState.date}
          subjectName={fullName(user)}
          rememberKey={lastEntryChoiceKey(viewerId, user.id)}
          timelog={formState.timelog}
          pickerItems={pickerItems}
          onCreate={(payload) =>
            actions.create.mutateAsync({ ...payload, userId: user.id })
          }
          onUpdate={(id, data) => actions.update.mutateAsync({ id, data })}
          onDelete={(id) => actions.delete.mutateAsync(id)}
          isSaving={actions.create.isPending || actions.update.isPending}
          isDeleting={actions.delete.isPending}
        />
      )}
    </SidePanel>
  );
};
